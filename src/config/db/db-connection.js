/** @format */
import mongoose from 'mongoose';
import retry from 'async-retry';
import config from '../env.js';
import Logger from '../../utils/logger.js';

mongoose.set('strictQuery', true);

/**
 * 🛡️ HIGH-RESILIENCE DATABASE CONNECTION (Industry Standard)
 * Implements Exponential Backoff Retry to handle Atlas Node Elections,
 * temporary network instability, and DNS resolution issues.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectWithRetry() {
  const uri = process.env.DATABASE_URL;

  if (!uri) {
    Logger.error('❌ DATABASE_URL is not defined in environment variables');
    throw new Error('DATABASE_URL is missing');
  }

  // 🧪 INDUSTRY STANDARD: Recursive Retry with Exponential Backoff
  // This handles temporary Atlas 'ReplicaSetNoPrimary' errors during node elections.
  return await retry(
    async (bail, attempt) => {
      const opts = {
        bufferCommands: true,
        maxPoolSize: 50,  
        minPoolSize: 5,   
        serverSelectionTimeoutMS: 60000, // 60s: Generous time for mobile hotspots/DNS to resolve
        heartbeatFrequencyMS: 10000,     // 10s: Keeps connection alive 
        socketTimeoutMS: 60000,          // Increased for high-latency mobile networks
        connectTimeoutMS: 45000,         // Increased to give mobile internet more time to handshake
        // family: 4, <-- REMOVED: This causes DNS failures on IPv6 mobile networks (Hotspots)
        retryWrites: true,
      };

      if (attempt > 1) {
        Logger.warn(`⚡ Connection attempt ${attempt}: Retrying...`);
      }

      try {
        const m = await mongoose.connect(uri, opts);
        Logger.info(`✅ MongoDB connection established: ${m.connection.host}`);
        return m;
      } catch (err) {
        // Log specifically for IP whitelist errors (helpful for the user)
        if (err.message.includes('IP address') || err.message.includes('whitelist')) {
          Logger.error('🚨 ATLAS SECURITY: Your current IP is NOT whitelisted on MongoDB Atlas.');
          // Don't bail, maybe the IP will change or user will fix it in real-time
        }

        Logger.error(`❌ Connection attempt ${attempt} failed: ${err.message}`);
        throw err; // Trigger retry
      }
    },
    {
      retries: 10,             // Max attempts
      minTimeout: 2000,        // Start with 2s wait
      maxTimeout: 15000,       // Max wait of 15s between attempts
      factor: 2,               // Exponential growth
      onRetry: (err, count) => {
        Logger.warn(`🔄 Round ${count}: Waiting for Database nodes to stabilize...`);
      }
    }
  );
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = connectWithRetry();
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (err) {
    cached.promise = null; // Reset promise to allow future retries
    throw err;
  }
}

// 📡 LIFECYCLE MONITORING
mongoose.connection.on('connected', () => Logger.info('🟢 Mongoose connected to DB Cluster'));
mongoose.connection.on('error', (err) => Logger.error(`🔴 Mongoose runtime error: ${err.message}`));
mongoose.connection.on('reconnected', () => Logger.info('♻️ Mongoose successfully reconnected'));

mongoose.connection.on('disconnected', () => {
  Logger.error('❌ MongoDB disconnected! Initiating background recovery...');
  // Background reconnection will be handled by Mongoose internal driver if settings are right,
  // but we call connectDB to ensure the promise/cached connection is refreshed if needed.
  connectDB().catch(err => {
    Logger.error(`❌ Background recovery failed: ${err.message}`);
  });
});

export default connectDB;
