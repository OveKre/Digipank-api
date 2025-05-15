const { validationResult } = require('express-validator');

/**
 * Validation middleware
 * Checks if there are validation errors from express-validator
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

module.exports = validate;