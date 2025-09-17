/** @format */

import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

import app from './src/app.js';
import dbConnection from './src/config/db/dbconnection.js';

const PORT = process.env.PORT || 8000;

async function startServer() {
  await dbConnection();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

if (process.env.NODE_ENV === 'development') {
  startServer();
}
