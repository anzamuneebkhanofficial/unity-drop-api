/** @format */

// /** @format */

// // /** @format */
// // import jwt from 'jsonwebtoken';

// // // 24 hours
// // const ONE_DAY_SECONDS = 24 * 60 * 60; // 86400
// // const ONE_DAY_MS = ONE_DAY_SECONDS * 1000; // 86400000

// // // Sign JWT with expiration in seconds
// // const signJwt = (payload, secret, expiresInSeconds) =>
// //   jwt.sign(payload, secret, { expiresIn: expiresInSeconds + 's' });

// // export const generateTokens = async (user) => {
// //   if (!user || !user._id) throw new Error('Invalid user for token generation');

// //   const payload = { userId: user._id.toString(), role: user.role };

// //   const accessToken = signJwt(
// //     payload,
// //     process.env.JWT_ACCESS_TOKEN_SECRET_KEY,
// //     ONE_DAY_SECONDS // 24 hours
// //   );

// //   const accessTokenExp = Math.floor(Date.now() / 1000) + ONE_DAY_SECONDS;

// //   return { accessToken, accessTokenExp };
// // };

// // export const setTokensCookies = (res, { accessToken } = {}) => {
// //   // 🔒 Common cookie settings
// //   const common = {
// //     httpOnly: true,
// //     secure: process.env.NODE_ENV === 'production', // must be true in production HTTPS
// //     sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax', // local testing
// //     path: '/', // ensure cookie is available on all routes
// //   };

// //   // ✅ Cookie for exactly 24 hours
// //   res.cookie('accessToken', accessToken, {
// //     ...common,
// //     maxAge: ONE_DAY_MS, // 24 hours in milliseconds
// //   });

// //   // Front-end helper cookie
// //   res.cookie('is_auth', true, {
// //     httpOnly: false,
// //     secure: process.env.NODE_ENV === 'production',
// //     sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
// //     path: '/',
// //     maxAge: ONE_DAY_MS,
// //   });
// // };
// /** @format */
// import jwt from 'jsonwebtoken';

// // 2 minutes
// const TWO_MINUTES_SECONDS = 2 * 60; // 120
// const TWO_MINUTES_MS = TWO_MINUTES_SECONDS * 1000; // 120000

// // Sign JWT with expiration in seconds
// const signJwt = (payload, secret, expiresInSeconds) =>
//   jwt.sign(payload, secret, { expiresIn: expiresInSeconds + 's' });

// export const generateTokens = async (user) => {
//   if (!user || !user._id) throw new Error('Invalid user for token generation');

//   const payload = { userId: user._id.toString(), role: user.role };

//   const accessToken = signJwt(
//     payload,
//     process.env.JWT_ACCESS_TOKEN_SECRET_KEY,
//     TWO_MINUTES_SECONDS // 2 minutes
//   );

//   const accessTokenExp = Math.floor(Date.now() / 1000) + TWO_MINUTES_SECONDS;

//   return { accessToken, accessTokenExp };
// };

// export const setTokensCookies = (res, { accessToken } = {}) => {
//   // 🔒 Common cookie settings
//   const common = {
//     httpOnly: true,
//     secure: process.env.NODE_ENV === 'production', // must be true in production HTTPS
//     sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
//     path: '/', // available on all routes
//   };

//   // ✅ Cookie for exactly 2 minutes
//   res.cookie('accessToken', accessToken, {
//     ...common,
//     maxAge: TWO_MINUTES_MS, // 2 minutes
//   });

//   // Front-end helper cookie
//   res.cookie('is_auth', true, {
//     httpOnly: false,
//     secure: process.env.NODE_ENV === 'production',
//     sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
//     path: '/',
//     maxAge: TWO_MINUTES_MS, // 2 minutes
//   });
// };

/** @format */
import jwt from 'jsonwebtoken';

// 24 hours
const ONE_DAY_SECONDS = 24 * 60 * 60; // 86400
const ONE_DAY_MS = ONE_DAY_SECONDS * 1000; // 86400000

// Sign JWT with expiration in seconds
const signJwt = (payload, secret, expiresInSeconds) =>
  jwt.sign(payload, secret, { expiresIn: expiresInSeconds + 's' });

export const generateTokens = async (user) => {
  if (!user || !user._id) throw new Error('Invalid user for token generation');

  const payload = { userId: user._id.toString(), role: user.role };

  const accessToken = signJwt(
    payload,
    process.env.JWT_ACCESS_TOKEN_SECRET_KEY,
    ONE_DAY_SECONDS // ✅ 24 hours
  );

  const accessTokenExp = Math.floor(Date.now() / 1000) + ONE_DAY_SECONDS;

  return { accessToken, accessTokenExp };
};

export const setTokensCookies = (res, { accessToken } = {}) => {
  // 🔒 Common cookie settings
  const common = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // must be true in production HTTPS
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
    path: '/', // available on all routes
  };

  // ✅ Cookie for exactly 24 hours
  res.cookie('accessToken', accessToken, {
    ...common,
    maxAge: ONE_DAY_MS, // 24 hours
  });

  // Front-end helper cookie
  res.cookie('is_auth', true, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
    path: '/',
    maxAge: ONE_DAY_MS, // 24 hours
  });
};
