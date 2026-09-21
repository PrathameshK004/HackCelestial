const test = require('node:test');
const assert = require('node:assert');
const User = require('../modules/user.module');
const { pool } = require('../utils/db.util');

test('User profile update logic: updates name, upiId, and phone in database', async () => {
    // 1. Create a dummy test user
    const testEmail = `profiletest_${Date.now()}@example.com`;
    const dummyUser = await User.create({
        username: 'Test Traveler',
        emailId: testEmail,
        password: 'password123',
        isTemp: false
    });

    assert.ok(dummyUser._id, 'Dummy user created with an ID');
    assert.strictEqual(dummyUser.username, 'Test Traveler');

    // 2. Perform direct update query simulation matching updateProfile controller
    const updatedName = 'Yogesh D';
    const updatedPhone = '+91 98765 43210';
    const updatedUpiId = 'yogesh@okaxis';
    const updatedDob = '1998-07-24';

    const updateResult = await pool.query(
        `UPDATE users 
         SET username = $1, 
             phone = $2, 
             upi_id = $3, 
             dob = $4,
             updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [updatedName, updatedPhone, updatedUpiId, updatedDob, dummyUser._id]
    );

    assert.strictEqual(updateResult.rowCount, 1, 'Exactly one row updated');
    const row = updateResult.rows[0];

    assert.strictEqual(row.username, 'Yogesh D');
    assert.strictEqual(row.phone, '+91 98765 43210');
    assert.strictEqual(row.upi_id, 'yogesh@okaxis');
    assert.strictEqual(row.dob, '1998-07-24');

    // 3. Verify User.findById retrieves the newly updated fields
    const fetched = await User.findById(dummyUser._id);
    assert.strictEqual(fetched.username, 'Yogesh D');
    assert.strictEqual(fetched.phone, '+91 98765 43210');
    assert.strictEqual(fetched.upiId, 'yogesh@okaxis');
    assert.strictEqual(fetched.dob, '1998-07-24');

    // 4. Clean up test user
    await pool.query('DELETE FROM users WHERE id = $1', [dummyUser._id]);
});
