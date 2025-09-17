/** @format */

import Otp from '../../models/otp.model.js';
import { generateOtp } from '../../utils/generateOtp.js';
import sendEmail from './emailHelper.js';

const EmailVerification = async (req, user) => {
  // console.log(user);
  if (!user?.email) {
    throw new Error('User email is missing. Cannot send OTP.');
  }

  const otp = generateOtp(4);
  const otpExpiration = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes later
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
      <p>It will expire in 2 minutes.</p>
    `,
  });

  return otp;
};

export default EmailVerification;
