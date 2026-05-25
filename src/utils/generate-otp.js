/** @format */
import { v4 as uuidv4 } from 'uuid';
export const generateOtp = (length) => {
  if (length !== 4 && length !== 6) {
    throw new Error('OTP length must be 4 or 6.');
  }
  return uuidv4().replace(/\D/g, '').slice(0, length);
};
