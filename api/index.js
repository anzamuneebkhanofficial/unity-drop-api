/** @format */
import app from '../src/app.js';
import serverless from 'serverless-http';
import dbConnection from '../src/config/db/dbconnection.js';

// Handler for Vercel
const handler = async (req, res) => {
  try {
    await dbConnection(); // ✅ safe (cached)
    return serverless(app)(req, res);
  } catch (err) {
    console.error('❌ Serverless function error:', err);
    res
      .status(500)
      .json({ message: 'Internal Server Error', error: err.message });
  }
};

export default handler;
