/** @format */

import Otp from '../../models/otp-model.js';
import { generateOtp } from '../../utils/generate-otp.js';
import sendEmail from './email-helper.js';

const EmailVerification = async (req, user) => {
  // Logger.info(user);
  if (!user?.email) {
    throw new Error('User email is missing. Cannot send OTP.');
  }

  const otp = generateOtp(4);
  const otpMinutes = Number(process.env.OTP_EXPIRY_MINUTES) || 2;
  const otpExpiration = new Date(Date.now() + otpMinutes * 60 * 1000); 
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
      <p>It will expire in ${otpMinutes} minutes.</p>
    `,
  });

  return otp;
};

export default EmailVerification;
