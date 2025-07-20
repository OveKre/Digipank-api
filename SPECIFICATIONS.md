# Digipank API - Technical Specifications

## Overview

This document describes the technical specifications for Digipank API, a modern digital banking system with MariaDB backend and comprehensive role-based authentication system.

## System Architecture

### Technology Stack
- **Backend:** Node.js 18+, TypeScript 5+, Express.js 4+
- **Database:** MariaDB 11+ with Docker containerization
- **Authentication:** JWT with role-based access control
- **Security:** bcrypt password hashing, SQL injection prevention
- **Documentation:** OpenAPI 3.0 with SwaggerUI
- **Validation:** Joi schema validation
- **Testing:** Jest testing framework

### Database Architecture

#### Core Tables (English Schema)
```sql
-- Users table with role-based authentication
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Roles for access control
CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User role assignments
CREATE TABLE user_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    role_id INT NOT NULL,
    granter_id VARCHAR(50),
    granted_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_date TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (role_id) REFERENCES roles(id),
    FOREIGN KEY (granter_id) REFERENCES users(id)
);

-- Bank accounts with multiple currency support
CREATE TABLE accounts (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    account_number VARCHAR(20) UNIQUE NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    balance DECIMAL(15,2) DEFAULT 0.00,
    account_type ENUM('checking', 'savings', 'credit', 'business') DEFAULT 'checking',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Transactions with comprehensive tracking
CREATE TABLE transactions (
    id VARCHAR(50) PRIMARY KEY,
    sender_account VARCHAR(20) NOT NULL,
    receiver_account VARCHAR(20) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    transaction_type ENUM('transfer', 'deposit', 'withdrawal', 'payment', 'interest') DEFAULT 'transfer',
    description TEXT,
    sender_name VARCHAR(255),
    status ENUM('pending', 'completed', 'cancelled', 'failed') DEFAULT 'pending',
    status_details TEXT,
    reference_number VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Session management
CREATE TABLE sessions (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    token VARCHAR(500) NOT NULL,
    expires_date TIMESTAMP NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Audit logging
CREATE TABLE audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(50),
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### Backward Compatibility
Estonian aliases are maintained through TypeScript interfaces:
```typescript
// Estonian aliases for backward compatibility
export type Kasutaja = User;
export type Konto = Account;
export type Tehing = Transaction;
export type Sessioon = Session;
export const TOETAVAD_VALUUTAD = SUPPORTED_CURRENCIES;
```

## Authentication & Authorization

### Role-Based Access Control
- **Admin:** Full system access, user management, system configuration
- **User:** Personal account access, transaction creation, profile management
- **Support:** Read-only customer support access, transaction viewing
- **Auditor:** Read-only audit access, compliance reporting

### JWT Token Structure
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "userId": "user_123",
    "username": "john.doe",
    "roles": ["user"],
    "iat": 1641234567,
    "exp": 1641321967
  }
}
```

### Security Implementation
```typescript
// Password hashing
const passwordHash = await bcrypt.hash(password, 12);

// JWT token generation
const token = jwt.sign(
  { userId, username, roles },
  process.env.JWT_SECRET,
  { expiresIn: '24h' }
);

// Role validation middleware
const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.roles.some(role => roles.includes(role))) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};
```

## Inter-Bank Protocol

### JWT Token Format for External Transactions
```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT",
    "kid": "digi-bank-2025"
  },
  "payload": {
    "iss": "DIGI",
    "aud": "CENTRAL_BANK",
    "iat": 1641234567,
    "exp": 1641238167,
    "jti": "uuid-v4",
    "accountFrom": "DIGI1234567890",
    "accountTo": "SWED9876543210",
    "currency": "EUR",
    "amount": 100.50,
    "explanation": "Invoice payment",
    "senderName": "John Doe",
    "transactionId": "uuid-v4"
  }
}
```

## API Endpoints

### Core Banking APIs

#### Authentication
- `POST /sessions` - User login with username/password
- `DELETE /sessions` - User logout (invalidate session)

#### User Management  
- `POST /users` - User registration with role assignment
- `GET /users/current` - Current user profile and accounts
- `PUT /users/current` - Update user profile
- `POST /users/accounts` - Create new bank account
- `GET /users/accounts` - List user accounts

#### Account Operations
- `GET /accounts/{accountNumber}/balance` - Get account balance
- `GET /accounts/{accountNumber}/transactions` - Get transaction history
- `POST /accounts/{accountNumber}/freeze` - Freeze account (admin only)

#### Transaction Processing
- `POST /transactions` - Create new transaction (internal/external)
- `GET /transactions/{id}` - Get transaction details
- `PUT /transactions/{id}/status` - Update transaction status (admin only)

#### Inter-Bank Communication
- `POST /transactions/b2b` - Receive external transaction from central bank
- `GET /jwks.json` - Public keys for JWT verification

#### Administrative
- `GET /admin/users` - List all users (admin only)
- `GET /admin/transactions` - List all transactions (admin/auditor)
- `POST /admin/users/{id}/roles` - Assign user roles (admin only)

