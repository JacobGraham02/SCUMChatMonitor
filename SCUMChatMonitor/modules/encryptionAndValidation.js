const crypto = require('crypto');

const encryptPassword = function (password) {
    const salt = crypto.randomBytes(32).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 60, 'sha512').toString('hex');
    hashed_password = {
        password: salt + hash,
        salt: salt
    };
    return hashed_password;
}

const validatePassword = function (password, password_hash, password_salt) {
    const hashed_password = crypto.pbkdf2Sync(password, salt, 10000, 60, 'sha512').toString('hex');
    password_hash = password_hash.replace(salt, "");
    return password_hash = hashed_password;
}

exports.encryptPassword = encryptPassword;
exports.validatePassword = validatePassword;