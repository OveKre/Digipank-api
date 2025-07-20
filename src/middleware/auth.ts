import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { DatabaseManager } from '../database/databaseManager';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    roles?: string[];
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
    
    const sessions = await db.query(
      'SELECT * FROM sessions WHERE token = ? AND expires_at > NOW()',
      [token]
    );

    const session = sessions?.[0];

    if (!session) {
      res.status(401).json({
        error: 'Authentication Error',
        message: 'Invalid or expired session'
      });
      return;
    }

    // Get user information with roles
    const users = await db.query(
      `SELECT u.id, u.username, GROUP_CONCAT(r.role_name) as roles 
       FROM users u 
       LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = TRUE
       LEFT JOIN roles r ON ur.role_id = r.id 
       WHERE u.id = ? 
       GROUP BY u.id`,
      [session.user_id]
    );

    const user = users?.[0];

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
      username: user.username,
      roles: user.roles ? user.roles.split(',') : []
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

// Authorization middleware for role-based access control
export function authorize(requiredRoles: string | string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authorization Error',
        message: 'User not authenticated'
      });
      return;
    }

    const userRoles = req.user.roles || [];
    const rolesArray = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

    // Check if user has any of the required roles
    const hasRequiredRole = rolesArray.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      res.status(403).json({
        error: 'Authorization Error',
        message: `Access denied. Required roles: ${rolesArray.join(', ')}. User roles: ${userRoles.join(', ')}`
      });
      return;
    }

    next();
  };
}

// Helper functions for specific role checks
export const requireAdmin = authorize('admin');
export const requireUser = authorize(['admin', 'user']);
export const requireSupport = authorize(['admin', 'support']);
export const requireAuditor = authorize(['admin', 'auditor']);

// Type declaration for TypeScript
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        roles?: string[];
      };
    }
  }
}
