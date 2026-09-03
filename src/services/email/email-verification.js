/** @format */

import Otp from '../../models/otp-model.js';
import { generateOtp } from '../../utils/generate-otp.js';
import sendEmail from './email-helper.js';
import config from '../../config/env.js';
import Logger from '../../utils/logger.js';

const EmailVerification = async (req, user) => {
  // Logger.info(user);
  if (!user?.email) {
    throw new Error('User email is missing. Cannot send OTP.');
  }
  const otp = generateOtp(4);
  const otpExpiration = new Date(Date.now() + config.otp.expiryMs);

  Logger.info(`🔑 [DEMO / BACKUP OTP] for ${user.email}: ${otp}`);
  console.log(`\n==============================================\n🔑 [DEMO / BACKUP OTP] for ${user.email}: ${otp}\n==============================================\n`);

  await Otp.create({
    userId: user._id,
    userModel:
      user.role === 'admin'
        ? 'Admin'
        : user.role === 'donor'
          ? 'Donor'
          : 'Patient',
    otpNumber: otp,
    otpExpirationTime: otpExpiration,
  });
  await sendEmail({
    to: user?.email,
    subject: 'OTP - Verify your account',
    html: `
      <h1>Email Verification</h1>
      <p>Hello, Dear ${user.fullName}</p>
      <p>Thank you for signing up. Please use the following OTP:</p>
      <h2>${otp}</h2>
      <p>It will expire in ${config.otp.expiryText}.</p>
    `,
  });

  return otp;
};

export default EmailVerification;
