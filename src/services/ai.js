/** @format */
import dotenv from 'dotenv';
dotenv.config({ path: './.env', debug: false });
import { GoogleGenAI } from '@google/genai';
console.log(
  '🚀 ~ file: ai.js ~ line 3 ~ process.env.GEMINI_API_KEY',
  process.env.GEMINI_API_KEY
);
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY, // 🔑 Always keep server-side
});
export default ai;
