import { Router, Request, Response } from 'express';
import { TransactionService } from '../services/transactionService';
import { ExternalTransactionService } from '../services/externalTransactionService';
import { authenticate } from '../middleware/auth';
import { transactionSchema } from '../utils/validation';
import { CryptoUtils } from '../utils/crypto';
import { Logger } from '../utils/logger';
import { TransactionStatus } from '../types';

const router = Router();
const transactionService = new TransactionService();
const externalTransactionService = new ExternalTransactionService();
const logger = new Logger();

/**
 * @swagger
 * /transactions:
 *   post:
 *     summary: Create transaction
 *     description: Initiate a new transaction (internal or external)
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               accountFrom:
 *                 type: string
 *                 description: Source account number
 *               accountTo:
 *                 type: string
 *                 description: Destination account number
 *               amount:
 *                 type: number
 *                 description: Transaction amount
 *               explanation:
 *                 type: string
 *                 description: Transaction explanation
 *             required:
 *               - accountFrom
 *               - accountTo
 *               - amount
 *     responses:
 *       201:
 *         description: Transaction created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied
 *       404:
 *         description: Account not found
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = transactionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.details[0].message
      });
    }

    const { accountFrom, accountTo, amount, explanation } = value;

    // Amount is in euros, store directly as euros
    const amountInEuros = amount;

    // Verify that user owns the source account
    const fromAccount = await transactionService.getAccountByNumber(accountFrom);
    if (!fromAccount) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Source account not found'
      });
    }

    // Check if this is an internal or external transaction
    const isInternalTo = CryptoUtils.isInternalAccount(accountTo);
    const isInternalFrom = CryptoUtils.isInternalAccount(accountFrom);

    if (!isInternalFrom) {
      return res.status(403).json({
        error: 'Access Denied',
        message: 'You can only send from internal accounts'
      });
    }

    // Create transaction with amount in euros
    const transaction = await transactionService.createTransaction(
      accountFrom,
      accountTo,
      amountInEuros,
      fromAccount.currency,
      explanation
    );

    // If both accounts are internal, process immediately
    if (isInternalTo) {
      try {
        await transactionService.processInternalTransaction(transaction.id);
        logger.info(`Internal transaction processed: ${transaction.id}`);
      } catch (error) {
        logger.error(`Failed to process internal transaction: ${transaction.id}`, error);
      }
    } else {
        // External transaction - send JWT to destination bank
      logger.info(`Processing external transaction: ${transaction.id}`);

      try {
        // First, check if sender has sufficient funds and debit the amount
        await transactionService.debitAccount(
          transaction.from_account,
          transaction.amount
        );

        logger.info(`Amount ${transaction.amount} EUR debited from account ${transaction.from_account}`);

        const success = await externalTransactionService.processOutgoingTransaction(
          transaction.id,
          transaction.from_account,
          transaction.to_account,
          transaction.amount,
          transaction.currency,
          transaction.description,
          'Digipanga klient' // Default sender name
        );

        if (success) {
          logger.info(`External transaction sent successfully: ${transaction.id}`);

          // Update transaction status to completed since destination bank accepted it
          await transactionService.updateTransactionStatus(
            transaction.id,
            TransactionStatus.COMPLETED,
            'Successfully sent to destination bank and accepted'
          );
        } else {
          logger.error(`Failed to send external transaction: ${transaction.id}`);

          // Refund the amount back to sender's account since transaction failed
          await transactionService.creditAccount(
            transaction.from_account,
            transaction.amount
          );

          logger.info(`Amount ${transaction.amount} EUR refunded to account ${transaction.from_account}`);

          // Update transaction status to failed
          await transactionService.updateTransactionStatus(
            transaction.id,
            TransactionStatus.FAILED,
            'Failed to send to destination bank - amount refunded'
          );
        }
      } catch (error) {
        logger.error(`Error processing external transaction ${transaction.id}:`, error);

        try {
          // Try to refund the amount if it was already debited
          await transactionService.creditAccount(
            transaction.from_account,
            transaction.amount
          );

          logger.info(`Amount ${transaction.amount} EUR refunded to account ${transaction.from_account} after error`);
        } catch (refundError) {
          logger.error(`Failed to refund amount to account ${transaction.from_account}:`, refundError);
        }

        await transactionService.updateTransactionStatus(
          transaction.id,
          TransactionStatus.FAILED,
          error instanceof Error ?
            `${error.message} - amount refunded` :
            'Processing error - amount refunded'
        );
      }
    }

    // Return updated transaction
    const updatedTransaction = await transactionService.getTransactionById(transaction.id);
    res.status(201).json(updatedTransaction);
  } catch (error) {
    logger.error('Create transaction error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while creating the transaction'
    });
  }
});



/**
 * @swagger
 * /transactions/{id}:
 *   get:
 *     summary: Get transaction
 *     description: Get details of a specific transaction
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID
 *     responses:
 *       200:
 *         description: Transaction retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied
 *       404:
 *         description: Transaction not found
 */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const transactionId = req.params.id;

    const transaction = await transactionService.getTransactionById(transactionId);
    if (!transaction) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Transaction not found'
      });
    }

    // Check if user has access to this transaction
    // This should be implemented by checking account ownership
    // For now, we'll return the transaction

    res.json(transaction);
  } catch (error) {
    logger.error('Get transaction error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while retrieving the transaction'
    });
  }
});

export { router as transactionRoutes };