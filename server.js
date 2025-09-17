/** @format */
import dotenv from 'dotenv';
dotenv.config({ path: './.env', debug: false });

import app from './src/app.js';
import dbConnection from './src/config/db/dbconnection.js';

const PORT = process.env.PORT || 8000;

/**
 * Always connect to DB
 * - In dev → also start Express server
 * - In prod (Vercel/Netlify) → export app, platform handles server
 */
const init = async () => {
  try {
    await dbConnection();

    if (process.env.NODE_ENV === 'development') {
      app.listen(PORT, () => {
        console.log(`✅ Server running at http://localhost:${PORT}`);
      });
    } else {
      console.log('🚀 Production environment: DB connected, serverless-ready');
    }
  } catch (error) {
    console.error('❌ Server init failed:', error);
  }
};

// Always init (for both dev & prod)
init();

export default app; // For Vercel/Netlify
