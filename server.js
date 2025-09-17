/** @format */
import dotenv from 'dotenv';
dotenv.config({ path: './.env' }); // only for local dev

const PORT = process.env.PORT || 8000;

// ✅ Connect to MongoDB (serverless-safe)
import mongoose from 'mongoose';
import app from './src/app.js';

let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null, promise: null };

async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!process.env.DATABASE_URL) {
    throw new Error('❌ DATABASE_URL not set in environment variables!');
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.DATABASE_URL, {
      bufferCommands: false,
    });
  }

  try {
    cached.conn = await cached.promise;
    console.log('🚀 MongoDB connected');
    return cached.conn;
  } catch (err) {
    cached.promise = null;
    console.error('❌ MongoDB connection failed:', err);
    throw err;
  }
}

// ✅ Only try to connect in production or development
try {
  await connectDB();
} catch (err) {
  console.error(err);
}

// ✅ Only start server locally
if (process.env.NODE_ENV === 'development') {
  app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
  });
}

// ✅ Export app for Vercel serverless
export default app;
