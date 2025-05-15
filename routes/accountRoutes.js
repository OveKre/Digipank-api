const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');
const { createAccountValidation } = require('../utils/validators');
const validate = require('../middleware/validation');
const authenticate = require('../middleware/auth');

/**
 * @swagger
 * /accounts:
 *   post:
 *     summary: Create a new account
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currency
 *             properties:
 *               currency:
 *                 type: string
 *                 description: The currency code (e.g. EUR, USD)
 *     responses:
 *       201:
 *         description: Account created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/', authenticate, createAccountValidation, validate, accountController.createAccount);

/**
 * @swagger
 * /accounts:
 *   get:
 *     summary: Get all accounts for the authenticated user
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of accounts
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/', authenticate, accountController.getUserAccounts);

/**
 * @swagger
 * /accounts/{id}:
 *   get:
 *     summary: Get account by ID
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Account ID
 *     responses:
 *       200:
 *         description: Account details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Account not found
 *       500:
 *         description: Server error
 */
router.get('/:id', authenticate, accountController.getAccountById);

/**
 * @swagger
 * /accounts/number/{accountNumber}:
 *   get:
 *     summary: Get account by account number
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accountNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: Account number
 *     responses:
 *       200:
 *         description: Account details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Account not found
 *       500:
 *         description: Server error
 */
router.get('/number/:accountNumber', authenticate, accountController.getAccountByNumber);

/**
 * @swagger
 * /accounts/number/{accountNumber}/transactions:
 *   get:
 *     summary: Get transaction history for an account
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accountNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: Account number
 *     responses:
 *       200:
 *         description: Transaction history
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Account not found
 *       500:
 *         description: Server error
 */
router.get('/number/:accountNumber/transactions', authenticate, accountController.getAccountTransactions);

module.exports = router;