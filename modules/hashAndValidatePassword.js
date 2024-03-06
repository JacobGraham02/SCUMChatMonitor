const crypto = require('crypto');

/**
 * This function takes a string input for a password and hashes the string while prepending a random salt onto the hashed string.
 * The function used (pbkdf2Sync) is synchronous to guarantee the most stable usage of the function, and to ensure that the 
 * function returns a hashed and salted password in a timely manner. 
 * @param {string} password 
 * @returns Object containing the hash of the password, and a random salt
 */
const hashPassword = function (password) {
    const salt = crypto.randomBytes(32).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 60, 'sha512').toString('hex');
    hashed_password = {
        hash: hash,
        salt: salt
    };
    return hashed_password;
}

/**
 * Uses the synchronous function pbkdf2Sync to generate a hash and salt of a password. The supplied string for the password must be the same 
 * as the password that the user originally entered. The password hash and salt will be supplied from querying the database. 
 * @param {string} password the original users password
 * @param {string} password_hash the hash generated from the original users password 
 * @param {string} password_salt the salt generated that is attached to the original users password hash
 * @returns 
 */
const validatePassword = function (password, password_hash, password_salt) {
    const hashed_password = crypto.pbkdf2Sync(password, password_salt, 10000, 60, 'sha512').toString('hex');
    password_hash = password_hash.replace(password_salt, "");
    return password_hash === hashed_password;
}

exports.hashPassword = hashPassword;
exports.validatePassword = validatePassword;