const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { pool } = require('../utils/db.util');

const toUser = (row) => row && new User({
    _id: row.id,
    username: row.username,
    emailId: row.email_id,
    password: row.password_hash,
    upiId: row.upi_id,
    isTemp: row.is_temp,
    code: row.code_hash,
    codeExpiry: row.code_expiry
});

class User {
    constructor(data) {
        Object.assign(this, data);
    }

    async save() {
        const passwordHash = typeof this.password === 'string' && this.password.startsWith('$2')
            ? this.password
            : await bcrypt.hash(String(this.password), 10);
        const codeHash = !this.code
            ? null
            : typeof this.code === 'string' && this.code.startsWith('$2')
                ? this.code
                : await bcrypt.hash(this.code.toString(), 10);

        const email = (this.emailId || '').trim().toLowerCase();

        // Ensure _id matches existing user if email is already in database
        if (!this._id) {
            const existing = await pool.query('SELECT id FROM users WHERE LOWER(email_id) = LOWER($1) LIMIT 1', [email]);
            if (existing.rows.length > 0) {
                this._id = existing.rows[0].id;
            } else {
                this._id = crypto.randomUUID();
            }
        }

        const result = await pool.query(`
            INSERT INTO users (id, username, email_id, password_hash, upi_id, is_temp, code_hash, code_expiry)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (id) DO UPDATE SET
                username = EXCLUDED.username,
                email_id = EXCLUDED.email_id,
                password_hash = EXCLUDED.password_hash,
                upi_id = EXCLUDED.upi_id,
                is_temp = EXCLUDED.is_temp,
                code_hash = EXCLUDED.code_hash,
                code_expiry = EXCLUDED.code_expiry,
                updated_at = NOW()
            RETURNING *
        `, [this._id, this.username, email, passwordHash, this.upiId || null, this.isTemp || false, codeHash, this.codeExpiry || null]);

        Object.assign(this, toUser(result.rows[0]));
        return this;
    }

    static async findOne(filters) {
        if (filters.emailId) {
            const email = filters.emailId.trim().toLowerCase();
            const result = await pool.query('SELECT * FROM users WHERE LOWER(email_id) = LOWER($1) LIMIT 1', [email]);
            return toUser(result.rows[0]);
        }
        if (filters._id || filters.id) {
            return this.findById(filters._id || filters.id);
        }
        return null;
    }

    static async findById(id) {
        const result = await pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
        return toUser(result.rows[0]);
    }

    static async create(data) {
        return new User(data).save();
    }

    static async findByIdAndDelete(id) {
        const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
        return toUser(result.rows[0]);
    }
}

module.exports = User;