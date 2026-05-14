/** @format */

import rateLimit from 'express-rate-limit';
import config from '../config/env.js';

/*
 * 🛡️ THE LOGIN GUARD (authLimiter)
 * This acts like a bouncer at the door. It stops bad guys from guessing 
 * passwords by trying over and over again really fast. 
 * Rule: Normal users only get 10 tries every 15 minutes to log in.
 */
// 1. Strict Limiter for Auth Routes (Login/Register/Password Reset)
// Prevents Brute Force Attacks
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.isDevelopment ? 100 : 10, // Higher limit in dev (100 vs 10)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
});

/*
 * 🚦 THE APP TRAFFIC COP (globalLimiter)
 * This watches the whole app to make sure nobody is clicking buttons 
 * way too fast or using computer bots to slow everything down.
 * Rule: Normal users can make 300 clicks/requests every 15 minutes.
 */
// 2. Global API Limiter
// Prevents General Abuse/Scraping/Spam
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.isDevelopment ? 3000 : 1000, // Increased for heavy dashboard interactions (Prod: 1000)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many requests. Please try again later.',
  },
});

/*
 * 🏋️ THE HEAVY LIFTING GUARD (exportLimiter)
 * Downloading big files (like PDFs or Excel sheets) makes the server 
 * work really hard. This stops people from doing it too much and crashing the app.
 * Rule: Normal users can only download 10 big files per hour.
 */
// 3. Export/Heavy-Operation Limiter (PDF/Excel)
// Prevents Resource Exhaustion (CPU/RAM Spikes)
export const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: config.isDevelopment ? 100 : 10, // Higher limit in dev (100 vs 10)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Export limit exceeded. Please try again in an hour.',
  },
});

/*
 * 🤖 THE AI GUARD (suggestionLimiter)
 * Asking the AI to find matches takes extra time and computer power. 
 * This limits how often a user can ask the AI for help so the app stays fast.
 * Rule: Normal users can only ask the AI 20 times per hour.
 */
// 4. AI/Suggestion Limiter
export const suggestionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: config.isDevelopment ? 100 : 20, // Higher limit in dev (100 vs 20)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Suggestion limit reached. Please try again later.',
  },
});