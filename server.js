/** @format */
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

import app from './src/app.js';
import dbConnection from './src/config/db/dbconnection.js';

const PORT = process.env.PORT || 8000;

// ✅ Connect to DB (serverless-safe, caches connection)
try {
  await dbConnection();
  console.log('🚀 MongoDB connected');
} catch (err) {
  console.error('❌ DB connection error:', err);
  // Optional: stop the function if DB is not connected
  // process.exit(1);
}

// Only start a server locally (for development)
if (process.env.NODE_ENV === 'development') {
  app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
  });
}

// ✅ Export app for Vercel serverless
export default app;
