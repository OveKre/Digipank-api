import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { DatabaseManager } from '../database/databaseManager';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
  };
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Authentication Error',
        message: 'Missing or invalid authorization header'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify JWT token
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    
    // Check if session exists in database
    const databaseManager = DatabaseManager.getInstance();
    const db = databaseManager.getDatabase();
    const database = db.getDatabase();
    
    const session = await (database as any).getAsync(
      'SELECT * FROM sessions WHERE token = ? AND expires_at > datetime("now")',
      [token]
    );

    if (!session) {
      res.status(401).json({
        error: 'Authentication Error',
        message: 'Invalid or expired session'
      });
      return;
    }

    // Get user information
    const user = await (database as any).getAsync(
      'SELECT id, username FROM users WHERE id = ?',
      [session.user_id]
    );

    if (!user) {
      res.status(401).json({
        error: 'Authentication Error',
        message: 'User not found'
      });
      return;
    }

    // Add user to request object
    req.user = {
      id: user.id,
      username: user.username
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        error: 'Authentication Error',
        message: 'Invalid token'
      });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        error: 'Authentication Error',
        message: 'Token expired'
      });
      return;
    }

    next(error);
  }
}

// Type declaration for TypeScript
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
      };
    }
  }
}
