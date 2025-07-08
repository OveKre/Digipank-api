import { DatabaseManager } from '../database/databaseManager';
import { User, UserRegistration, Account } from '../types';
import { CryptoUtils } from '../utils/crypto';
import { Logger } from '../utils/logger';

export class UserService {
  private logger = new Logger();

  constructor() {
  }

  async createUser(userData: UserRegistration): Promise<User> {
    try {
      const databaseManager = DatabaseManager.getInstance();
      const db = databaseManager.getDatabase();
      const database = db.getDatabase();
      const userId = CryptoUtils.generateId();
      
      // Hash password
      const passwordHash = await CryptoUtils.hashPassword(userData.password);
      
      // Create user
      await (database as any).runAsync(
        'INSERT INTO users (id, name, username, password_hash) VALUES (?, ?, ?, ?)',
        [userId, userData.name, userData.username, passwordHash]
      );

      // Create default account
      const accountId = CryptoUtils.generateId();
      const accountNumber = CryptoUtils.generateAccountNumber();
      
      await (database as any).runAsync(
        'INSERT INTO accounts (id, user_id, name, number, currency, balance) VALUES (?, ?, ?, ?, ?, ?)',
        [accountId, userId, 'Main Account', accountNumber, 'EUR', 100000] // 1000 eurot sentides
      );

      // Return user with accounts
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('Failed to create user');
      }

      this.logger.info(`User created: ${userData.username}`);
      return user;
    } catch (error) {
      this.logger.error('Error creating user:', error);
      throw error;
    }
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      const databaseManager = DatabaseManager.getInstance();
      const db = databaseManager.getDatabase();
      const database = db.getDatabase();
      
      const user = await (database as any).getAsync(
        'SELECT id, name, username, created_at FROM users WHERE id = ?',
        [id]
      );

      if (!user) {
        return null;
      }

      // Get user's accounts
      const accounts = await (database as any).allAsync(
        'SELECT id, name, number, currency, balance, created_at FROM accounts WHERE user_id = ?',
        [id]
      );

      return {
        ...user,
        accounts: accounts || []
      };
    } catch (error) {
      this.logger.error('Error getting user by ID:', error);
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | null> {
    try {
      const databaseManager = DatabaseManager.getInstance();
      const db = databaseManager.getDatabase();
      const database = db.getDatabase();
      
      const user = await (database as any).getAsync(
        'SELECT id, name, username, password_hash, created_at FROM users WHERE username = ?',
        [username]
      );

      if (!user) {
        return null;
      }

      // Get user's accounts
      const accounts = await (database as any).allAsync(
        'SELECT id, name, number, currency, balance, created_at FROM accounts WHERE user_id = ?',
        [user.id]
      );

      return {
        ...user,
        accounts: accounts || []
      };
    } catch (error) {
      this.logger.error('Error getting user by username:', error);
      throw error;
    }
  }

  async validatePassword(username: string, password: string): Promise<User | null> {
    try {
      const databaseManager = DatabaseManager.getInstance();
      const db = databaseManager.getDatabase();
      const database = db.getDatabase();
      
      const user = await (database as any).getAsync(
        'SELECT id, name, username, password_hash FROM users WHERE username = ?',
        [username]
      );

      if (!user) {
        return null;
      }

      const isValid = await CryptoUtils.comparePassword(password, user.password_hash);
      if (!isValid) {
        return null;
      }

      // Get user's accounts
      const accounts = await (database as any).allAsync(
        'SELECT id, name, number, currency, balance, created_at FROM accounts WHERE user_id = ?',
        [user.id]
      );

      return {
        id: user.id,
        name: user.name,
        username: user.username,
        accounts: accounts || []
      };
    } catch (error) {
      this.logger.error('Error validating password:', error);
      throw error;
    }
  }

  async createAccount(userId: string, name: string, currency: string): Promise<Account> {
    try {
      const databaseManager = DatabaseManager.getInstance();
      const db = databaseManager.getDatabase();
      const database = db.getDatabase();
      const accountId = CryptoUtils.generateId();
      const accountNumber = CryptoUtils.generateAccountNumber();
      
      await (database as any).runAsync(
        'INSERT INTO accounts (id, user_id, name, number, currency, balance) VALUES (?, ?, ?, ?, ?, ?)',
        [accountId, userId, name, accountNumber, currency, 100000] // 1000 eurot sentides
      );

      const account = await (database as any).getAsync(
        'SELECT * FROM accounts WHERE id = ?',
        [accountId]
      );

      this.logger.info(`Account created: ${accountNumber} for user ${userId}`);
      return account;
    } catch (error) {
      this.logger.error('Error creating account:', error);
      throw error;
    }
  }

  async getUserAccounts(userId: string): Promise<Account[]> {
    try {
      const databaseManager = DatabaseManager.getInstance();
      const db = databaseManager.getDatabase();
      const database = db.getDatabase();
      
      const accounts = await (database as any).allAsync(
        'SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );

      return accounts || [];
    } catch (error) {
      this.logger.error('Error getting user accounts:', error);
      throw error;
    }
  }
}
