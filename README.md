# Digipank API

Modern Estonian digital banking API with MariaDB database and comprehensive authentication system.

## 🚀 Features

### User Management & Authentication
- ✅ User registration with role-based access control (Admin, User, Support, Auditor)
- ✅ Secure password hashing with bcrypt
- ✅ JWT-based session management
- ✅ Multi-factor authentication support
- ✅ User profile management with email and phone

### Account Management
- ✅ Multiple accounts per user with different currencies
- ✅ Account types: Checking, Savings, Credit, Business
- ✅ Unique account numbers with bank prefix
- ✅ Real-time balance updates
- ✅ Account activity tracking

### Transaction Processing
- ✅ Internal transactions between same bank accounts
- ✅ External transactions to other banks via JWT
- ✅ SQL transaction support (BEGIN/COMMIT/ROLLBACK)
- ✅ Transaction status tracking (Pending, Completed, Cancelled, Failed)
- ✅ Comprehensive transaction history
- ✅ Automatic refund on failed external transactions

### Central Bank Integration
- ✅ Bank registration with unique prefix (DIGI)
- ✅ JWT-signed data packets for inter-bank communication
- ✅ JWKS endpoint for public key distribution
- ✅ B2B transaction processing

### Database Management
- ✅ MariaDB with Docker containerization
- ✅ Database user management with role-based permissions
- ✅ Automated backup and restore functionality
- ✅ Maintenance operations and cleanup scripts
- ✅ Audit logging for all operations

### API Documentation
- ✅ SwaggerUI at /docs endpoint
- ✅ Complete API endpoint documentation
- ✅ Proper HTTP status codes
- ✅ Robust error handling
- ✅ Input validation with Joi

### Security Features
- ✅ Password hashing with bcrypt
- ✅ JWT token management
- ✅ Input validation and sanitization
- ✅ Role-based access control
- ✅ Audit logging
- ✅ SQL injection prevention

## 🛠 Technologies

- **Backend:** Node.js, TypeScript, Express.js
- **Database:** MariaDB 11+ with Docker
- **Authentication:** JWT (JSON Web Tokens), bcrypt
- **Documentation:** Swagger/OpenAPI 3.0
- **Validation:** Joi
- **Testing:** Jest
- **Security:** helmet, cors, rate limiting
- **Containerization:** Docker, Docker Compose

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- Docker and Docker Compose
- Git

### Setup

1. **Clone the repository:**
```bash
git clone https://github.com/OveKre/Digipank-api.git
cd Digipank-api
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment:**
```bash
cp .env.example .env
# Edit .env file according to your needs
```

4. **Start MariaDB with Docker:**
```bash
docker-compose up -d
```

5. **Initialize database:**
```bash
# Database tables and initial data will be created automatically
npm run dev
```

## 🔧 Configuration

### Environment Variables (.env)

```env
# Central Bank and Bank Configuration
CENTRAL_BANK_URL=https://api.testbank.ee
BANK_PREFIX=DIGI
BANK_NAME=Digipank
API_KEY=your-api-key

# Server Configuration
PORT=3001
NODE_ENV=development

# MariaDB Configuration
DB_HOST=localhost
DB_PORT=3309
DB_USER=root
DB_PASSWORD=admin123
DB_NAME=digipank

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# Docker MariaDB
MYSQL_ROOT_PASSWORD=admin123
MYSQL_DATABASE=digipank
MYSQL_USER=bankuser
MYSQL_PASSWORD=bankpass
```

### Docker Configuration

The project includes a complete Docker setup:

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Database backup
docker exec Mariadb-container mysqldump -u root -padmin123 digipank > backup.sql
```

## 🚀 Usage

### Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test
```

### API Endpoints

#### Authentication
- `POST /sessions` - User login
- `DELETE /sessions` - User logout

#### Users
- `POST /users` - User registration
- `GET /users/current` - Current user data
- `POST /users/accounts` - Create new account
- `GET /users/accounts` - List user accounts

#### Accounts
- `GET /accounts/{id}/balance` - Account balance
- `GET /accounts/{id}/transactions` - Account transactions

#### Transactions
- `POST /transactions` - Create new transaction
- `GET /transactions/{id}` - Transaction details

#### B2B (Inter-bank)
- `POST /transactions/b2b` - Receive external transaction

#### Security
- `GET /jwks.json` - JWKS public keys

### API Documentation

Interactive API documentation is available at: `http://localhost:3001/docs`

