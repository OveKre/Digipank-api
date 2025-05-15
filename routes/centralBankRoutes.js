const express = require('express');
const router = express.Router();
const centralBankController = require('../controllers/centralBankController');
const authenticate = require('../middleware/auth');

/**
 * @swagger
 * /central-bank/register:
 *   post:
 *     summary: Register the bank with the central bank
 *     tags: [Central Bank]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Bank registered successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/register', authenticate, centralBankController.registerBank);

/**
 * @swagger
 * /central-bank/banks:
 *   get:
 *     summary: Get all registered banks from the central bank
 *     tags: [Central Bank]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of banks
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/banks', authenticate, centralBankController.getAllBanks);

/**
 * @swagger
 * /central-bank/banks/{prefix}:
 *   get:
 *     summary: Get bank information from the central bank
 *     tags: [Central Bank]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: prefix
 *         required: true
 *         schema:
 *           type: string
 *         description: Bank prefix
 *     responses:
 *       200:
 *         description: Bank information
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Bank not found
 *       500:
 *         description: Server error
 */
router.get('/banks/:prefix', authenticate, centralBankController.getBankInfo);

module.exports = router;