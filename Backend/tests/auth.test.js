const test = require('node:test');
const assert = require('node:assert');
const { generateOTP, generate2FAOTP, isOTPExpired, verifyOTP, hashOTP, getOTPExpiry } = require('../utils/otp.util');
const { isValidEmail, isValidPassword, isValidUsername, isValidUserId } = require('../utils/verify.util');

test('OTP Generation should produce valid 4-digit code', () => {
    const otp = generateOTP();
    assert.strictEqual(typeof otp, 'number', 'OTP must be a number');
    assert.ok(otp >= 1000 && otp <= 9999, 'OTP must be a 4-digit number between 1000 and 9999');
});

test('2FA OTP Generation should produce valid 6-digit code', () => {
    const otp = generate2FAOTP();
    assert.strictEqual(typeof otp, 'number', '2FA OTP must be a number');
    assert.ok(otp >= 100000 && otp <= 999999, '2FA OTP must be a 6-digit number between 100000 and 999999');

    const otpFromParam = generateOTP(6);
    assert.strictEqual(typeof otpFromParam, 'number', '6-digit OTP must be a number');
    assert.ok(otpFromParam >= 100000 && otpFromParam <= 999999, 'generateOTP(6) must be a 6-digit number');
});

test('OTP Expiry helper should correctly check timestamps', () => {
    // Current time + 5 mins is NOT expired
    const futureExpiry = new Date(Date.now() + 5 * 60 * 1000);
    assert.strictEqual(isOTPExpired(futureExpiry), false, 'Future timestamp should not be expired');

    // Past time IS expired
    const pastExpiry = new Date(Date.now() - 1000);
    assert.strictEqual(isOTPExpired(pastExpiry), true, 'Past timestamp must be expired');

    // Null or undefined should be considered expired for security
    assert.strictEqual(isOTPExpired(null), true, 'Null expiry must be considered expired');
});

test('OTP Hashing and Verification with bcrypt', async () => {
    const otp = 4321;
    const hash = await hashOTP(otp);
    
    assert.ok(hash.startsWith('$2'), 'Hash must be a bcrypt string starting with $2');

    const isValid = await verifyOTP(otp, hash);
    assert.strictEqual(isValid, true, 'Valid plain OTP must match hashed OTP');

    const isWrong = await verifyOTP(9999, hash);
    assert.strictEqual(isWrong, false, 'Incorrect OTP must fail verification');
});

test('Email validation tests', () => {
    assert.strictEqual(isValidEmail('traveler@example.com'), true, 'Valid email should pass');
    assert.strictEqual(isValidEmail('user.name+tag@sub.domain.co'), true, 'Complex valid email should pass');
    assert.strictEqual(isValidEmail('plainaddress'), false, 'Email without @ should fail');
    assert.strictEqual(isValidEmail('missing@domain'), false, 'Email without TLD should fail');
    assert.strictEqual(isValidEmail(''), false, 'Empty string should fail');
});

test('Password strength validation tests', () => {
    assert.strictEqual(isValidPassword('securePass123'), true, 'Password >= 6 characters should pass');
    assert.strictEqual(isValidPassword('123456'), true, 'Password of exactly 6 characters should pass');
    assert.strictEqual(isValidPassword('short'), false, 'Password < 6 characters must fail');
    assert.strictEqual(isValidPassword(''), false, 'Empty password must fail');
    assert.strictEqual(isValidPassword(null), false, 'Null password must fail');
});

test('Username validation tests', () => {
    assert.strictEqual(isValidUsername('Yogesh'), true, 'Username >= 3 characters should pass');
    assert.strictEqual(isValidUsername('yo'), false, 'Username < 3 characters must fail');
    assert.strictEqual(isValidUsername(''), false, 'Empty username must fail');
});

test('UUID validation tests', () => {
    assert.strictEqual(isValidUserId('b2e4f402-76ec-4fb0-be02-7c1e88935474'), true, 'Valid UUID should pass');
    assert.strictEqual(isValidUserId('invalid-uuid-123'), false, 'Invalid UUID string must fail');
    assert.strictEqual(isValidUserId('12345'), false, 'Short string must fail');
});
