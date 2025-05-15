const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const { isInternalAccount, extractBankPrefix, generateReferenceId } = require('../utils/helpers');
const { signTransaction, verifyTransactionSignature, getJwks } = require('../config/jwt');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Create an internal transaction (between accounts in the same bank)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createInternalTransaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const { from_account, to_account, amount, currency, description } = req.body;

    // Validate amount
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than zero'
      });
    }

    // Check if both accounts are internal
    if (!isInternalAccount(from_account) || !isInternalAccount(to_account)) {
      return res.status(400).json({
        success: false,
        message: 'For internal transfers, both accounts must belong to this bank'
      });
    }

    // Check if source account belongs to the authenticated user
    const sourceAccount = await Account.findByAccountNumber(from_account);

    if (!sourceAccount) {
      return res.status(404).json({
        success: false,
        message: 'Source account not found'
      });
    }

    if (sourceAccount.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to transfer from this account'
      });
    }

    // Check if source account has sufficient funds
    if (sourceAccount.balance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient funds'
      });
    }

    // Check if source account currency matches the transaction currency
    if (sourceAccount.currency !== currency) {
      return res.status(400).json({
        success: false,
        message: 'Currency mismatch with source account'
      });
    }

    // Check if destination account exists
    const destAccount = await Account.findByAccountNumber(to_account);

    if (!destAccount) {
      return res.status(404).json({
        success: false,
        message: 'Destination account not found'
      });
    }

    // Check if destination account currency matches the transaction currency
    if (destAccount.currency !== currency) {
      return res.status(400).json({
        success: false,
        message: 'Currency mismatch with destination account'
      });
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
      await Account.updateBalance(from_account, -amount);
      await Account.updateBalance(to_account, amount);

      // Update transaction status
      await Transaction.updateStatus(referenceId, 'completed');

      // Get the updated transaction
      const updatedTransaction = await Transaction.findByReferenceId(referenceId);

      res.status(201).json({
        success: true,
        message: 'Internal transaction completed successfully',
        data: updatedTransaction
      });
    } catch (error) {
      // Transaction failed, update status
      await Transaction.updateStatus(referenceId, 'failed');

      throw error;
    }
  } catch (error) {
    console.error('Error creating internal transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating internal transaction',
      error: error.message
    });
  }
};

