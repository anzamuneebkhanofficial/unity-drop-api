/** @format */
import dotenv from 'dotenv';
dotenv.config({ path: './.env', debug: false });

import app from './src/app.js';
import dbConnection from './src/config/db/dbconnection.js';

const PORT = process.env.PORT || 8000;

/**
 * Start the server
 * - In development → starts Express normally
 * - In production (Vercel/Netlify) → only exports app
 */
const startServer = async () => {
  try {
    await dbConnection();

    if (process.env.NODE_ENV === 'development') {
      app.listen(PORT, () => {
        console.log(`✅ Server running at http://localhost:${PORT}`);
      });
    } else {
      console.log('🚀 Production environment: serverless-ready, DB connected');
    }
  } catch (error) {
    console.error('❌ Server failed to start:', error);
  }
};

// Only run server if NOT running in serverless
if (process.env.NODE_ENV === 'development') {
  startServer();
}

export default app; // For Vercel/Netlify serverless
