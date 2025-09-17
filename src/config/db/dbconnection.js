/** @format */
import mongoose from 'mongoose';

let cached = global.mongoose; // For hot reload in development

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const dbConnection = async () => {
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL is not defined in your .env file');
    process.exit(1);
  }

  // Reuse existing connection if available
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      // Modern Mongoose defaults; no deprecated options
      bufferCommands: false, // disables mongoose buffering
    };

    cached.promise = mongoose
      .connect(DATABASE_URL, opts)
      .then((mongooseInstance) => {
        return mongooseInstance;
      });
  }

  try {
    cached.conn = await cached.promise;
    // console.log(`✅ MongoDB connected at ${cached.conn.connection.host}`);
    return cached.conn;
  } catch (err) {
    cached.promise = null;
    console.error('❌ MongoDB connection failed:', err);
    process.exit(1);
  }
};

export default dbConnection;
