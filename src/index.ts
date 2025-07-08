import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/config';
import { DatabaseManager } from './database/databaseManager';
import { Logger } from './utils/logger';
import { swaggerSpec } from './config/swagger';
import { errorHandler } from './middleware/errorHandler';
import { authRoutes } from './routes/authRoutes';
import { userRoutes } from './routes/userRoutes';
import { accountRoutes } from './routes/accountRoutes';
import { transactionRoutes } from './routes/transactionRoutes';
import { b2bRoutes } from './routes/b2bRoutes';
import { jwksRoutes } from './routes/jwksRoutes';

const app = express();
const logger = new Logger();

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API documentation
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API routes
app.use('/sessions', authRoutes);
app.use('/users', userRoutes);
app.use('/accounts', accountRoutes);
app.use('/transactions', transactionRoutes);
app.use('/transactions/b2b', b2bRoutes);
app.use('/jwks.json', jwksRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
});

async function startServer() {
  try {
    // Initialize database
    const databaseManager = DatabaseManager.getInstance();
    await databaseManager.initialize();
    
    // Start server
    const port = config.port;
    app.listen(port, () => {
      logger.info(`Server running on port ${port}`);
      logger.info(`API documentation available at http://localhost:${port}/docs`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer();
