import { DatabaseManager } from '../database/databaseManager';
import { Session } from '../types';
import { CryptoUtils } from '../utils/crypto';
import { Logger } from '../utils/logger';
import { UserService } from './userService';

export class AuthService {
  private logger = new Logger();

  constructor() {
  }

  async login(username: string, password: string): Promise<string | null> {
    try {
      const userService = new UserService();
      
      // Validate user credentials
      const user = await userService.validatePassword(username, password);
      if (!user) {
        return null;
      }

      // Generate JWT token
      const token = CryptoUtils.generateToken({
        userId: user.id,
        username: user.username
      });

      // Store session in database
      const sessionId = CryptoUtils.generateId();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now

      const databaseManager = DatabaseManager.getInstance();
      const db = databaseManager.getDatabase();
      await db.query(
        'INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
        [sessionId, user.id, token, expiresAt]
      );

      this.logger.info(`User logged in: ${username}`);
      return token;
    } catch (error) {
      this.logger.error('Error during login:', error);
      throw error;
    }
  }

  async logout(token: string): Promise<void> {
    try {
      const databaseManager = DatabaseManager.getInstance();
      const db = databaseManager.getDatabase();
      
      // Remove session from database
      await db.query(
        'DELETE FROM sessions WHERE token = ?',
        [token]
      );

      this.logger.info('User logged out');
    } catch (error) {
      this.logger.error('Error during logout:', error);
      throw error;
    }
  }

  async validateSession(token: string): Promise<Session | null> {
    try {
      const databaseManager = DatabaseManager.getInstance();
      const db = databaseManager.getDatabase();
      
      const sessions = await db.query(
        'SELECT * FROM sessions WHERE token = ? AND expires_at > NOW()',
        [token]
      );

      return sessions?.[0] || null;
    } catch (error) {
      this.logger.error('Error validating session:', error);
      throw error;
    }
  }

  async cleanupExpiredSessions(): Promise<void> {
    try {
      const databaseManager = DatabaseManager.getInstance();
      const db = databaseManager.getDatabase();
      
      await db.query(
        'DELETE FROM sessions WHERE expires_at <= NOW()'
      );

      this.logger.info('Expired sessions cleaned up');
    } catch (error) {
      this.logger.error('Error cleaning up expired sessions:', error);
      throw error;
    }
  }
}
