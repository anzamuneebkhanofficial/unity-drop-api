/** @format */
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

import app from './src/app.js';
import dbConnection from './src/config/db/dbconnection.js';

const PORT = process.env.PORT || 8000;

// Initialize DB (runs once per serverless instance)
dbConnection()
  .then(() => console.log('🚀 MongoDB connected'))
  .catch((err) => console.error('❌ DB connection error:', err));

// Only start a server locally
if (process.env.NODE_ENV === 'development') {
  app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
  });
}

// ✅ Export app for Vercel serverless
export default app;
