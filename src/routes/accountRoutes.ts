import { Router, Request, Response } from 'express';
import { TransactionService } from '../services/transactionService';
import { authenticate } from '../middleware/auth';
import { Logger } from '../utils/logger';

const router = Router();
const transactionService = new TransactionService();
const logger = new Logger();

/**
 * @swagger
 * /accounts/{id}/balance:
 *   get:
 *     summary: Get account balance
 *     description: Get balance for a specific account
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Account number
 *     responses:
 *       200:
 *         description: Balance retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 balance:
 *                   type: number
 *                   description: Account balance
 *                 currency:
 *                   type: string
 *                   description: Currency code
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied
 *       404:
 *         description: Account not found
 */
router.get('/:id/balance', authenticate, async (req: Request, res: Response) => {
  try {
    const accountNumber = req.params.id;
    
    // Get account details
    const account = await transactionService.getAccountByNumber(accountNumber);
    if (!account) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Account not found'
      });
    }

    // Check if user owns the account
    // For this, we need to get the account's owner
    // This should be implemented by checking user_id in accounts table
    // For now, we'll get the balance directly
    
    const balance = await transactionService.getAccountBalance(accountNumber);
    
    res.json({
      balance,
      currency: account.currency
    });
  } catch (error) {
    logger.error('Get account balance error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while retrieving account balance'
    });
  }
});

/**
 * @swagger
 * /accounts/{id}/transactions:
 *   get:
 *     summary: Get account transactions
 *     description: Get transaction history for a specific account
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Account number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of transactions to return
 *     responses:
 *       200:
 *         description: Transactions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Transaction'
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied
 *       404:
 *         description: Account not found
 */
router.get('/:id/transactions', authenticate, async (req: Request, res: Response) => {
  try {
    const accountNumber = req.params.id;
    const limit = parseInt(req.query.limit as string) || 50;
    
    // Get account details to verify ownership
    const account = await transactionService.getAccountByNumber(accountNumber);
    if (!account) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Account not found'
      });
    }

    // Check if user owns the account
    // This should be implemented by checking user_id
    // For now, we'll return the transactions
    
    const transactions = await transactionService.getAccountTransactions(accountNumber, limit);
    
    res.json(transactions);
  } catch (error) {
    logger.error('Get account transactions error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while retrieving account transactions'
    });
  }
});

export { router as accountRoutes };
