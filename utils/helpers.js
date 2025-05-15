const dotenv = require('dotenv');

dotenv.config();

/**
 * Generate a unique account number using bank prefix
 * @param {string} currency - Currency code (e.g. EUR, USD)
 * @returns {string} - Unique account number
 */
const generateAccountNumber = (currency) => {
  const bankPrefix = process.env.BANK_PREFIX || 'DP';
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `${bankPrefix}${currency}${timestamp.slice(-6)}${random}`;
};

/**
 * Extract bank prefix from account number
 * @param {string} accountNumber - Account number
 * @returns {string} - Bank prefix
 */
const extractBankPrefix = (accountNumber) => {
  // Assuming bank prefix is always at the beginning and followed by a 3-letter currency code
  return accountNumber.substring(0, accountNumber.length - 10);
};

/**
 * Check if the account belongs to this bank
 * @param {string} accountNumber - Account number
 * @returns {boolean} - True if the account belongs to this bank
 */
const isInternalAccount = (accountNumber) => {
  const bankPrefix = process.env.BANK_PREFIX || 'DP';
  return accountNumber.startsWith(bankPrefix);
};

/**
 * Format currency amount
 * @param {number} amount - Amount
 * @param {string} currency - Currency code
 * @returns {string} - Formatted amount with currency
 */
const formatCurrency = (amount, currency) => {
  return `${amount.toFixed(2)} ${currency}`;
};

/**
 * Generate a transaction reference ID
 * @returns {string} - Unique reference ID
 */
const generateReferenceId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
};

module.exports = {
  generateAccountNumber,
  extractBankPrefix,
  isInternalAccount,
  formatCurrency,
  generateReferenceId
};