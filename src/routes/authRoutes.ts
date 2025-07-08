import { Router, Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { userLoginSchema } from '../utils/validation';
import { Logger } from '../utils/logger';

const router = Router();
const authService = new AuthService();
const logger = new Logger();

/**
 * @swagger
 * /sessions:
 *   post:
 *     summary: User login
 *     description: Authenticate user and create session
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: Username
 *               password:
 *                 type: string
 *                 description: Password
 *             required:
 *               - username
 *               - password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT token
 *       401:
 *         description: Invalid credentials
 *       400:
 *         description: Validation error
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = userLoginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.details[0].message
      });
    }

    const { username, password } = value;

    // Attempt login
    const token = await authService.login(username, password);
    if (!token) {
      return res.status(401).json({
        error: 'Authentication Error',
        message: 'Invalid username or password'
      });
    }

    res.json({ token });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred during login'
    });
  }
});

/**
 * @swagger
 * /sessions:
 *   delete:
 *     summary: User logout
 *     description: Logout user and invalidate session
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Authentication required
 */
router.delete('/', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication Error',
        message: 'Missing or invalid authorization header'
      });
    }

    const token = authHeader.substring(7);
    await authService.logout(token);

    res.json({ message: 'Logout successful' });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred during logout'
    });
  }
});

export { router as authRoutes };
