import Joi from 'joi';

export const userRegistrationSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.empty': 'Name is required',
    'string.min': 'Name must be at least 2 characters long',
    'string.max': 'Name must not exceed 100 characters'
  }),
  username: Joi.string().alphanum().min(3).max(50).required().messages({
    'string.empty': 'Username is required',
    'string.alphanum': 'Username must contain only alphanumeric characters',
    'string.min': 'Username must be at least 3 characters long',
    'string.max': 'Username must not exceed 50 characters'
  }),
  password: Joi.string().min(6).max(128).required().messages({
    'string.empty': 'Password is required',
    'string.min': 'Password must be at least 6 characters long',
    'string.max': 'Password must not exceed 128 characters'
  })
});

export const userLoginSchema = Joi.object({
  username: Joi.string().required().messages({
    'string.empty': 'Username is required'
  }),
  password: Joi.string().required().messages({
    'string.empty': 'Password is required'
  })
});

export const transactionSchema = Joi.object({
  accountFrom: Joi.string().required().messages({
    'string.empty': 'Source account is required'
  }),
  accountTo: Joi.string().required().messages({
    'string.empty': 'Destination account is required'
  }),
  amount: Joi.number().positive().precision(2).required().messages({
    'number.base': 'Amount must be a number',
    'number.positive': 'Amount must be positive',
    'any.required': 'Amount is required'
  }), // Amount is in euros (e.g., 10.50), stored directly as euros
  explanation: Joi.string().max(500).optional().messages({
    'string.max': 'Explanation must not exceed 500 characters'
  })
});

export const b2bTransactionSchema = Joi.object({
  jwt: Joi.string().required().messages({
    'string.empty': 'JWT token is required'
  })
});

export const accountCreationSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.empty': 'Account name is required',
    'string.min': 'Account name must be at least 2 characters long',
    'string.max': 'Account name must not exceed 100 characters'
  }),
  currency: Joi.string().length(3).uppercase().required().messages({
    'string.empty': 'Currency is required',
    'string.length': 'Currency must be exactly 3 characters (ISO code)',
    'string.uppercase': 'Currency must be uppercase'
  })
});
