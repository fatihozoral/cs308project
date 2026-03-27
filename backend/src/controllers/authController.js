/**
 * Auth Controller
 * CS 308 Online Ticketing Project
 *
 * Handles user registration and login
 */

const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { hashPassword, comparePassword } = require('../utils/hashPassword');

/**
 * Register a new customer
 * POST /api/auth/register
 */
async function register(req, res) {
  const { name, email, password, tax_id, home_address } = req.body;

  try {
    // Check if email already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: 'Bu e-posta adresi kullanılıyor.'
      });
    }

    // Hash the password
    const password_hash = await hashPassword(password);

    // Insert new user (default role is 'customer')
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, tax_id, home_address, role)
       VALUES ($1, $2, $3, $4, $5, 'customer')
       RETURNING id, name, email, role`,
      [name, email, password_hash, tax_id, home_address]
    );

    const user = result.rows[0];

    return res.status(201).json({
      message: 'Kayıt başarılı.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      error: 'Sunucu hatası. Lütfen tekrar deneyin.'
    });
  }
}

/**
 * Login user
 * POST /api/auth/login
 */
async function login(req, res) {
  const { email, password } = req.body;

  try {
    // Find user by email
    const result = await pool.query(
      'SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = $1',
      [email]
    );

    // User not found or password incorrect - same error message for security
    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'E-posta veya şifre hatalı.'
      });
    }

    const user = result.rows[0];

    // Check if account is active
    if (!user.is_active) {
      return res.status(403).json({
        error: 'Hesabınız devre dışı bırakılmıştır.'
      });
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'E-posta veya şifre hatalı.'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      }
    );

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      error: 'Sunucu hatası. Lütfen tekrar deneyin.'
    });
  }
}

module.exports = {
  register,
  login
};
