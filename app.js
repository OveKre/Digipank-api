const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { setupSwagger } = require('./config/swagger');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const accountRoutes = require('./routes/accountRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const centralBankRoutes = require('./routes/centralBankRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Setup Swagger
setupSwagger(app);

// Routes
app.use('/auth', authRoutes);
app.use('/accounts', accountRoutes);
app.use('/transactions', transactionRoutes);
app.use('/central-bank', centralBankRoutes);

// Base route
app.get('/', (req, res) => {
  res.json({
    name: process.env.BANK_NAME,
    message: 'Welcome to DigiPank API!',
    documentation: '/docs'
  });
});

// Error handling middleware
app.use(errorHandler);

module.exports = app;