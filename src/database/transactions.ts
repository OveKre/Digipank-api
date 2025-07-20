import mysql from 'mysql2/promise';
import { DatabaseManager } from './databaseManager';
import { Logger } from '../utils/logger';

/**
 * Database Transaction Wrapper
 * Provides safe SQL transaction handling with BEGIN/COMMIT/ROLLBACK
 */
export class DatabaseTransaction {
  private logger = new Logger();
  private connection: mysql.Connection;

  constructor() {
    const databaseManager = DatabaseManager.getInstance();
    this.connection = databaseManager.getDatabase().getConnection();
  }

  /**
   * Execute multiple operations in a single transaction
   * Automatically handles BEGIN/COMMIT/ROLLBACK
   */
  async executeTransaction<T>(
    operations: (connection: mysql.Connection) => Promise<T>
  ): Promise<T> {
    this.logger.info('Starting database transaction...');
    
    try {
      // Start transaction
      await this.connection.execute('BEGIN');
      this.logger.debug('Transaction started (BEGIN)');
      
      // Execute operations
      const result = await operations(this.connection);
      
      // Commit if all operations succeed
      await this.connection.execute('COMMIT');
      this.logger.info('Transaction committed successfully');
      
      return result;
    } catch (error) {
      // Rollback on any error
      try {
        await this.connection.execute('ROLLBACK');
        this.logger.warn('Transaction rolled back due to error');
      } catch (rollbackError) {
        this.logger.error('Error during rollback:', rollbackError);
      }
      
      this.logger.error('Transaction failed:', error);
      throw error;
    }
  }

  /**
   * Example: Safe money transfer between accounts
   */
  async transferMoney(
    fromAccount: string,
    toAccount: string,
    amount: number,
    currency: string = 'EUR',
    description?: string
  ): Promise<{ success: boolean; transactionId?: string }> {
    return await this.executeTransaction(async (conn) => {
      // 1. Check sender account balance with row lock
      const [senderResult] = await conn.execute(
        'SELECT balance FROM accounts WHERE account_number = ? AND is_active = TRUE FOR UPDATE',
        [fromAccount]
      );
      
      const senderAccount = (senderResult as any)[0];
      if (!senderAccount) {
        throw new Error(`Sender account ${fromAccount} not found or inactive`);
      }
      
      if (senderAccount.balance < amount) {
        throw new Error(`Insufficient funds. Available: ${senderAccount.balance}, Required: ${amount}`);
      }

      // 2. Check receiver account exists
      const [receiverResult] = await conn.execute(
        'SELECT id FROM accounts WHERE account_number = ? AND is_active = TRUE',
        [toAccount]
      );
      
      if ((receiverResult as any).length === 0) {
        throw new Error(`Receiver account ${toAccount} not found or inactive`);
      }

      // 3. Deduct from sender account
      await conn.execute(
        'UPDATE accounts SET balance = balance - ?, updated_at = NOW() WHERE account_number = ?',
        [amount, fromAccount]
      );

      // 4. Add to receiver account
      await conn.execute(
        'UPDATE accounts SET balance = balance + ?, updated_at = NOW() WHERE account_number = ?',
        [amount, toAccount]
      );

      // 5. Create transaction record
      const transactionId = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;
      await conn.execute(
        `INSERT INTO transactions (
          id, from_account, to_account, amount, currency, 
          description, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'completed', NOW())`,
        [transactionId, fromAccount, toAccount, amount, currency, description || 'Internal transfer']
      );

      this.logger.info(`Money transfer completed: ${amount} ${currency} from ${fromAccount} to ${toAccount}`);
      
      return { success: true, transactionId };
    });
  }

  /**
   * Example: Batch operations with transaction safety
   */
  async batchOperations(operations: Array<{ sql: string; params: any[] }>): Promise<void> {
    return await this.executeTransaction(async (conn) => {
      for (const operation of operations) {
        await conn.execute(operation.sql, operation.params);
      }
      
      this.logger.info(`Executed ${operations.length} operations in transaction`);
    });
  }
}
