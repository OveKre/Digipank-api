/**
 * Error handling middleware
 */
const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Server error';
    
    console.error(`Error: ${message}`);
    console.error(err.stack);
    
    res.status(statusCode).json({
      error: {
        message,
        status: statusCode,
        timestamp: new Date().toISOString()
      }
    });
  };
  
  module.exports = errorHandler;