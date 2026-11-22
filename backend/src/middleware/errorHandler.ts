import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../types/contracts';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    const body: ApiError = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
      timestamp: new Date().toISOString(),
    };
    res.status(err.statusCode).json(body);
    return;
  }

  console.error('Unhandled error:', err);
  const body: ApiError = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: err.message || 'Internal server error',
      details: {
        errorName: err.name,
        errorMsg: err.message,
      },
    },
    timestamp: new Date().toISOString(),
  };
  res.status(500).json(body);
}

export function requestLogger(req: Request, _res: Response, next: NextFunction): void {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${req.method} ${req.url}`);
  next();
}
