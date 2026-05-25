import mongoose from 'mongoose';
let cached = global.mongoose || (global.mongoose = { conn: null, promise: null });
async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined in environment variables');
  }
  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.DATABASE_URL, {
      bufferCommands: false,
    });
  }
  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (err) {
    cached.promise = null;
    throw err;
  }
}
export default connectDB;