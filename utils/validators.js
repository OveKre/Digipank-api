const { body } = require('express-validator');

// Validation rules for user registration
const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers and underscores'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number'),
  
  body('email')
    .trim()
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail(),
  
  body('full_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters')
];

// Validation rules for user login
const loginValidation = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Validation rules for creating an account
const createAccountValidation = [
  body('currency')
    .trim()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code (e.g. EUR, USD)')
    .isUppercase()
    .withMessage('Currency code must be uppercase')
];

// Validation rules for creating a transaction
const createTransactionValidation = [
  body('from_account')
    .trim()
    .notEmpty()
    .withMessage('Source account is required'),
  
  body('to_account')
    .trim()
    .notEmpty()
    .withMessage('Destination account is required'),
  
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  
  body('currency')
    .trim()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code (e.g. EUR, USD)')
    .isUppercase()
    .withMessage('Currency code must be uppercase'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters')
];

// Validation for B2B transaction
const b2bTransactionValidation = [
  body('fromAccount')
    .trim()
    .notEmpty()
    .withMessage('Source account is required'),
  
  body('toAccount')
    .trim()
    .notEmpty()
    .withMessage('Destination account is required'),
  
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  
  body('currency')
    .trim()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code (e.g. EUR, USD)')
    .isUppercase()
    .withMessage('Currency code must be uppercase'),
  
  body('senderBank')
    .trim()
    .notEmpty()
    .withMessage('Sender bank code is required'),
  
  body('receiverBank')
    .trim()
    .notEmpty()
    .withMessage('Receiver bank code is required'),
  
  body('referenceId')
    .trim()
    .notEmpty()
    .withMessage('Reference ID is required')
];

module.exports = {
  registerValidation,
  loginValidation,
  createAccountValidation,
  createTransactionValidation,
  b2bTransactionValidation
};