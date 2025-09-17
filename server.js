/** @format */
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

import app from './src/app.js';
import dbConnection from './src/config/db/dbconnection.js';

const PORT = process.env.PORT || 8000;

// ✅ Initialize DB and then start server
(async () => {
  try {
    await dbConnection();
    console.log('🚀 MongoDB connected');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server running at http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error('❌ DB connection error:', err);
    process.exit(1); // stop app if DB fails
  }
})();
