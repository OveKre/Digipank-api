import { DatabaseManager } from '../database/databaseManager';
import { Transaction, TransactionStatus, Account } from '../types';
import { CryptoUtils } from '../utils/crypto';
import { Logger } from '../utils/logger';

export class TransactionService {
  private logger = new Logger();

  constructor() {
  }

  async createTransaction(
    accountFrom: string,
    accountTo: string,
    amount: number,
    currency: string,
    explanation?: string,
    senderName?: string
  ): Promise<Transaction> {
    try {
      const databaseManager = DatabaseManager.getInstance();
      const db = databaseManager.getDatabase();
      const database = db.getDatabase();
      const transactionId = CryptoUtils.generateId();

      // Create transaction record
      await (database as any).runAsync(
        'INSERT INTO transactions (id, account_from, account_to, amount, currency, explanation, sender_name, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [transactionId, accountFrom, accountTo, amount, currency, explanation, senderName, TransactionStatus.COMPLETED]
      );

      const transaction = await (database as any).getAsync(
        'SELECT * FROM transactions WHERE id = ?',
        [transactionId]
      );

      this.logger.info(`Transaction created: ${transactionId}`);
      return transaction;
    } catch (error) {
      this.logger.error('Error creating transaction:', error);
      throw error;
    }
  }

  async processInternalTransaction(transactionId: string): Promise<boolean> {
    try {
      const databaseManager = DatabaseManager.getInstance();
      const db = databaseManager.getDatabase();
      const database = db.getDatabase();

      // Get transaction details
      const transaction = await (database as any).getAsync(
        'SELECT * FROM transactions WHERE id = ?',
        [transactionId]
      );

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Update transaction status to in progress
      await (database as any).runAsync(
        'UPDATE transactions SET status = ? WHERE id = ?',
        [TransactionStatus.IN_PROGRESS, transactionId]
      );

      // Get account balances
      const fromAccount = await (database as any).getAsync(
        'SELECT * FROM accounts WHERE number = ?',
        [transaction.account_from]
      );

      const toAccount = await (database as any).getAsync(
        'SELECT * FROM accounts WHERE number = ?',
        [transaction.account_to]
      );

      if (!fromAccount || !toAccount) {
        await (database as any).runAsync(
          'UPDATE transactions SET status = ?, status_detail = ? WHERE id = ?',
          [TransactionStatus.FAILED, 'Account not found', transactionId]
        );
        return false;
      }

      // Check if sender has sufficient funds
      if (fromAccount.balance < transaction.amount) {
        await (database as any).runAsync(
          'UPDATE transactions SET status = ?, status_detail = ? WHERE id = ?',
          [TransactionStatus.FAILED, 'Insufficient funds', transactionId]
        );
        return false;
      }

      // Perform the transfer
      await (database as any).runAsync(
        'UPDATE accounts SET balance = balance - ? WHERE number = ?',
        [transaction.amount, transaction.account_from]
      );

      await (database as any).runAsync(
        'UPDATE accounts SET balance = balance + ? WHERE number = ?',
        [transaction.amount, transaction.account_to]
      );

      // Update transaction status to completed
      await (database as any).runAsync(
        'UPDATE transactions SET status = ? WHERE id = ?',
        [TransactionStatus.COMPLETED, transactionId]
      );

      this.logger.info(`Internal transaction processed: ${transactionId}`);
      return true;
    } catch (error) {
      this.logger.error('Error processing internal transaction:', error);
      
      // Update transaction status to failed
      const databaseManager = DatabaseManager.getInstance();
      const db = databaseManager.getDatabase();
      const database = db.getDatabase();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await (database as any).runAsync(
        'UPDATE transactions SET status = ?, status_detail = ? WHERE id = ?',
        [TransactionStatus.FAILED, errorMessage, transactionId]
      );
      
      throw error;
    }
  }

  async getAccountBalance(accountNumber: string): Promise<number> {
    try {
      const databaseManager = DatabaseManager.getInstance();
      const db = databaseManager.getDatabase();
      const database = db.getDatabase();
      
      const account = await (database as any).getAsync(
        'SELECT balance FROM accounts WHERE number = ?',
        [accountNumber]
      );

      return account ? account.balance : 0;
    } catch (error) {
      this.logger.error('Error getting account balance:', error);
      throw error;
    }
  }



