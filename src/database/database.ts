import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { config } from '../config/config';
import { Logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

export class Database {
  private db: sqlite3.Database | null = null;
  private logger = new Logger();

  constructor() {
    sqlite3.verbose();
  }

  async initialize(): Promise<void> {
    try {
      // Ensure database directory exists
      const dbDir = path.dirname(config.databasePath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this.db = new sqlite3.Database(config.databasePath);
      
      // Promisify database methods
      const run = promisify(this.db.run.bind(this.db));
      const all = promisify(this.db.all.bind(this.db));
      const get = promisify(this.db.get.bind(this.db));

      // Add methods to the database instance
      (this.db as any).runAsync = run;
      (this.db as any).allAsync = all;
      (this.db as any).getAsync = get;

      await this.createTables();
      this.logger.info('Database initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createAccountsTable = `
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        number TEXT UNIQUE NOT NULL,
        currency TEXT NOT NULL,
        balance INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `;

    const createTransactionsTable = `
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        account_from TEXT NOT NULL,
        account_to TEXT NOT NULL,
        amount INTEGER NOT NULL,
        currency TEXT NOT NULL,
        explanation TEXT,
        sender_name TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        status_detail TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createSessionsTable = `
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `;

    await (this.db as any).runAsync(createUsersTable);
    await (this.db as any).runAsync(createAccountsTable);
    await (this.db as any).runAsync(createTransactionsTable);
    await (this.db as any).runAsync(createSessionsTable);

    // Create indexes
    await (this.db as any).runAsync('CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id)');
    await (this.db as any).runAsync('CREATE INDEX IF NOT EXISTS idx_transactions_account_from ON transactions(account_from)');
    await (this.db as any).runAsync('CREATE INDEX IF NOT EXISTS idx_transactions_account_to ON transactions(account_to)');
    await (this.db as any).runAsync('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)');
  }

  getDatabase(): sqlite3.Database {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  async close(): Promise<void> {
    if (this.db) {
      await new Promise<void>((resolve, reject) => {
        this.db!.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
      this.db = null;
    }
  }
}
