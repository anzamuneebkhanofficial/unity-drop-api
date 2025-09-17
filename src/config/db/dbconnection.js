/** @format */
import mongoose from 'mongoose';

let cached = global.mongoose; // Reuse connection across hot-reloads & serverless calls

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const dbConnection = async () => {
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL is not defined in your .env file');
    process.exit(1);
  }

  // Already connected
  if (cached.conn) {
    return cached.conn;
  }

  // First connection
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose
      .connect(DATABASE_URL, opts)
      .then((mongooseInstance) => mongooseInstance);
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (err) {
    cached.promise = null;
    console.error('❌ MongoDB connection failed:', err);
    process.exit(1);
  }
};

export default dbConnection;
