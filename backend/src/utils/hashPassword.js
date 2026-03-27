/**
 * Password Hashing Utilities
 * CS 308 Online Ticketing Project
 *
 * Provides bcrypt wrapper functions for password hashing and verification
 */

const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

/**
 * Hash a plain text password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
async function hashPassword(password) {
  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    return hash;
  } catch (error) {
    throw new Error('Error hashing password: ' + error.message);
  }
}

/**
 * Compare a plain text password with a hashed password
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password from database
 * @returns {Promise<boolean>} - True if passwords match, false otherwise
 */
async function comparePassword(password, hash) {
  try {
    const isMatch = await bcrypt.compare(password, hash);
    return isMatch;
  } catch (error) {
    throw new Error('Error comparing passwords: ' + error.message);
  }
}

module.exports = {
  hashPassword,
  comparePassword
};
