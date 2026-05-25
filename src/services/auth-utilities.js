/** @format */
import { generateTokens, setTokensCookies, clearTokensCookies } from './token/token-service.js';
export const performLogoutCleanup = (res, userModel, customMessage) => {
  clearTokensCookies(res);
  return {
    success: true,
    message: customMessage || `${userModel} logged out successfully`
  };
};
export const performLogin = (user, userModel, res) => {
  const userObj = user.toObject ? user.toObject() : { ...user };
  delete userObj.password;
  // Generate new tokens
  const { accessToken, accessTokenExp } = generateTokens(user);
  // Set auth cookies 
  const role = user.role || userModel.toLowerCase();
  setTokensCookies(res, { accessToken, role });
  return {
    status: true,
    message: `${userModel} logged in successfully`,
    user: userObj,
    authCheck: {
      accessToken,
      accessTokenExp,
    },
  };
};