### Database Transaction Operations

All critical operations use SQL transactions for data integrity:

```typescript
// SQL Transaction wrapper
export class DatabaseTransaction {
  async executeTransaction<T>(
    operation: (connection: Connection) => Promise<T>
  ): Promise<T> {
    const connection = await this.pool.getConnection();
    await connection.beginTransaction();
    
    try {
      const result = await operation(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

// Usage example
await dbTransaction.executeTransaction(async (conn) => {
  // Debit sender account
  await conn.query(
    'UPDATE accounts SET balance = balance - ? WHERE account_number = ?',
    [amount, senderAccount]
  );
  
  // Credit receiver account  
  await conn.query(
    'UPDATE accounts SET balance = balance + ? WHERE account_number = ?',
    [amount, receiverAccount]
  );
  
  // Create transaction record
  await conn.query(
    'INSERT INTO transactions (...) VALUES (...)',
    [transactionData]
  );
});
```

## Security Specifications

### Password Security
- **Algorithm:** bcrypt with salt rounds = 12
- **Minimum length:** 8 characters
- **Complexity:** Mixed case, numbers, special characters recommended

### JWT Implementation
```typescript
// Token generation
const generateToken = (user: User): string => {
  return jwt.sign(
    {
      userId: user.id,
      username: user.username,
      roles: user.roles,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24h
    },
    process.env.JWT_SECRET,
    { algorithm: 'HS256' }
  );
};

// Token validation middleware
const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};
```

### Database Security
```sql
-- Create database users with minimal privileges
CREATE USER 'app_user'@'%' IDENTIFIED BY 'secure_password';
CREATE USER 'readonly_user'@'%' IDENTIFIED BY 'readonly_password';
CREATE USER 'backup_user'@'%' IDENTIFIED BY 'backup_password';

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE ON digipank.* TO 'app_user'@'%';
GRANT SELECT ON digipank.* TO 'readonly_user'@'%';
GRANT SELECT, LOCK TABLES ON digipank.* TO 'backup_user'@'%';

-- Revoke dangerous permissions
REVOKE DELETE ON digipank.* FROM 'app_user'@'%';
REVOKE DROP ON digipank.* FROM 'app_user'@'%';
```

## Error Handling Specifications

### HTTP Status Codes
- `200 OK` - Successful GET requests
- `201 Created` - Successful POST requests
- `400 Bad Request` - Validation errors
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `422 Unprocessable Entity` - Business logic errors
- `500 Internal Server Error` - System errors

### Error Response Format
```json
{
  "error": "Validation Error",
  "message": "Account number is required",
  "code": "MISSING_ACCOUNT_NUMBER",
  "timestamp": "2025-01-20T10:30:00Z",
  "requestId": "req_123456789"
}
```

### Error Categories
```typescript
export enum ErrorCodes {
  // Validation Errors (400)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  
  // Authentication Errors (401)
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  
  // Authorization Errors (403)
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  ACCOUNT_ACCESS_DENIED = 'ACCOUNT_ACCESS_DENIED',
  
  // Business Logic Errors (422)
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  ACCOUNT_FROZEN = 'ACCOUNT_FROZEN',
  INVALID_CURRENCY = 'INVALID_CURRENCY',
  
  // System Errors (500)
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR'
}
```

## Data Validation Specifications

### Input Validation with Joi
```typescript
// User registration schema
export const userRegistrationSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  username: Joi.string().alphanum().min(3).max(30).required(),
  password: Joi.string().min(8).pattern(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
  ).required(),
  email: Joi.string().email().optional(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional()
});

// Transaction schema
export const transactionSchema = Joi.object({
  accountFrom: Joi.string().pattern(/^DIGI\d{10}$/).required(),
  accountTo: Joi.string().pattern(/^[A-Z]{3,4}\d{10,}$/).required(),
  amount: Joi.number().positive().precision(2).max(1000000).required(),
  currency: Joi.string().valid('EUR', 'USD', 'GBP', 'SEK', 'NOK', 'DKK').default('EUR'),
  description: Joi.string().max(500).optional()
});
```

## Performance Specifications

### Database Optimization
```sql
-- Indexes for optimal performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_number ON accounts(account_number);
CREATE INDEX idx_transactions_sender ON transactions(sender_account);
CREATE INDEX idx_transactions_receiver ON transactions(receiver_account);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);
```

### Connection Pooling
```typescript
// MariaDB connection pool configuration
const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 20,
  acquireTimeout: 30000,
  timeout: 60000,
  leakDetectionTimeout: 60000
});
```

## Backup and Recovery Specifications

