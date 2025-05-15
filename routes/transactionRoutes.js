const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { createTransactionValidation, b2bTransactionValidation } = require('../utils/validators');
const validate = require('../middleware/validation');
const authenticate = require('../middleware/auth');

/**
 * @swagger
 * /transactions/internal:
 *   post:
 *     summary: Create a new internal transaction
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - from_account
 *               - to_account
 *               - amount
 *               - currency
 *             properties:
 *               from_account:
 *                 type: string
 *                 description: Source account number
 *               to_account:
 *                 type: string
 *                 description: Destination account number
 *               amount:
 *                 type: number
 *                 format: float
 *                 description: Transaction amount
 *               currency:
 *                 type: string
 *                 description: Currency code (e.g. EUR, USD)
 *               description:
 *                 type: string
 *                 description: Transaction description
 *     responses:
 *       201:
 *         description: Transaction created successfully
 *       400:
 *         description: Validation error or insufficient funds
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Account not found
 *       500:
 *         description: Server error
 */
router.post('/internal', authenticate, createTransactionValidation, validate, transactionController.createInternalTransaction);

/**
 * @swagger
 * /transactions/external:
 *   post:
 *     summary: Create a new external transaction
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - from_account
 *               - to_account
 *               - amount
 *               - currency
 *             properties:
 *               from_account:
 *                 type: string
 *                 description: Source account number
 *               to_account:
 *                 type: string
 *                 description: Destination account number (from another bank)
 *               amount:
 *                 type: number
 *                 format: float
 *                 description: Transaction amount
 *               currency:
 *                 type: string
 *                 description: Currency code (e.g. EUR, USD)
 *               description:
 *                 type: string
 *                 description: Transaction description
 *     responses:
 *       201:
 *         description: Transaction created successfully
 *       400:
 *         description: Validation error or insufficient funds
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Account not found
 *       500:
 *         description: Server error
 */
router.post('/external', authenticate, createTransactionValidation, validate, transactionController.createExternalTransaction);

/**
 * @swagger
 * /transactions/b2b:
 *   post:
 *     summary: Process an incoming B2B transaction from another bank
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - transaction
 *             properties:
 *               transaction:
 *                 type: string
 *                 description: Signed transaction data (JWT)
 *     responses:
 *       200:
 *         description: Transaction already processed successfully (idempotent)
 *       201:
 *         description: Transaction processed successfully
 *       400:
 *         description: Invalid transaction data
 *       401:
 *         description: Invalid transaction signature
 *       404:
 *         description: Account not found
 *       409:
 *         description: Transaction already exists but is not completed
 *       422:
 *         description: Validation error (e.g., currency mismatch)
 *       500:
 *         description: Server error
 */
router.post('/b2b', transactionController.processB2BTransaction);

/**
 * @swagger
 * /transactions/jwks:
 *   get:
 *     summary: Get the bank's JSON Web Key Set (JWKS)
 *     tags: [Transactions]
 *     responses:
 *       200:
 *         description: JWKS
 *       500:
 *         description: Server error
 */
router.get('/jwks', transactionController.getJwksEndpoint);

/**
 * @swagger
 * /transactions/{referenceId}:
 *   get:
 *     summary: Get transaction by reference ID
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: referenceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction reference ID
 *     responses:
 *       200:
 *         description: Transaction details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Transaction not found
 *       500:
 *         description: Server error
 */
router.get('/:referenceId', authenticate, transactionController.getTransactionByReferenceId);

/**
 * @swagger
 * /transactions:
 *   get:
 *     summary: Get all transactions for the authenticated user
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of transactions
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/', authenticate, transactionController.getUserTransactions);

module.exports = router;