import { generateOtp } from '../src/utils/generate-otp.js';
let passed = 0, failed = 0;
function assert(condition, message) {
  condition ? (console.log(`✅ ${message}`), passed++) : (console.log(`❌ ${message}`), failed++);
}
const otp = generateOtp(6);
assert(otp.length === 6, 'OTP is 6 digits long');
assert(/^\d+$/.test(otp), 'OTP contains only numbers');
assert(new Date(Date.now() + 600000) > new Date(), 'Expiry is 10 mins in future');
let threw = false;
try { generateOtp(5); } catch { threw = true; }
assert(threw, 'Invalid length throws error');
assert(generateOtp(6) !== generateOtp(6), 'Two OTPs are not the same');
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);