## 🏗 Architecture

```
Digipank-api/
├── src/
│   ├── config/          # Configuration management
│   ├── database/        # Database connection and management
│   │   ├── database.ts      # Main database setup
│   │   ├── databaseManager.ts # Connection manager
│   │   └── transactions.ts   # SQL transaction wrapper
│   ├── middleware/      # Express middleware
│   ├── routes/          # API route handlers
│   ├── services/        # Business logic layer
│   │   ├── authService.ts       # Authentication
│   │   ├── userService.ts       # User management
│   │   ├── transactionService.ts # Transaction processing
│   │   ├── maintenanceService.ts # Database maintenance
│   │   └── externalTransactionService.ts # Inter-bank
│   ├── types/          # TypeScript type definitions
│   └── utils/          # Utility functions
├── scripts/            # Database management scripts
│   ├── database-users.sql   # User creation
│   ├── backup.sh           # Backup script
│   └── maintenance.sql     # Maintenance queries
├── docs/              # Documentation
│   └── database-management.md
├── docker-compose.yml # Docker configuration
└── DATABASE_SETUP.md  # Database setup guide
```

## 🗄 Database Schema

### Core Tables (English naming):
- `users` - User accounts with roles
- `accounts` - Bank accounts 
- `transactions` - All transactions
- `sessions` - User sessions
- `roles` - User roles (admin, user, support, auditor)
- `user_roles` - User-role assignments
- `audit_log` - System audit trail

### Backward Compatibility:
Estonian aliases are maintained for backward compatibility via TypeScript type aliases.

## 🔒 Security

### Role-Based Access Control
- **Admin:** Full system access
- **User:** Personal account access only
- **Support:** Read-only customer support access
- **Auditor:** Read-only audit access

### Database Security
- Separate database users with minimal required permissions
- SQL injection prevention
- Transaction rollback on errors
- Audit logging for all operations

### Authentication Flow
1. User registers/logs in
2. JWT token issued with role information
3. Each request validates token and checks permissions
4. Operations logged in audit trail

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

## 📊 Monitoring & Maintenance

### Database Maintenance
```bash
# Run maintenance scripts
./scripts/backup.sh
./scripts/maintenance.sql

# View audit logs
SELECT * FROM audit_log ORDER BY created_date DESC LIMIT 100;

# Clean expired sessions
DELETE FROM sessions WHERE expires_date < NOW();
```

### Health Checks
- Database connection monitoring
- Transaction processing rates
- Failed authentication attempts
- System resource usage

## 🚀 Deployment

### Production Deployment

1. **Prepare environment:**
```bash
# Set production environment variables
export NODE_ENV=production
export DB_HOST=your-production-db-host
export JWT_SECRET=your-production-jwt-secret
```

2. **Database setup:**
```bash
# Create production database
# Run migration scripts
# Set up backup schedule
```

3. **Security checklist:**
- [ ] Change all default passwords
- [ ] Use HTTPS with valid SSL certificates
- [ ] Configure firewall rules
- [ ] Set up monitoring and alerting
- [ ] Enable audit logging
- [ ] Configure backup strategy

### Hetzner Server Deployment

The project is ready for deployment on Hetzner Cloud:

```bash
# Push to repository
git add .
git commit -m "Production ready - MariaDB migration complete"
git push origin main

# On server:
git pull
docker-compose up -d
npm run build
npm start
```

## 💰 Currency Format

**Important:** All amounts are stored in EUR with 2 decimal places:
- Database: `DECIMAL(15,2)` format
- API: Always in EUR (€)
- Display: `1000.00 EUR`

No currency conversion is needed as all operations are in EUR.

## 📋 Requirements Compliance

✅ **Academic Requirements Met:**
- SQL transactions (BEGIN/COMMIT/ROLLBACK) implemented
- User permission system with roles
- Database backup/restore functionality  
- Export/import capabilities
- DELETE operations with proper constraints
- Comprehensive documentation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 📞 Contact

- **GitHub:** [@OveKre](https://github.com/OveKre)
- **Repository:** [Digipank-api](https://github.com/OveKre/Digipank-api)

---

**Status:** ✅ Production Ready - All requirements implemented and tested


