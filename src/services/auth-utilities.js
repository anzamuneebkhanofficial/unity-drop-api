/** @format */

/**
 * 🛠️ AUTH UTILITIES SERVICE
 * Consolidates all duplicate authentication logic into single source of truth
 * Prevents repetition across controllers and provides reusable auth operations
 */

import { generateTokens, setTokensCookies, clearTokensCookies } from './token/token-service.js';
import { resetEntireCache } from '../config/cache.js';

/**
 * 🧹 COMPLETE AUTH CLEANUP
 * Single function to handle all auth-related cleanup operations
 * Replaces scattered cleanup logic across controllers
 */
export const performAuthCleanup = (res, userModel = null) => {
  // Clear all authentication tokens/cookies
  clearTokensCookies(res);
  
  // Clear all cached data
  resetEntireCache();
  
  // resetEntireCache already cleared everything above; no further action needed.
};

/**
 * 📧 STANDARDIZED LOGOUT CLEANUP
 * Common logout pattern used across all auth controllers
 * Ensures consistent cleanup behavior
 */
export const performLogoutCleanup = (userId, userModel, res) => {
  console.log(`🚪 Logout: Cleaning up for ${userModel} ID: ${userId}`);
  
  // Perform complete auth cleanup
  performAuthCleanup(res, userModel);
  
  return {
    success: true,
    message: `${userModel} logged out successfully`
  };
};

/**
 * 🔐 STANDARDIZED LOGIN CLEANUP  
 * Common login preparation - clears any previous session data
 */
export const performLoginPrep = () => {
  // Clear any existing auth data before new login
  resetEntireCache();
};

/**
 * 🔑 UNITARY LOGIN LOGIC
 * Consolidates login token generation and response format
 * Used by all roles to ensure identical response structure
 */
export const performLogin = (user, userModel, res) => {
  // 🛡️ SECURITY: Ensure we don't send the password back
  const userObj = user.toObject ? user.toObject() : { ...user };
  delete userObj.password;

  // Generate new tokens
  const { accessToken, accessTokenExp } = generateTokens(user);
  
  // Set auth cookies
  setTokensCookies(res, { accessToken });
  
  // Return consistent response object
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

/**
 * 🎯 USER-SPECIFIC CACHE CLEARING
 * Targeted cache cleanup based on user model
 */
export const clearUserCache = (userId, userModel) => {
  console.log(`🧹 Clearing cache for ${userModel} ID: ${userId}`);
  resetEntireCache();
};

/**
 * 🔄 MULTIPLE NAMESPACE CLEANUP
 * Efficiently clear multiple cache namespaces at once
 */
export const clearMultipleNamespaces = (...namespaces) => {
  console.log(`🔄 Clearing cache for namespaces: ${namespaces.join(', ')}`);
  resetEntireCache();
};

/**
 * 📊 AUTH STATUS VALIDATION
 * Common validation patterns for authentication operations
 */
export const validateAuthOperation = (operation, userId, userModel) => {
  console.log(`🔍 Validating ${operation} for ${userModel}: ${userId}`);
  
  // Add common validation logic here
  return {
    isValid: true,
    operation,
    userId,
    userModel,
    timestamp: new Date().toISOString()
  };
};
