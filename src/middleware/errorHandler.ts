import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../types';
import { Logger } from '../utils/logger';

const logger = new Logger();

export function errorHandler(
  error: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error('Error occurred:', error);

  // If response was already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(error);
  }

  // Handle known API errors
  if ('statusCode' in error && error.statusCode) {
    res.status(error.statusCode).json({
      error: error.error || 'Error',
      message: error.message
    });
    return;
  }

  // Handle validation errors
  if (error instanceof Error && error.name === 'ValidationError') {
    res.status(400).json({
      error: 'Validation Error',
      message: error.message
    });
    return;
  }

  // Handle JWT errors
  if (error instanceof Error && error.name === 'JsonWebTokenError') {
    res.status(401).json({
      error: 'Authentication Error',
      message: 'Invalid token'
    });
    return;
  }

  if (error instanceof Error && error.name === 'TokenExpiredError') {
    res.status(401).json({
      error: 'Authentication Error',
      message: 'Token expired'
    });
    return;
  }

  // Handle database errors
  if (error.message.includes('UNIQUE constraint failed')) {
    res.status(409).json({
      error: 'Conflict',
      message: 'Resource already exists'
    });
    return;
  }

  // Default error response
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred'
  });
}
