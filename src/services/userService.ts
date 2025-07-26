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
      const userId = CryptoUtils.generateId();
      
      // Hash password
      const passwordHash = await CryptoUtils.hashPassword(userData.password);
      
      // Create user
      await db.query(
        'INSERT INTO users (id, name, username, password_hash, is_active) VALUES (?, ?, ?, ?, ?)',
        [userId, userData.name, userData.username, passwordHash, true]
      );

      // Create default account
      const accountId = CryptoUtils.generateId();
      const accountNumber = CryptoUtils.generateAccountNumber();
      
      await db.query(
        'INSERT INTO accounts (id, user_id, name, account_number, currency, balance) VALUES (?, ?, ?, ?, ?, ?)',
        [accountId, userId, 'Main Account', accountNumber, 'EUR', 1000.00] // 1000 eurot
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
      
      const users = await db.query(
        'SELECT id, name, username, is_active, created_at FROM users WHERE id = ?',
        [id]
      );

      if (!users || users.length === 0) {
        return null;
      }

      const user = users[0];

      // Get user's accounts
      const accounts = await db.query(
        'SELECT id, name, account_number as number, currency, balance, created_at FROM accounts WHERE user_id = ?',
        [id]
      );

      return {
        id: user.id,
        name: user.name,
        username: user.username,
        is_active: user.is_active || true,
        created_date: user.created_at,
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
      
      const users = await db.query(
        'SELECT id, name, username, password_hash, is_active, created_at FROM users WHERE username = ?',
        [username]
      );

      if (!users || users.length === 0) {
        return null;
      }

      const user = users[0];

      // Get user's accounts
      const accounts = await db.query(
        'SELECT id, name, account_number as number, currency, balance, created_at FROM accounts WHERE user_id = ?',
        [user.id]
      );

      return {
        id: user.id,
        name: user.name,
        username: user.username,
        password_hash: user.password_hash,
        is_active: user.is_active || true,
        created_date: user.created_at,
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
      
      const users = await db.query(
        'SELECT id, name, username, password_hash FROM users WHERE username = ?',
        [username]
      );

      if (!users || users.length === 0) {
        return null;
      }

      const user = users[0];

      const isValid = await CryptoUtils.comparePassword(password, user.password_hash);
      if (!isValid) {
        return null;
      }

      // Get user's accounts
      const accounts = await db.query(
        'SELECT id, name, account_number as number, currency, balance, created_at FROM accounts WHERE user_id = ?',
        [user.id]
      );

      return {
        id: user.id,
        name: user.name,
        username: user.username,
        is_active: user.is_active || true,
        created_date: user.created_at,
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
      const accountId = CryptoUtils.generateId();
      const accountNumber = CryptoUtils.generateAccountNumber();
      
      await db.query(
        'INSERT INTO accounts (id, user_id, name, account_number, currency, balance) VALUES (?, ?, ?, ?, ?, ?)',
        [accountId, userId, name, accountNumber, currency, 1000.0] // 1000 eurot
      );

      const accounts = await db.query(
        'SELECT * FROM accounts WHERE id = ?',
        [accountId]
      );

      const account = accounts[0];

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
      
      const accounts = await db.query(
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