  async getAccountTransactions(accountNumber: string, limit: number = 50): Promise<Transaction[]> {
    try {
      const databaseManager = DatabaseManager.getInstance();
      const db = databaseManager.getDatabase();
      const database = db.getDatabase();
      
      const transactions = await (database as any).allAsync(
        'SELECT * FROM transactions WHERE account_from = ? OR account_to = ? ORDER BY created_at DESC LIMIT ?',
        [accountNumber, accountNumber, limit]
      );

      return transactions || [];
    } catch (error) {
      this.logger.error('Error getting account transactions:', error);
      throw error;
    }
  }

  async getTransactionById(id: string): Promise<Transaction | null> {
    try {
      const databaseManager = DatabaseManager.getInstance();
      const db = databaseManager.getDatabase();
      const database = db.getDatabase();
      
      const transaction = await (database as any).getAsync(
        'SELECT * FROM transactions WHERE id = ?',
        [id]
      );

      return transaction;
    } catch (error) {
      this.logger.error('Error getting transaction by ID:', error);
      throw error;
    }
  }

  async updateTransactionStatus(id: string, status: TransactionStatus, statusDetail?: string): Promise<void> {
    try {
      const databaseManager = DatabaseManager.getInstance();
      const db = databaseManager.getDatabase();
      const database = db.getDatabase();
      
      await (database as any).runAsync(
        'UPDATE transactions SET status = ?, status_detail = ? WHERE id = ?',
        [status, statusDetail || null, id]
      );

      this.logger.info(`Transaction status updated: ${id} -> ${status}`);
    } catch (error) {
      this.logger.error('Error updating transaction status:', error);
      throw error;
    }
  }

  async getAccountByNumber(accountNumber: string): Promise<Account | null> {
    try {
      const databaseManager = DatabaseManager.getInstance();
      const db = databaseManager.getDatabase();
      const database = db.getDatabase();

      const account = await (database as any).getAsync(
        'SELECT * FROM accounts WHERE number = ?',
        [accountNumber]
      );

      return account;
    } catch (error) {
      this.logger.error('Error getting account by number:', error);
      throw error;
    }
  }

  async debitAccount(accountNumber: string, amount: number): Promise<void> {
    try {
      const databaseManager = DatabaseManager.getInstance();
      const db = databaseManager.getDatabase();
      const database = db.getDatabase();

      // Check if account has sufficient funds
      const account = await (database as any).getAsync(
        'SELECT balance FROM accounts WHERE number = ?',
        [accountNumber]
      );

      if (!account) {
        const error = new Error(`Account ${accountNumber} not found`) as any;
        error.statusCode = 404;
        error.error = 'Account Not Found';
        throw error;
      }

      if (account.balance < amount) {
        const error = new Error(`Insufficient funds. Available: ${account.balance.toFixed(2)} EUR, Required: ${amount.toFixed(2)} EUR`) as any;
        error.statusCode = 422;
        error.error = 'Insufficient Funds';
        throw error;
      }

      // Debit the amount from account
      await (database as any).runAsync(
        'UPDATE accounts SET balance = balance - ? WHERE number = ?',
        [amount, accountNumber]
      );

      this.logger.info(`Debited ${amount} EUR from account ${accountNumber}. Previous balance: ${account.balance}`);
    } catch (error) {
      this.logger.error('Error debiting account:', error);
      throw error;
    }
  }

  async creditAccount(accountNumber: string, amount: number): Promise<void> {
    try {
      const databaseManager = DatabaseManager.getInstance();
      const db = databaseManager.getDatabase();
      const database = db.getDatabase();

      // Check if account exists
      const account = await (database as any).getAsync(
        'SELECT balance FROM accounts WHERE number = ?',
        [accountNumber]
      );

      if (!account) {
        const error = new Error(`Account ${accountNumber} not found`) as any;
        error.statusCode = 404;
        error.error = 'Account Not Found';
        throw error;
      }

      // Credit the amount to account
      await (database as any).runAsync(
        'UPDATE accounts SET balance = balance + ? WHERE number = ?',
        [amount, accountNumber]
      );

      this.logger.info(`Credited ${amount} EUR to account ${accountNumber}. Previous balance: ${account.balance}`);
    } catch (error) {
      this.logger.error('Error crediting account:', error);
      throw error;
    }
  }
}
