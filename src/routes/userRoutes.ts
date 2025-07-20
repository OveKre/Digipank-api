import { Router, Request, Response } from 'express';
import { UserService } from '../services/userService';
import { authenticate } from '../middleware/auth';
import { userRegistrationSchema, accountCreationSchema } from '../utils/validation';
import { Logger } from '../utils/logger';

const router = Router();
const userService = new UserService();
const logger = new Logger();

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Register new user
 *     description: Create a new user account
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Full name
 *               username:
 *                 type: string
 *                 description: Username (alphanumeric)
 *               password:
 *                 type: string
 *                 description: Password (min 6 characters)
 *             required:
 *               - name
 *               - username
 *               - password
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 *       409:
 *         description: Username already exists
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = userRegistrationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.details[0].message
      });
    }

    // Check if username already exists
    const existingUser = await userService.getUserByUsername(value.username);
    if (existingUser) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Username already exists'
      });
    }

    // Create user
    const user = await userService.createUser(value);
    
    // Remove password hash from response
    const { password_hash, ...userResponse } = user;
    
    res.status(201).json(userResponse);
  } catch (error) {
    logger.error('User registration error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred during user registration'
    });
  }
});

/**
 * @swagger
 * /users/current:
 *   get:
 *     summary: Get current user
 *     description: Get current authenticated user's information
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Authentication required
 */
router.get('/current', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await userService.getUserById(req.user!.id);
    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    // Remove password hash from response
    const { password_hash, ...userResponse } = user;
    
    res.json(userResponse);
  } catch (error) {
    logger.error('Get current user error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while retrieving user information'
    });
  }
});

/**
 * @swagger
 * /users/accounts:
 *   post:
 *     summary: Create new account
 *     description: Create a new account for the authenticated user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Account name
 *               currency:
 *                 type: string
 *                 description: Currency code (supported: EUR, USD, GBP, SEK, NOK, DKK)
 *                 enum: [EUR, USD, GBP, SEK, NOK, DKK]
 *             required:
 *               - name
 *               - currency
 *     responses:
 *       201:
 *         description: Account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Account'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 */
router.post('/accounts', authenticate, async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = accountCreationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.details[0].message
      });
    }

    const account = await userService.createAccount(req.user!.id, value.name, value.currency);
    
    res.status(201).json(account);
  } catch (error) {
    logger.error('Account creation error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while creating the account'
    });
  }
});

/**
 * @swagger
 * /users/accounts:
 *   get:
 *     summary: Get user accounts
 *     description: Get all accounts belonging to the authenticated user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Accounts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Account'
 *       401:
 *         description: Authentication required
 */
router.get('/accounts', authenticate, async (req: Request, res: Response) => {
  try {
    const accounts = await userService.getUserAccounts(req.user!.id);
    res.json(accounts);
  } catch (error) {
    logger.error('Get user accounts error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while retrieving accounts'
    });
  }
});

export { router as userRoutes };
