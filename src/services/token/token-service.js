/** @format */
import jwt from 'jsonwebtoken';

// Constants
const ONE_DAY_SECONDS = 24 * 60 * 60; // 86400
const ONE_DAY_MS = ONE_DAY_SECONDS * 1000; // 86400000

// Utility: sign JWT
const signJwt = (payload, secret, expiresInSec) =>
  jwt.sign(payload, secret, { expiresIn: `${expiresInSec}s` });

// Generate access token
export const generateTokens = (user) => {
  if (!user?._id) throw new Error('Invalid user for token generation');

  const payload = { userId: user._id.toString(), role: user.role };

  const accessToken = signJwt(
    payload,
    process.env.JWT_ACCESS_TOKEN_SECRET_KEY,
    ONE_DAY_SECONDS
  );

  return {
    accessToken,
    accessTokenExp: Math.floor(Date.now() / 1000) + ONE_DAY_SECONDS, // epoch (seconds)
  };
};

// Set cookies
import config from '../../config/env.js';

export const setTokensCookies = (res, { accessToken, role }) => {
  // Common cookie settings optimized for Production (Vercel + Render) vs Development
  const common = {
    httpOnly: true,
    secure: config.isProduction, // Must be true in prod (HTTPS) to allow cross-site cookies
    sameSite: config.isProduction ? 'None' : 'Lax', // 'None' is required for cross-site (Frontend on Vercel, Backend on Render)
    path: '/',
    maxAge: ONE_DAY_MS,
  };

  // Secure token cookie
  res.cookie('accessToken', accessToken, common);

  // Secure role cookie (required for frontend middleware)
  res.cookie('role', role, {
    ...common,
    httpOnly: false, // Frontend needs to read this for middleware/routing
  });

  // Frontend-friendly auth state cookie
  // Note: httpOnly is false here so the frontend can detect if the user is logged in
  res.cookie('is_auth', true, {
    ...common,
    httpOnly: false, 
  });
};

/**
 * Utility to clear all auth cookies during logout
 * IMPORTANT: Must use same sameSite and secure flags as setting them
 */
export const clearTokensCookies = (res) => {
  const common = {
    path: '/',
    secure: config.isProduction,
    sameSite: config.isProduction ? 'None' : 'Lax',
  };

  res.clearCookie('accessToken', common);
  res.clearCookie('is_auth', common);
  res.clearCookie('role', common);
};
