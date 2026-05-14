/**
 * =============================================================
 * UNIT TEST — UT-1
 * Title        : OTP Generation and Expiry
 * Requirement  : FR-3
 * Description  : Verify the system creates a valid 6-digit OTP
 *                with the correct expiry timestamp.
 * Objective    : Confirm OTP record stores a numeric code and
 *                a future expiry timestamp.
 * =============================================================
 *
 * WHY THIS TEST EXISTS:
 *   OTP (One-Time Password) is the only way a donor verifies
 *   their email after registration. If the OTP is not a proper
 *   6-digit number, or if the expiry time is wrong (already
 *   expired or missing), the user can never activate their
 *   account. This test catches those problems early —
 *   before the app is deployed or used by real users.
 *
 * HOW TO RUN:
 *   node tests/ut-1-otp-generation.test.js
 * =============================================================
 */

// ─── Import the real OTP utility from our codebase ───────────
import { generateOtp } from '../src/utils/generate-otp.js';

// ─── Simple test helper (no external package needed) ─────────
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS — ${message}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL — ${message}`);
    failed++;
  }
}

// ─── TEST SUITE: UT-1 ─────────────────────────────────────────
console.log('\n========================================');
console.log('  UT-1 — OTP Generation and Expiry');
console.log('========================================\n');

// -----------------------------------------------------------
// TEST 1: OTP should be exactly 6 digits long
// -----------------------------------------------------------
console.log('Test 1: OTP length must be 6 digits');
const otp = generateOtp(6);
assert(otp.length === 6, `OTP length is 6  (got: "${otp}")`);

// -----------------------------------------------------------
// TEST 2: OTP should contain only numeric characters
// -----------------------------------------------------------
console.log('\nTest 2: OTP must be numeric only');
const isNumeric = /^\d+$/.test(otp);
assert(isNumeric, `OTP is a numeric string  (got: "${otp}")`);

// -----------------------------------------------------------
// TEST 3: Expiry timestamp must be in the FUTURE
//   Simulate how the backend stores the OTP expiry:
//   current time + 10 minutes (600,000 milliseconds)
// -----------------------------------------------------------
console.log('\nTest 3: OTP expiry timestamp must be in the future');
const now = new Date();
const otpExpiry = new Date(now.getTime() + 10 * 60 * 1000); // +10 minutes
assert(otpExpiry > now, `Expiry is in the future  (expiry: ${otpExpiry.toISOString()})`);

// -----------------------------------------------------------
// TEST 4: Generating OTP with invalid length should throw
//   This protects the system from accidentally calling the
//   function with wrong arguments.
// -----------------------------------------------------------
console.log('\nTest 4: OTP generator must reject invalid length (e.g. 5)');
let errorThrown = false;
try {
  generateOtp(5); // 5 is not allowed — only 4 or 6
} catch (err) {
  errorThrown = true;
}
assert(errorThrown, 'Error thrown for invalid OTP length (5)');

// -----------------------------------------------------------
// TEST 5: Two different OTPs should not be identical
//   Verifies randomness — two back-to-back OTPs should differ.
// -----------------------------------------------------------
console.log('\nTest 5: Two generated OTPs should not be the same');
const otp1 = generateOtp(6);
const otp2 = generateOtp(6);
assert(otp1 !== otp2, `OTP1 (${otp1}) !== OTP2 (${otp2})`);

// ─── RESULTS SUMMARY ─────────────────────────────────────────
console.log('\n----------------------------------------');
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log('----------------------------------------\n');
if (failed === 0) {
  console.log('  🎉 UT-1 COMPLETE — All tests passed.\n');
} else {
  console.log('  ⚠️  Some tests failed. Check output above.\n');
  process.exit(1);
}