/**
 * Create an external transaction (to an account in another bank)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createExternalTransaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const { from_account, to_account, amount, currency, description } = req.body;

    // Validate amount
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than zero'
      });
    }

    // Check if source account is internal
    if (!isInternalAccount(from_account)) {
      return res.status(400).json({
        success: false,
        message: 'Source account must belong to this bank'
      });
    }

    // Check if destination account is external
    if (isInternalAccount(to_account)) {
      return res.status(400).json({
        success: false,
        message: 'For external transfers, destination account must belong to another bank'
      });
    }

    // Check if source account belongs to the authenticated user
    const sourceAccount = await Account.findByAccountNumber(from_account);

    if (!sourceAccount) {
      return res.status(404).json({
        success: false,
        message: 'Source account not found'
      });
    }

    if (sourceAccount.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to transfer from this account'
      });
    }

    // Check if source account has sufficient funds
    if (sourceAccount.balance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient funds'
      });
    }

    // Check if source account currency matches the transaction currency
    if (sourceAccount.currency !== currency) {
      return res.status(400).json({
        success: false,
        message: 'Currency mismatch with source account'
      });
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
      await Account.updateBalance(from_account, -amount);

      // Send transaction to destination bank
      const response = await axios.post(bankInfo.transactionUrl, {
        transaction: signedTransaction
      });

      if (response.data.success) {
        // Update transaction status
        await Transaction.updateStatus(referenceId, 'completed');

        // Get the updated transaction
        const updatedTransaction = await Transaction.findByReferenceId(referenceId);

        res.status(201).json({
          success: true,
          message: 'External transaction completed successfully',
          data: updatedTransaction
        });
      } else {
        // Transaction failed, refund the amount
        await Account.updateBalance(from_account, amount);

        // Update transaction status
        await Transaction.updateStatus(referenceId, 'failed');

        throw new Error(response.data.message || 'Transaction failed at the destination bank');
      }
    } catch (error) {
      // If transaction is still pending, update it to failed
      const currentTransaction = await Transaction.findByReferenceId(referenceId);
      if (currentTransaction && currentTransaction.status === 'pending' || currentTransaction.status === 'in_progress') {
        // Refund the amount if it was deducted
        if (currentTransaction.status === 'in_progress') {
          await Account.updateBalance(from_account, amount);
        }

        // Update transaction status
        await Transaction.updateStatus(referenceId, 'failed');
      }

      throw error;
    }
  } catch (error) {
    console.error('Error creating external transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating external transaction',
      error: error.message
    });
  }
};

/**
 * Process incoming B2B transaction from another bank
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const processB2BTransaction = async (req, res) => {
  try {
    const { transaction: signedTransaction } = req.body;

    if (!signedTransaction) {
      return res.status(400).json({
        success: false,
        message: 'Signed transaction is required'
      });
    }

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
        // If the transaction already exists and is completed, return success
        // This handles idempotency for duplicate requests
        if (existingTransaction.status === 'completed') {
          return res.status(200).json({
            success: true,
            message: 'Transaction already processed successfully',
            data: {
              referenceId: existingTransaction.reference_id,
              status: existingTransaction.status
            }
          });
        }

        // If the transaction exists but is not completed, return conflict
        return res.status(409).json({
          success: false,
          message: 'Transaction with this reference ID already exists but is not completed',
          data: {
            referenceId: existingTransaction.reference_id,
            status: existingTransaction.status
          }
        });
      }

      // Check if destination account exists and belongs to this bank
      const destAccount = await Account.findByAccountNumber(verifiedTransaction.toAccount);

      if (!destAccount) {
        return res.status(404).json({
          success: false,
          message: 'Destination account not found'
        });
      }

      // Check if destination account currency matches the transaction currency
      if (destAccount.currency !== verifiedTransaction.currency) {
        return res.status(422).json({  // Using 422 Unprocessable Entity for validation errors
          success: false,
          message: 'Currency mismatch with destination account'
        });
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
      await Account.updateBalance(verifiedTransaction.toAccount, verifiedTransaction.amount);

      // Update transaction status
      await Transaction.updateStatus(verifiedTransaction.referenceId, 'completed');

      // Get the updated transaction
      const updatedTransaction = await Transaction.findByReferenceId(verifiedTransaction.referenceId);

      // Return 201 Created for a new transaction
      res.status(201).json({
        success: true,
        message: 'Transaction processed successfully',
        data: {
          referenceId: updatedTransaction.reference_id,
          status: updatedTransaction.status
        }
      });
    } catch (error) {
      console.error('Error verifying transaction:', error);

      // Determine appropriate status code based on error
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found',
          error: error.message
        });
      } else if (error.message.includes('Invalid') || error.message.includes('signature')) {
        return res.status(401).json({  // Using 401 Unauthorized for invalid signatures
          success: false,
          message: 'Invalid transaction signature',
          error: error.message
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid transaction data',
          error: error.message
        });
      }
    }
  } catch (error) {
    console.error('Error processing B2B transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing B2B transaction',
      error: error.message
    });
  }
};

/**
 * Get the bank's JWKS (JSON Web Key Set)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getJwksEndpoint = async (req, res) => {
  try {
    const jwks = await getJwks();
    res.status(200).json(jwks);
  } catch (error) {
    console.error('Error getting JWKS:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting JWKS',
      error: error.message
    });
  }
};

/**
 * Get transaction details by reference ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getTransactionByReferenceId = async (req, res) => {
  try {
    const referenceId = req.params.referenceId;
    const userId = req.user.id;

    // Get the transaction
    const transaction = await Transaction.findByReferenceId(referenceId);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Check if user has access to the transaction
    const userAccounts = await Account.findByUserId(userId);
    const userAccountNumbers = userAccounts.map(account => account.account_number);

    const hasAccess = userAccountNumbers.includes(transaction.from_account) ||
                     userAccountNumbers.includes(transaction.to_account);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Error getting transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting transaction',
      error: error.message
    });
  }
};

/**
 * Get all transactions for the authenticated user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUserTransactions = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all transactions for the user
    const transactions = await Transaction.findByUserId(userId);

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
  createInternalTransaction,
  createExternalTransaction,
  processB2BTransaction,
  getJwksEndpoint,
  getTransactionByReferenceId,
  getUserTransactions
};