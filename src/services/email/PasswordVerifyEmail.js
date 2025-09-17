/** @format */

import jwt from 'jsonwebtoken';
import PasswordVerifyModel from '../../models/PasswordVerify.model.js';
import sendEmail from './emailHelper.js';

const PasswordVerificationEmail = async (req, user) => {
  try {
    const userId = user._id;
    const userModel =
      user.role === 'admin'
        ? 'Admin'
        : user.role === 'donor'
        ? 'Donor'
        : 'Patient';

    // Expiration in 2 minutes
    const PassExpiration = new Date(Date.now() + 2 * 60 * 1000);

    // Generate a password reset token
    const passwordResetToken = jwt.sign(
      { userId },
      process.env.PASSWORD_RESET_TOKEN_PRIVATE_KEY,
      { expiresIn: '2m' }
    );

    // Save in DB
    await new PasswordVerifyModel({
      userId,
      userModel,
      PassToken: passwordResetToken,
      PassTokenExpiration: PassExpiration,
    }).save();

    // Reset link
    const resetLink = `${process.env.FrontEnd_URL}/${user.role}/reset-password/${userId}/${passwordResetToken}`;

    // Send email
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

    // ✅ Return success object
    return {
      success: true,
      message: 'Password reset email sent successfully.',
      resetLink,
      emailInfo: emailResult,
    };
  } catch (error) {
    console.error('❌ Error in PasswordVerificationEmail:', error.message);
    return {
      success: false,
      message: 'Failed to send password reset email.',
      error: error.message,
    };
  }
};

export default PasswordVerificationEmail;
