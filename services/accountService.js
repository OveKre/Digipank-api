const Account = require('../models/Account');
const { isInternalAccount } = require('../utils/helpers');

/**
 * Get account by account number
 * @param {string} accountNumber - Account number
 * @returns {Promise<Object>} - Account object
 */
const getAccountByNumber = async (accountNumber) => {
  return await Account.findByAccountNumber(accountNumber);
};

/**
 * Get all accounts for a user
 * @param {number} userId - User ID
 * @returns {Promise<Array>} - Array of accounts
 */
const getUserAccounts = async (userId) => {
  return await Account.findByUserId(userId);
};

/**
 * Create a new account for a user
 * @param {Object} accountData - Account data
 * @returns {Promise<Object>} - Created account
 */
const createAccount = async (accountData) => {
  return await Account.create(accountData);
};

/**
 * Validate account for transaction
 * @param {string} accountNumber - Account number
 * @param {number} userId - User ID (optional, for checking ownership)
 * @param {number} amount - Transaction amount (optional, for checking balance)
 * @param {string} currency - Currency code (optional, for checking currency match)
 * @returns {Promise<Object>} - Validation result with account and error if any
 */
const validateAccount = async (accountNumber, userId = null, amount = null, currency = null) => {
  const result = {
    account: null,
    isValid: false,
    error: null
  };
  
  try {
    // Check if account exists
    const account = await Account.findByAccountNumber(accountNumber);
    
    if (!account) {
      result.error = 'Account not found';
      return result;
    }
    
    result.account = account;
    
    // Check if account belongs to the user (if userId provided)
    if (userId !== null && account.user_id !== userId) {
      result.error = 'You do not have permission to access this account';
      return result;
    }
    
    // Check if account has sufficient funds (if amount provided)
    if (amount !== null && account.balance < amount) {
      result.error = 'Insufficient funds';
      return result;
    }
    
    // Check if account currency matches (if currency provided)
    if (currency !== null && account.currency !== currency) {
      result.error = 'Currency mismatch';
      return result;
    }
    
    result.isValid = true;
    return result;
  } catch (error) {
    result.error = error.message;
    return result;
  }
};

/**
 * Check if an account exists (internal or external)
 * @param {string} accountNumber - Account number
 * @returns {Promise<boolean>} - True if account exists
 */
const accountExists = async (accountNumber) => {
  if (isInternalAccount(accountNumber)) {
    // Check in local database
    const account = await Account.findByAccountNumber(accountNumber);
    return !!account;
  } else {
    // For external accounts, we assume it exists
    // In a real implementation, we would check with the central bank or other bank
    return true;
  }
};

/**
 * Update account balance
 * @param {string} accountNumber - Account number
 * @param {number} amount - Amount to add (positive) or subtract (negative)
 * @returns {Promise<Object>} - Updated account
 */
const updateBalance = async (accountNumber, amount) => {
  return await Account.updateBalance(accountNumber, amount);
};

module.exports = {
  getAccountByNumber,
  getUserAccounts,
  createAccount,
  validateAccount,
  accountExists,
  updateBalance
};