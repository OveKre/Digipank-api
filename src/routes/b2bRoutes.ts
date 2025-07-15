import { Router, Request, Response } from 'express';
import { TransactionService } from '../services/transactionService';
import { DatabaseManager } from '../database/databaseManager';
import { b2bTransactionSchema } from '../utils/validation';
import { Logger } from '../utils/logger';
import jwt from 'jsonwebtoken';
import { B2BTransactionPayload, TransactionStatus } from '../types';

const router = Router();
const transactionService = new TransactionService();
const logger = new Logger();

/**
 * @swagger
 * /transactions/b2b:
 *   post:
 *     summary: Process B2B transaction
 *     description: Process incoming transaction from another bank
 *     tags: [B2B]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               jwt:
 *                 type: string
 *                 description: JWT signed transaction data
 *             required:
 *               - jwt
 *     responses:
 *       200:
 *         description: Transaction processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 receiverName:
 *                   type: string
 *                   description: Name of the account owner receiving the funds
 *               required:
 *                 - receiverName
 *       400:
 *         description: Validation error or invalid JWT
 *       404:
 *         description: Account not found
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = b2bTransactionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.details[0].message
      });
    }

    const { jwt: jwtToken } = value;

    let payload: B2BTransactionPayload;
    try {
      // In a real implementation, we would verify the JWT signature
      // using the sender bank's public key from JWKS endpoint
      // For now, we'll decode without verification for development
      payload = jwt.decode(jwtToken) as B2BTransactionPayload;
      
      if (!payload) {
        throw new Error('Invalid JWT payload');
      }
    } catch (jwtError) {
      return res.status(400).json({
        error: 'Invalid JWT',
        message: 'Failed to decode JWT token'
      });
    }

    // Validate payload structure
    if (!payload.accountFrom || !payload.accountTo || !payload.amount || !payload.currency) {
      return res.status(400).json({
        error: 'Invalid Payload',
        message: 'Missing required fields in JWT payload'
      });
    }

    // Amount is already in euros, store directly as euros
    const amountInEuros = payload.amount;

    // Check if destination account exists and belongs to this bank
    const toAccount = await transactionService.getAccountByNumber(payload.accountTo);
    if (!toAccount) {
      return res.status(404).json({
        error: 'Account Not Found',
        message: 'Destination account not found'
      });
    }

    // Create incoming transaction record with amount in euros
    const transaction = await transactionService.createTransaction(
      payload.accountFrom,
      payload.accountTo,
      amountInEuros,
      payload.currency,
      payload.explanation,
      payload.senderName
    );

    try {
      // Process the incoming transaction
      // For incoming transactions, we only need to credit the destination account
      // We don't need to debit from source account as it's external
      const databaseManager = DatabaseManager.getInstance();
      const db = databaseManager.getDatabase();
      const database = db.getDatabase();
      
      // Update transaction status to in progress
      await (database as any).runAsync(
        'UPDATE transactions SET status = ? WHERE id = ?',
        [TransactionStatus.IN_PROGRESS, transaction.id]
      );

      // Credit the destination account with amount in euros
      await (database as any).runAsync(
        'UPDATE accounts SET balance = balance + ? WHERE number = ?',
        [amountInEuros, payload.accountTo]
      );

      // Update transaction status to completed
      await (database as any).runAsync(
        'UPDATE transactions SET status = ? WHERE id = ?',
        [TransactionStatus.COMPLETED, transaction.id]
      );

      logger.info(`B2B transaction processed successfully: ${transaction.id}`);

      // Get receiver name from account owner
      const receiverAccount = await (database as any).getAsync(
        'SELECT u.name FROM users u JOIN accounts a ON u.id = a.user_id WHERE a.number = ?',
        [payload.accountTo]
      );

      res.json({
        receiverName: receiverAccount ? receiverAccount.name : 'Unknown'
      });

    } catch (processingError) {
      logger.error(`Failed to process B2B transaction: ${transaction.id}`, processingError);
      
      // Update transaction status to failed
      await transactionService.updateTransactionStatus(
        transaction.id,
        TransactionStatus.FAILED,
        processingError instanceof Error ? processingError.message : 'Processing failed'
      );

      res.status(500).json({
        error: 'Processing Error',
        message: 'Failed to process the transaction'
      });
    }

  } catch (error) {
    logger.error('B2B transaction error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while processing the B2B transaction'
    });
  }
});

export { router as b2bRoutes };