### Automated Backup Strategy
```bash
#!/bin/bash
# Daily backup script
BACKUP_DIR="/backups/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# Full database backup
docker exec Mariadb-container mysqldump \
  -u root -p$MYSQL_ROOT_PASSWORD \
  --single-transaction \
  --routines \
  --triggers \
  digipank > $BACKUP_DIR/full_backup.sql

# Incremental binary log backup
docker exec Mariadb-container mysqlbinlog \
  --start-datetime="$(date -d '1 day ago' '+%Y-%m-%d %H:%M:%S')" \
  /var/lib/mysql/mysql-bin.* > $BACKUP_DIR/incremental.sql

# Compress and encrypt
tar -czf $BACKUP_DIR/backup.tar.gz $BACKUP_DIR/*.sql
gpg --encrypt --recipient admin@digipank.ee $BACKUP_DIR/backup.tar.gz
```

### Recovery Procedures
```bash
# Point-in-time recovery
mysql -u root -p digipank < full_backup.sql
mysql -u root -p digipank < incremental.sql

# Table-specific recovery
mysql -u root -p digipank -e "
  DROP TABLE IF EXISTS transactions_backup;
  CREATE TABLE transactions_backup AS SELECT * FROM transactions;
"
```

## Monitoring and Logging Specifications

### Application Logging
```typescript
// Structured logging with Winston
import winston from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'digipank-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

// Audit logging
export const auditLogger = {
  logUserAction: async (userId: string, action: string, resource: string, details?: any) => {
    await db.query(`
      INSERT INTO audit_log (user_id, action, resource_type, resource_id, new_values, ip_address)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [userId, action, resource, details?.resourceId, JSON.stringify(details), details?.ipAddress]);
  }
};
```

### Health Check Endpoints
```typescript
// Health check implementation
app.get('/health', async (req, res) => {
  const checks = {
    database: await checkDatabaseConnection(),
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  };
  
  const status = checks.database ? 'healthy' : 'unhealthy';
  const httpStatus = status === 'healthy' ? 200 : 503;
  
  res.status(httpStatus).json({ status, checks });
});
```

## Deployment Specifications

### Docker Configuration
```yaml
# docker-compose.yml
version: '3.8'
services:
  digipank-api:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DB_HOST=mariadb
    depends_on:
      - mariadb
    restart: unless-stopped
    
  mariadb:
    image: mariadb:11
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ${MYSQL_DATABASE}
    volumes:
      - mariadb_data:/var/lib/mysql
      - ./backups:/backups
    ports:
      - "3309:3306"
    restart: unless-stopped

volumes:
  mariadb_data:
```

### Production Environment Variables
```env
# Production configuration
NODE_ENV=production
PORT=3001

# Database (production credentials)
DB_HOST=production-mariadb.internal
DB_PORT=3306
DB_USER=digipank_prod
DB_PASSWORD=very_secure_production_password
DB_NAME=digipank_prod

# Security (production secrets)
JWT_SECRET=ultra_secure_production_jwt_secret_key_2025
API_KEY=production_api_key_for_central_bank

# Central Bank (production URLs)
CENTRAL_BANK_URL=https://api.centralbank.ee
BANK_PREFIX=DIGI
BANK_NAME=Digipank
```

## Compliance and Legal Specifications

### GDPR Compliance
- Personal data encryption at rest and in transit
- Right to data portability implementation
- Data retention policies (7 years for financial records)
- User consent management
- Data anonymization for analytics

### Financial Regulations
- Transaction reporting to authorities
- Anti-money laundering (AML) checks
- Know Your Customer (KYC) verification
- PCI DSS compliance for payment processing
- SOX compliance for financial reporting

### Data Retention Policy
```sql
-- Automated data cleanup (run monthly)
-- Delete expired sessions
DELETE FROM sessions WHERE expires_date < DATE_SUB(NOW(), INTERVAL 30 DAY);

-- Archive old audit logs (keep 7 years)
INSERT INTO audit_log_archive 
SELECT * FROM audit_log 
WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 YEAR);

DELETE FROM audit_log 
WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 YEAR);
```

## Testing Specifications

### Test Coverage Requirements
- **Unit Tests:** Minimum 90% coverage
- **Integration Tests:** All API endpoints
- **End-to-End Tests:** Critical user journeys
- **Performance Tests:** Load testing for 1000+ concurrent users

### Test Categories
```typescript
// Unit test example
describe('UserService', () => {
  test('should create user with encrypted password', async () => {
    const userData = { username: 'test', password: 'Test123!@#' };
    const user = await userService.createUser(userData);
    
    expect(user.id).toBeDefined();
    expect(user.password_hash).not.toBe(userData.password);
    expect(await bcrypt.compare(userData.password, user.password_hash)).toBe(true);
  });
});

// Integration test example
describe('Authentication API', () => {
  test('POST /sessions should return JWT token', async () => {
    const response = await request(app)
      .post('/sessions')
      .send({ username: 'admin', password: 'admin123' })
      .expect(200);
      
    expect(response.body.token).toBeDefined();
    expect(response.body.user.username).toBe('admin');
  });
});
```

---

**Document Version:** 2.0  
**Last Updated:** January 20, 2025  
**Status:** Production Ready

This specification covers the complete technical implementation of Digipank API with MariaDB backend, role-based authentication, and comprehensive banking features.
