import bcrypt from 'bcryptjs';
let passed = 0, failed = 0;
function assert(condition, message) {
  condition ? (console.log(`✅ ${message}`), passed++) : (console.log(`❌ ${message}`), failed++);
}
const plain = 'TestPass123';
const hashed = await bcrypt.hash(plain, 10);
assert(hashed !== plain, 'Password is not stored as plain text');
assert(hashed.startsWith('$2'), 'Hash has bcrypt signature');
assert(await bcrypt.compare(plain, hashed), 'Correct password matches hash');
assert(!await bcrypt.compare('WrongPass', hashed), 'Wrong password does not match');
assert(await bcrypt.hash(plain, 10) !== await bcrypt.hash(plain, 10), 'Same password gives different hashes');
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);