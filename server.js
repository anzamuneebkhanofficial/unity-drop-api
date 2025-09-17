/** @format */
import dotenv from 'dotenv';
dotenv.config({ path: './.env', debug: false });

import app from './src/app.js';
import dbConnection from './src/config/db/dbconnection.js';

const PORT = process.env.PORT || 8000;

const startServer = async () => {
  try {
    // Connect to DB (once, reused automatically)
    await dbConnection();

    // Serverless-aware: if NODE_ENV is production, some platforms manage the server
    if (process.env.NODE_ENV === 'development') {
      app.listen(PORT, () => {
        console.log(`✅ Server running at http://localhost:${PORT}`);
      });
    } else {
      // On serverless platforms (like Vercel), we export app and let platform handle the server
      console.log('🚀 Production environment: serverless-ready, DB connected');
    }
  } catch (error) {
    console.error('❌ Server failed to start:', error);
  }
};

// Start the server
startServer();

export default app; // For serverless platforms (Vercel / Netlify)
