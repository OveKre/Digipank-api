import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server configuration
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Bank configuration
  bankPrefix: process.env.BANK_PREFIX || '05b',
  bankName: process.env.BANK_NAME || 'Digipank',
  centralBankUrl: process.env.CENTRAL_BANK_URL || 'https://henno.cfd/central-bank/',
  centralBankApiKey: process.env.API_KEY || '',
  
  // Database configuration
  databasePath: process.env.DATABASE_PATH || './bank.db',
  
  // JWT configuration
  jwtSecret: process.env.JWT_SECRET || 'default-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  
  // Cryptography
  privateKeyPath: process.env.PRIVATE_KEY_PATH || './keys/private.pem',
  publicKeyPath: process.env.PUBLIC_KEY_PATH || './keys/public.pem',
  
  // Rate limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info'
};
