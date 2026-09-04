/** @format */

import jwt from 'jsonwebtoken';
import PasswordVerifyModel from '../../models/password-verify-model.js';
import Logger from '../../utils/logger.js';
import sendEmail from './email-helper.js';
import config from '../../config/env.js';
const PasswordVerificationEmail = async (req, user) => {
  try {
    const userId = user._id;
    const userModel =
      user.role === 'admin'
        ? 'Admin'
        : user.role === 'donor'
          ? 'Donor'
          : 'Patient';
    const resetMs = config.otp.passwordResetExpiryMs;
    const PassExpiration = new Date(Date.now() + resetMs);
    const passwordResetToken = jwt.sign(
      { userId },
      process.env.PASSWORD_RESET_TOKEN_PRIVATE_KEY,
      { expiresIn: Math.floor(resetMs / 1000) }
    );
    await new PasswordVerifyModel({
      userId,
      userModel,
      PassToken: passwordResetToken,
      PassTokenExpiration: PassExpiration,
    }).save();
    // Reset link
    const frontendBaseUrl = process.env.FRONTEND_URL || process.env.FrontEnd_URL || 'https://unity-drop-web.vercel.app';
    const resetLink = `${frontendBaseUrl}/${user.role}/reset-password/${userId}/${passwordResetToken}`;
    const emailResult = await sendEmail({
      to: user.email,
      subject: 'Password Reset Link',
      html: `
        <h1>Password Reset</h1>
        <p>Hello, ${user.fullName},</p>
        <p>We received a request to reset your password. Click the link below to reset your password:</p>
        <p><a href="${resetLink}">Reset My Password</a></p>
        <p>If you did not request this, please ignore this message.</p>
        <p>Thank you!</p>
      `,
    });
    return {
      success: true,
      message: 'Password reset email sent successfully.',
      resetLink,
      emailInfo: emailResult,
    };
  } catch (error) {
    Logger.error('Error in PasswordVerificationEmail:', error.message);
    return {
      success: false,
      message: 'Failed to send password reset email.',
      error: error.message,
    };
  }
};

export default PasswordVerificationEmail;
