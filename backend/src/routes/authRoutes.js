/**
 * Auth Routes
 * CS 308 Online Ticketing Project
 *
 * Authentication endpoints: POST /register, POST /login
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const {
  registerValidationRules,
  loginValidationRules,
  validate
} = require('../validators/authValidators');

/**
 * POST /api/auth/register
 * Register a new customer account
 */
router.post(
  '/register',
  registerValidationRules,
  validate,
  authController.register
);

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post(
  '/login',
  loginValidationRules,
  validate,
  authController.login
);

module.exports = router;
