/**
 * Auth Validators
 * CS 308 Online Ticketing Project
 *
 * Express-validator rules for authentication endpoints
 */

const { body, validationResult } = require('express-validator');

/**
 * Validation rules for user registration
 */
const registerValidationRules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Ad Soyad alanı zorunludur.')
    .isLength({ min: 2 })
    .withMessage('Ad Soyad en az 2 karakter olmalı.'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email alanı zorunludur.')
    .isEmail()
    .withMessage('Geçerli bir e-posta adresi giriniz.')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Şifre alanı zorunludur.')
    .isLength({ min: 8 })
    .withMessage('Şifre en az 8 karakter olmalı.')
    .matches(/[A-Z]/)
    .withMessage('Şifre en az bir büyük harf içermelidir.')
    .matches(/[0-9]/)
    .withMessage('Şifre en az bir rakam içermelidir.'),

  body('tax_id')
    .trim()
    .notEmpty()
    .withMessage('TC Kimlik/Vergi No zorunludur.')
    .isLength({ min: 11, max: 11 })
    .withMessage('TC Kimlik/Vergi No 11 hane olmalıdır.')
    .matches(/^[0-9]+$/)
    .withMessage('TC Kimlik/Vergi No sadece rakamlardan oluşmalıdır.'),

  body('home_address')
    .trim()
    .notEmpty()
    .withMessage('Ev Adresi zorunludur.')
];

/**
 * Validation rules for user login
 */
const loginValidationRules = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email ve şifre zorunludur.')
    .isEmail()
    .withMessage('Geçerli bir e-posta adresi giriniz.')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Email ve şifre zorunludur.')
];

/**
 * Middleware to handle validation results
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // Return the first error message
    const firstError = errors.array()[0];
    return res.status(400).json({
      error: firstError.msg
    });
  }

  next();
};

module.exports = {
  registerValidationRules,
  loginValidationRules,
  validate
};
