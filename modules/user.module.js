const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    username: { type: String },
    emailId: { type: String },
    password: { type: String },
    isTemp: { type: Boolean, default: false },
    code: { type: String },
    codeExpiry: { type: Date }
});



userSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        const salt = await bcrypt.genSalt();
        this.password = await bcrypt.hash(this.password, salt);
    }
    if (this.isModified('code')) { // Check if the code is modified
        const salt = await bcrypt.genSalt();
        this.code = await bcrypt.hash(this.code, salt); // Hash the code
    }
    next();
});



const User = mongoose.model('User', userSchema);
module.exports = User;
