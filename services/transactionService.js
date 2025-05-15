const Transaction = require('../models/Transaction');
const accountService = require('./accountService');
const { isInternalAccount, extractBankPrefix, generateReferenceId } = require('../utils/helpers');
const { signTransaction, verifyTransactionSignature } = require('../config/jwt');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Create an internal transaction (between accounts in the same bank)
 * @param {Object} transactionData - Transaction data
 * @param {number} userId - User ID for authorization
 * @returns {Promise<Object>} - Transaction result
 */
const createInternalTransaction = async (transactionData, userId) => {
  const { from_account, to_account, amount, currency, description } = transactionData;
  
  // Validate amount
  if (amount <= 0) {
    throw new Error('Amount must be greater than zero');
  }
  
  // Check if both accounts are internal
  if (!isInternalAccount(from_account) || !isInternalAccount(to_account)) {
    throw new Error('For internal transfers, both accounts must belong to this bank');
  }
  
  // Validate source account
  const sourceValidation = await accountService.validateAccount(from_account, userId, amount, currency);
  
  if (!sourceValidation.isValid) {
    throw new Error(sourceValidation.error);
  }
  
  // Validate destination account
  const destValidation = await accountService.validateAccount(to_account, null, null, currency);
  
  if (!destValidation.isValid) {
    throw new Error(destValidation.error);
  }
  
  // Generate reference ID
  const referenceId = generateReferenceId();
  
  // Create the transaction
  const transaction = await Transaction.create({
    reference_id: referenceId,
    from_account,
    to_account,
    amount,
    currency,
    status: 'pending',
    type: 'internal',
    description
  });
  
  try {
    // Update balances
    await accountService.updateBalance(from_account, -amount);
    await accountService.updateBalance(to_account, amount);
    
    // Update transaction status
    await Transaction.updateStatus(referenceId, 'completed');
    
    // Get the updated transaction
    return await Transaction.findByReferenceId(referenceId);
  } catch (error) {
    // Transaction failed, update status
    await Transaction.updateStatus(referenceId, 'failed');
    throw error;
  }
};

/**
 * Create an external transaction (to an account in another bank)
 * @param {Object} transactionData - Transaction data
 * @param {number} userId - User ID for authorization
 * @returns {Promise<Object>} - Transaction result
 */
const createExternalTransaction = async (transactionData, userId) => {
  const { from_account, to_account, amount, currency, description } = transactionData;
  
  // Validate amount
  if (amount <= 0) {
    throw new Error('Amount must be greater than zero');
  }
  
  // Check if source account is internal
  if (!isInternalAccount(from_account)) {
    throw new Error('Source account must belong to this bank');
  }
  
  // Check if destination account is external
  if (isInternalAccount(to_account)) {
    throw new Error('For external transfers, destination account must belong to another bank');
  }
  
  // Validate source account
  const sourceValidation = await accountService.validateAccount(from_account, userId, amount, currency);
  
  if (!sourceValidation.isValid) {
    throw new Error(sourceValidation.error);
  }
  
  // Extract destination bank prefix
  const destinationBankPrefix = extractBankPrefix(to_account);
  
  // Create reference ID
  const referenceId = generateReferenceId();
  
  // Create the transaction
  const transaction = await Transaction.create({
    reference_id: referenceId,
    from_account,
    to_account,
    amount,
    currency,
    status: 'pending',
    type: 'external',
    description
  });
  
  try {
    // Get bank info from central bank
    const centralBankUrl = process.env.CENTRAL_BANK_URL;
    const centralBankApiKey = process.env.CENTRAL_BANK_API_KEY;
    
    const bankResponse = await axios.get(`${centralBankUrl}/banks/${destinationBankPrefix}`, {
      headers: {
        'Authorization': `Bearer ${centralBankApiKey}`
      }
    });
    
    const bankInfo = bankResponse.data;
    
    if (!bankInfo || !bankInfo.transactionUrl) {
      throw new Error(`Bank with prefix ${destinationBankPrefix} not found or missing transaction URL`);
    }
    
    // Prepare transaction payload
    const transactionPayload = {
      referenceId,
      fromAccount: from_account,
      toAccount: to_account,
      amount,
      currency,
      senderBank: process.env.BANK_PREFIX,
      receiverBank: destinationBankPrefix,
      description
    };
    
    // Sign the transaction payload
    const signedTransaction = signTransaction(transactionPayload);
    
    // Update transaction status
    await Transaction.updateStatus(referenceId, 'in_progress');
    
    // Deduct amount from source account
    await accountService.updateBalance(from_account, -amount);
    
    // Send transaction to destination bank
    const response = await axios.post(bankInfo.transactionUrl, {
      transaction: signedTransaction
    });
    
    if (response.data.success) {
      // Update transaction status
      await Transaction.updateStatus(referenceId, 'completed');
      
      // Get the updated transaction
      return await Transaction.findByReferenceId(referenceId);
    } else {
      // Transaction failed, refund the amount
      await accountService.updateBalance(from_account, amount);
      
      // Update transaction status
      await Transaction.updateStatus(referenceId, 'failed');
      
      throw new Error(response.data.message || 'Transaction failed at the destination bank');
    }
  } catch (error) {
    // If transaction is still pending, update it to failed
    const currentTransaction = await Transaction.findByReferenceId(referenceId);
    if (currentTransaction && (currentTransaction.status === 'pending' || currentTransaction.status === 'in_progress')) {
      // Refund the amount if it was deducted
      if (currentTransaction.status === 'in_progress') {
        await accountService.updateBalance(from_account, amount);
      }
      
      // Update transaction status
      await Transaction.updateStatus(referenceId, 'failed');
    }
    
    throw error;
  }
};

