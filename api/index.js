/** @format */

import app from '../src/app.js';

import serverless from 'serverless-http';
import dbConnection from '../src/config/db/dbconnection.js';

// Run "startup middleware" (DB connect) on cold start
await dbConnection();

const handler = serverless(app);

export default handler;
