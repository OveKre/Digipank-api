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
      const transactionId = CryptoUtils.generateId();

      // Create transaction record
      await db.query(
        'INSERT INTO transactions (id, from_account, to_account, amount, currency, description, sender_name, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [transactionId, accountFrom, accountTo, amount, currency, explanation || null, senderName || null, TransactionStatus.COMPLETED]
      );

      const transactions = await db.query(
        'SELECT * FROM transactions WHERE id = ?',
        [transactionId]
      );

      const transaction = transactions[0];

      this.logger.info(`Transaction created: ${transactionId}`);
      return transaction;
    } catch (error) {
      this.logger.error('Error creating transaction:', error);
      throw error;
    }
  }

  async processInternalTransaction(transactionId: string | number): Promise<boolean> {
    try {
      const databaseManager = DatabaseManager.getInstance();
      const db = databaseManager.getDatabase();

      // Get transaction details
      const transactions = await db.query(
        'SELECT * FROM transactions WHERE id = ?',
        [transactionId]
      );

      if (!transactions || transactions.length === 0) {
        throw new Error('Transaction not found');
      }

      const transaction = transactions[0];

      // Update transaction status to in progress
      await db.query(
        'UPDATE transactions SET status = ? WHERE id = ?',
        [TransactionStatus.PENDING, transactionId]
      );

      // Get account balances
      const fromAccounts = await db.query(
        'SELECT * FROM accounts WHERE account_number = ?',
        [transaction.from_account]
      );

      const toAccounts = await db.query(
        'SELECT * FROM accounts WHERE account_number = ?',
        [transaction.to_account]
      );

      const fromAccount = fromAccounts?.[0];
      const toAccount = toAccounts?.[0];

      if (!fromAccount || !toAccount) {
        await db.query(
          'UPDATE transactions SET status = ?, status_detail = ? WHERE id = ?',
          [TransactionStatus.FAILED, 'Account not found', transactionId]
        );
        return false;
      }

      // Check if sender has sufficient funds
      if (fromAccount.balance < transaction.amount) {
        await db.query(
          'UPDATE transactions SET status = ?, status_detail = ? WHERE id = ?',
          [TransactionStatus.FAILED, 'Insufficient funds', transactionId]
        );
        return false;
      }

      // Perform the transfer
      await db.query(
        'UPDATE accounts SET balance = balance - ? WHERE account_number = ?',
        [transaction.amount, transaction.from_account]
      );

      await db.query(
        'UPDATE accounts SET balance = balance + ? WHERE account_number = ?',
        [transaction.amount, transaction.to_account]
      );

      // Update transaction status to completed
      await db.query(
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await db.query(
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
      
      const accounts = await db.query(
        'SELECT balance FROM accounts WHERE account_number = ?',
        [accountNumber]
      );

      const account = accounts?.[0];
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
      
      const transactions = await db.query(
        'SELECT * FROM transactions WHERE from_account = ? OR to_account = ? ORDER BY created_at DESC LIMIT ?',
        [accountNumber, accountNumber, limit]
      );

      return transactions || [];
    } catch (error) {
      this.logger.error('Error getting account transactions:', error);
      throw error;
    }
  }

  async getTransactionById(id: string | number): Promise<Transaction | null> {
    try {
      const databaseManager = DatabaseManager.getInstance();
      const db = databaseManager.getDatabase();
      
      const transactions = await db.query(
        'SELECT * FROM transactions WHERE id = ?',
        [id]
      );

      return transactions?.[0] || null;
    } catch (error) {
      this.logger.error('Error getting transaction by ID:', error);
      throw error;
    }
  }

  async updateTransactionStatus(id: string | number, status: TransactionStatus, statusDetail?: string): Promise<void> {
    try {
      const databaseManager = DatabaseManager.getInstance();
      const db = databaseManager.getDatabase();
      
      await db.query(
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

      const accounts = await db.query(
        'SELECT * FROM accounts WHERE account_number = ?',
        [accountNumber]
      );

      return accounts?.[0] || null;
    } catch (error) {
      this.logger.error('Error getting account by number:', error);
      throw error;
    }
  }

  async debitAccount(accountNumber: string, amount: number): Promise<void> {
    try {
      const databaseManager = DatabaseManager.getInstance();
      const db = databaseManager.getDatabase();

      // Check if account has sufficient funds
      const accounts = await db.query(
        'SELECT balance FROM accounts WHERE account_number = ?',
        [accountNumber]
      );

      const account = accounts?.[0];

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
      await db.query(
        'UPDATE accounts SET balance = balance - ? WHERE account_number = ?',
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

      // Check if account exists
      const accounts = await db.query(
        'SELECT balance FROM accounts WHERE account_number = ?',
        [accountNumber]
      );

      const account = accounts?.[0];

      if (!account) {
        const error = new Error(`Account ${accountNumber} not found`) as any;
        error.statusCode = 404;
        error.error = 'Account Not Found';
        throw error;
      }

      // Credit the amount to account
      await db.query(
        'UPDATE accounts SET balance = balance + ? WHERE account_number = ?',
        [amount, accountNumber]
      );

      this.logger.info(`Credited ${amount} EUR to account ${accountNumber}. Previous balance: ${account.balance}`);
    } catch (error) {
      this.logger.error('Error crediting account:', error);
      throw error;
    }
  }
}
