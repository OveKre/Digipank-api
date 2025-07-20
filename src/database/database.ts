import mysql from 'mysql2/promise';
import { config } from '../config/config';
import { Logger } from '../utils/logger';

export class Database {
  private connection: mysql.Connection | null = null;
  private logger = new Logger();

  constructor() {
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Connecting to database...');
      this.connection = await mysql.createConnection({
        host: config.database.host,
        port: config.database.port,
        user: config.database.user,
        password: config.database.password,
        database: config.database.name,
        timezone: '+00:00'
      });

      this.logger.info(`Connected to MariaDB at ${config.database.host}:${config.database.port}, database: ${config.database.name}`);
      
      await this.createTables();
      this.logger.info('Database initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    // 1. ROLES TABLE
    const createRolesTable = `
      CREATE TABLE IF NOT EXISTS roles (
        id INT PRIMARY KEY AUTO_INCREMENT,
        role_name VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 2. USERS TABLE
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE,
        phone VARCHAR(20),
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_username (username),
        INDEX idx_email (email)
      )
    `;

    // 3. ACCOUNTS TABLE
    const createAccountsTable = `
      CREATE TABLE IF NOT EXISTS accounts (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        account_number VARCHAR(30) UNIQUE NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
        balance DECIMAL(15,2) DEFAULT 0.00,
        account_type ENUM('checking', 'savings', 'credit', 'business') DEFAULT 'checking',
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_account_number (account_number)
      )
    `;

    // 4. TRANSACTIONS TABLE
    const createTransactionsTable = `
      CREATE TABLE IF NOT EXISTS transactions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        from_account VARCHAR(30) NOT NULL,
        to_account VARCHAR(30) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
        transaction_type ENUM('transfer', 'deposit', 'withdrawal', 'payment', 'interest') DEFAULT 'transfer',
        description TEXT,
        sender_name VARCHAR(100),
        status ENUM('pending', 'completed', 'cancelled', 'failed') DEFAULT 'completed',
        status_details VARCHAR(500),
        reference_number VARCHAR(50),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        INDEX idx_from_account (from_account),
        INDEX idx_to_account (to_account),
        INDEX idx_created_at (created_at),
        INDEX idx_status (status),
        
        CONSTRAINT chk_positive_amount CHECK (amount > 0)
      )
    `;

    // 5. SESSIONS TABLE
    const createSessionsTable = `
      CREATE TABLE IF NOT EXISTS sessions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        ip_address VARCHAR(45),
        user_agent VARCHAR(500),
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_token (token),
        INDEX idx_expires_at (expires_at)
      )
    `;

    // 6. USER ROLES TABLE
    const createUserRolesTable = `
      CREATE TABLE IF NOT EXISTS user_roles (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        role_id INT NOT NULL,
        granted_by INT,
        granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (role_id) REFERENCES roles(id),
        FOREIGN KEY (granted_by) REFERENCES users(id),
        UNIQUE KEY unique_user_role (user_id, role_id),
        INDEX idx_user_id (user_id),
        INDEX idx_role_id (role_id)
      )
    `;

    // 7. AUDIT LOG TABLE
    const createAuditLogTable = `
      CREATE TABLE IF NOT EXISTS audit_log (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT,
        action VARCHAR(50) NOT NULL,
        resource_type VARCHAR(50) NOT NULL,
        resource_id VARCHAR(50),
        old_values JSON,
        new_values JSON,
        ip_address VARCHAR(45),
        user_agent VARCHAR(500),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_action (action),
        INDEX idx_created_at (created_at),
        INDEX idx_resource_type (resource_type)
      )
    `;

    // Tabelite loomine
    this.logger.info('Creating database tables...');
    await this.connection!.execute(createRolesTable);
    this.logger.info('Created table: roles');
    
    await this.connection!.execute(createUsersTable);
    this.logger.info('Created table: users');
    
    await this.connection!.execute(createAccountsTable);
    this.logger.info('Created table: accounts');
    
    await this.connection!.execute(createTransactionsTable);
    this.logger.info('Created table: transactions');
    
    await this.connection!.execute(createSessionsTable);
    this.logger.info('Created table: sessions');
    
    await this.connection!.execute(createUserRolesTable);
    this.logger.info('Created table: user_roles');
    
    await this.connection!.execute(createAuditLogTable);
    this.logger.info('Created table: audit_log');

    // Jõudluse parandamiseks lisaindeksid
    this.logger.info('Creating additional indexes...');
    await this.connection!.execute('CREATE INDEX IF NOT EXISTS idx_transactions_date_status ON transactions(created_at, status)');
    await this.connection!.execute('CREATE INDEX IF NOT EXISTS idx_audit_log_compound ON audit_log(user_id, action, created_at)');

    // Vaadete loomine
    this.logger.info('Creating views...');
    await this.createViews();
    
    // Algandmete sisestamine
    this.logger.info('Inserting initial data...');
    await this.insertInitialData();
    
    this.logger.info('All database tables and views created successfully');
  }

  private async createViews(): Promise<void> {
    // View for displaying users with their roles
    const createUsersWithRolesView = `
      CREATE OR REPLACE VIEW users_with_roles AS
      SELECT 
        u.id,
        u.name,
        u.username,
        u.email,
        GROUP_CONCAT(r.role_name) AS roles,
        u.is_active,
        u.created_at
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = TRUE
      LEFT JOIN roles r ON ur.role_id = r.id
      GROUP BY u.id
    `;

    // View for account summary information
    const createAccountSummaryView = `
      CREATE OR REPLACE VIEW account_summary AS
      SELECT 
        u.id,
        u.name AS user_name,
        a.name AS account_name,
        a.account_number,
        a.balance,
        a.account_type,
        (SELECT COUNT(*) FROM transactions t1 WHERE a.account_number = t1.from_account) +
        (SELECT COUNT(*) FROM transactions t2 WHERE a.account_number = t2.to_account) AS transaction_count
      FROM users u
      JOIN accounts a ON u.id = a.user_id
      WHERE a.is_active = TRUE
    `;

    await this.connection!.execute(createUsersWithRolesView);
    this.logger.info('Created view: users_with_roles');
    
    await this.connection!.execute(createAccountSummaryView);
    this.logger.info('Created view: account_summary');
  }

  private async insertInitialData(): Promise<void> {
    // Check if roles already exist
    const [existingRoles] = await this.connection!.execute('SELECT COUNT(*) as count FROM roles');
    if ((existingRoles as any)[0].count === 0) {
      // Insert initial roles
      const insertRoles = `
        INSERT INTO roles (role_name, description) VALUES
        ('admin', 'System administrator - full access'),
        ('user', 'Regular bank client - account management and transactions'),
        ('support', 'Customer support - limited access'),
        ('auditor', 'Auditor - read-only access for auditing')
      `;
      await this.connection!.execute(insertRoles);
      this.logger.info('Inserted initial roles into roles table');
    } else {
      this.logger.info('Roles already exist, skipping initial data insertion');
    }

    // Check if admin user already exists
    await this.createAdminUser();
  }

  private async createAdminUser(): Promise<void> {
    const [existingAdmin] = await this.connection!.execute(
      'SELECT COUNT(*) as count FROM users WHERE username = ?',
      ['admin']
    );
    
    if ((existingAdmin as any)[0].count === 0) {
      // Password: admin123 - hash it
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash('admin123', 12);
      
      // Create admin user
      const [result] = await this.connection!.execute(
        `INSERT INTO users (name, username, password_hash, email, is_active) 
         VALUES (?, ?, ?, ?, ?)`,
        ['System Administrator', 'admin', passwordHash, 'admin@digipank.ee', true]
      );
      
      const adminId = (result as any).insertId;
      
      // Assign admin role (role ID 1 is admin)
      await this.connection!.execute(
        `INSERT INTO user_roles (user_id, role_id, granted_by, is_active) 
         VALUES (?, ?, ?, ?)`,
        [adminId, 1, adminId, true]
      );
      
      // Create admin account
      const accountNumber = this.generateAccountNumber();
      await this.connection!.execute(
        `INSERT INTO accounts (user_id, name, account_number, currency, balance, account_type, is_active) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [adminId, 'Admin Main Account', accountNumber, 'EUR', 10000.00, 'checking', true]
      );
      
      this.logger.info(`Admin user created successfully:`);
      this.logger.info(`  Username: admin`);
      this.logger.info(`  Password: admin123`);
      this.logger.info(`  Email: admin@digipank.ee`);
      this.logger.info(`  Account: ${accountNumber}`);
      this.logger.info(`  Balance: 10,000.00 EUR`);
    } else {
      this.logger.info('Admin user already exists, skipping creation');
    }
  }

  private generateAccountNumber(): string {
    // Eesti pangakonto number format: EE + 2 kontrollinumbrit + 16 numbrit
    const bankCode = '05b'; // Digipank
    const random = Math.floor(Math.random() * 10000000000000).toString().padStart(13, '0');
    return `EE21${bankCode}${random}`;
  }

  getConnection(): mysql.Connection {
    if (!this.connection) {
      throw new Error('Database not initialized');
    }
    return this.connection;
  }

  async query(sql: string, values?: any[]): Promise<any> {
    if (!this.connection) {
      throw new Error('Database not initialized');
    }
    const [rows] = await this.connection.execute(sql, values);
    return rows;
  }

  async close(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
  }
}
