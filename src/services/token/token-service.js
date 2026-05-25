
import jwt from 'jsonwebtoken';
import config from '../../config/env.js';
const ONE_DAY_SECONDS = 24 * 60 * 60;
const ONE_DAY_MS = ONE_DAY_SECONDS * 1000;
const signJwt = (payload, secret, expiresInSec) =>
  jwt.sign(payload, secret, { expiresIn: `${expiresInSec}s` });
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
    accessTokenExp: Math.floor(Date.now() / 1000) + ONE_DAY_SECONDS,
  };
};
export const setTokensCookies = (res, { accessToken, role }) => {
  const common = {
    httpOnly: true,
    secure: config.isProduction, // Must be true in prod (HTTPS) to allow cross-site cookies
    sameSite: config.isProduction ? 'None' : 'Lax', // 'None' is required for cross-site (Frontend on Vercel, Backend on Render)
    path: '/',
    maxAge: ONE_DAY_MS,
  };
  res.cookie('accessToken', accessToken, common);
  res.cookie('role', role, {
    ...common,
    httpOnly: false,
  });
  res.cookie('is_auth', true, {
    ...common,
    httpOnly: false,
  });
};
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
