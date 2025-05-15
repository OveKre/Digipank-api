const Account = require('../models/Account');
const Transaction = require('../models/Transaction');

/**
 * Create a new account for the authenticated user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currency } = req.body;
    
    // Create the account
    const account = await Account.create({
      user_id: userId,
      currency: currency.toUpperCase()
    });
    
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: account
    });
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating account',
      error: error.message
    });
  }
};

/**
 * Get all accounts for the authenticated user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUserAccounts = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all accounts for the user
    const accounts = await Account.findByUserId(userId);
    
    res.status(200).json({
      success: true,
      data: accounts
    });
  } catch (error) {
    console.error('Error getting accounts:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting accounts',
      error: error.message
    });
  }
};

/**
 * Get account details by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAccountById = async (req, res) => {
  try {
    const accountId = req.params.id;
    const userId = req.user.id;
    
    // Get the account
    const account = await Account.findById(accountId);
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }
    
    // Check if the account belongs to the authenticated user
    if (account.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    res.status(200).json({
      success: true,
      data: account
    });
  } catch (error) {
    console.error('Error getting account:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting account',
      error: error.message
    });
  }
};

/**
 * Get account details by account number
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAccountByNumber = async (req, res) => {
  try {
    const accountNumber = req.params.accountNumber;
    const userId = req.user.id;
    
    // Get the account
    const account = await Account.findByAccountNumber(accountNumber);
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }
    
    // Check if the account belongs to the authenticated user
    if (account.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    res.status(200).json({
      success: true,
      data: account
    });
  } catch (error) {
    console.error('Error getting account:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting account',
      error: error.message
    });
  }
};

/**
 * Get transaction history for an account
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAccountTransactions = async (req, res) => {
  try {
    const accountNumber = req.params.accountNumber;
    const userId = req.user.id;
    
    // Get the account
    const account = await Account.findByAccountNumber(accountNumber);
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }
    
    // Check if the account belongs to the authenticated user
    if (account.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Get transactions for the account
    const transactions = await Transaction.findByAccount(accountNumber);
    
    res.status(200).json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Error getting transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting transactions',
      error: error.message
    });
  }
};

module.exports = {
  createAccount,
  getUserAccounts,
  getAccountById,
  getAccountByNumber,
  getAccountTransactions
};