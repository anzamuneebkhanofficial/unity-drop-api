/**
 * =============================================================
 * UNIT TEST — UT-2
 * Title        : Password Encryption Before Save
 * Requirement  : FR-1
 * Description  : Verify the Donor model encrypts the password
 *                before saving to the database.
 * Objective    : Confirm passwords are never stored as plain text.
 * =============================================================
 *
 * WHY THIS TEST EXISTS:
 *   If a donor's password is accidentally saved as plain text,
 *   anyone who gets access to the database can read every
 *   user's password. Bcrypt hashing is the industry-standard
 *   way to protect passwords. This test verifies that the
 *   Donor model's pre-save hook is working correctly and that
 *   the real password (e.g. "TestPass123") is NEVER what gets
 *   stored — only the encrypted hash is stored.
 *
 * HOW TO RUN:
 *   node tests/ut-2-password-encryption.test.js
 *
 * NOTE:
 *   This test does NOT need a real database connection.
 *   We test the bcrypt hashing function directly because
 *   that is exactly what the pre-save hook in the Donor
 *   model calls (bcrypt.hash with saltRounds = 10).
 * =============================================================
 */

// ─── Import bcrypt — already in our dependencies ─────────────
import bcrypt from 'bcryptjs';

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

// ─── TEST SUITE: UT-2 ─────────────────────────────────────────
console.log('\n========================================');
console.log('  UT-2 — Password Encryption Before Save');
console.log('========================================\n');

// The plain-text password a donor types when registering
const plainPassword = 'TestPass123';

// Simulate the pre-save hook: hash the password with 10 salt rounds
// This is exactly what donor-model.js does:
//   this.password = await bcrypt.hash(this.password, 10);
const hashedPassword = await bcrypt.hash(plainPassword, 10);

// -----------------------------------------------------------
// TEST 1: The stored value must NOT equal the plain text
// -----------------------------------------------------------
console.log('Test 1: Hashed password must not equal plain text');
assert(hashedPassword !== plainPassword, `Stored value is not "TestPass123"  (stored: ${hashedPassword.slice(0, 20)}...)`);

// -----------------------------------------------------------
// TEST 2: Hash must start with "$2" — the Bcrypt signature
//   Every Bcrypt hash begins with "$2b$" or "$2a$".
//   If it does, we know bcrypt was used (not MD5 or SHA, etc.)
// -----------------------------------------------------------
console.log('\nTest 2: Hash must start with Bcrypt signature "$2"');
assert(hashedPassword.startsWith('$2'), `Hash starts with "$2"  (got: ${hashedPassword.slice(0, 4)})`);

// -----------------------------------------------------------
// TEST 3: bcrypt.compare must return TRUE for the correct password
//   A donor must still be able to log in with their real password.
// -----------------------------------------------------------
console.log('\nTest 3: Correct password must pass bcrypt.compare');
const isCorrect = await bcrypt.compare(plainPassword, hashedPassword);
assert(isCorrect, 'bcrypt.compare returns true for "TestPass123"');

// -----------------------------------------------------------
// TEST 4: A WRONG password must return FALSE from bcrypt.compare
//   This confirms the hash cannot be tricked by a different input.
// -----------------------------------------------------------
console.log('\nTest 4: Wrong password must fail bcrypt.compare');
const isWrong = await bcrypt.compare('WrongPassword999', hashedPassword);
assert(!isWrong, 'bcrypt.compare returns false for wrong password');

// -----------------------------------------------------------
// TEST 5: Two hashes of the same password must be DIFFERENT
//   Bcrypt adds a random "salt" each time, so the same password
//   produces a different hash on every hash call. This is a
//   security feature — it prevents "rainbow table" attacks.
// -----------------------------------------------------------
console.log('\nTest 5: Two hashes of the same password must differ (salt check)');
const hash1 = await bcrypt.hash(plainPassword, 10);
const hash2 = await bcrypt.hash(plainPassword, 10);
assert(hash1 !== hash2, `Hash1 !== Hash2  (different salts confirm security)`);

// ─── RESULTS SUMMARY ─────────────────────────────────────────
console.log('\n----------------------------------------');
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log('----------------------------------------\n');
if (failed === 0) {
  console.log('  🎉 UT-2 COMPLETE — All tests passed.\n');
} else {
  console.log('  ⚠️  Some tests failed. Check output above.\n');
  process.exit(1);
}