/**
 * Process incoming transaction from another bank
 * @param {string} signedTransaction - Signed transaction data (JWT)
 * @returns {Promise<Object>} - Processing result
 */
const processIncomingTransaction = async (signedTransaction) => {
  try {
    // Decode transaction without verification to get sender bank
    const decodedTransaction = JSON.parse(Buffer.from(signedTransaction.split('.')[1], 'base64').toString());
    
    // Extract sender bank prefix
    const senderBankPrefix = decodedTransaction.senderBank;
    
    // Verify the transaction signature
    const verifiedTransaction = await verifyTransactionSignature(signedTransaction, senderBankPrefix);
    
    // Check if transaction reference ID already exists
    const existingTransaction = await Transaction.findByReferenceId(verifiedTransaction.referenceId);
    
    if (existingTransaction) {
      throw new Error('Transaction with this reference ID already exists');
    }
    
    // Check if destination account exists and belongs to this bank
    const destValidation = await accountService.validateAccount(
      verifiedTransaction.toAccount, 
      null, 
      null, 
      verifiedTransaction.currency
    );
    
    if (!destValidation.isValid) {
      throw new Error(destValidation.error);
    }
    
    // Create the transaction
    const transaction = await Transaction.create({
      reference_id: verifiedTransaction.referenceId,
      from_account: verifiedTransaction.fromAccount,
      to_account: verifiedTransaction.toAccount,
      amount: verifiedTransaction.amount,
      currency: verifiedTransaction.currency,
      status: 'pending',
      type: 'incoming',
      description: verifiedTransaction.description
    });
    
    // Update destination account balance
    await accountService.updateBalance(verifiedTransaction.toAccount, verifiedTransaction.amount);
    
    // Update transaction status
    await Transaction.updateStatus(verifiedTransaction.referenceId, 'completed');
    
    // Get the updated transaction
    const updatedTransaction = await Transaction.findByReferenceId(verifiedTransaction.referenceId);
    
    return {
      success: true,
      transaction: {
        referenceId: updatedTransaction.reference_id,
        status: updatedTransaction.status
      }
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get transaction by reference ID
 * @param {string} referenceId - Reference ID
 * @returns {Promise<Object>} - Transaction
 */
const getTransactionByReferenceId = async (referenceId) => {
  return await Transaction.findByReferenceId(referenceId);
};

/**
 * Get all transactions for a user
 * @param {number} userId - User ID
 * @returns {Promise<Array>} - Array of transactions
 */
const getUserTransactions = async (userId) => {
  return await Transaction.findByUserId(userId);
};

/**
 * Get transactions for an account
 * @param {string} accountNumber - Account number
 * @returns {Promise<Array>} - Array of transactions
 */
const getAccountTransactions = async (accountNumber) => {
  return await Transaction.findByAccount(accountNumber);
};

module.exports = {
  createInternalTransaction,
  createExternalTransaction,
  processIncomingTransaction,
  getTransactionByReferenceId,
  getUserTransactions,
  getAccountTransactions
};