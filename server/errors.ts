// Unified error handling for API
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class ApiError extends Error {
  status: number;
  code: string;
  details?: any;

  constructor(status: number, code: string, message: string, details?: any) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const Errors = {
  badRequest: (msg?: string, details?: any) => 
    new ApiError(400, 'BAD_REQUEST', msg || 'Bad request', details),
  notFound: (msg?: string) => 
    new ApiError(404, 'NOT_FOUND', msg || 'Not found'),
  conflict: (msg?: string) => 
    new ApiError(409, 'CONFLICT', msg || 'Conflict'),
  server: (msg?: string) => 
    new ApiError(500, 'SERVER_ERROR', msg || 'Server error'),
};

export function errorMiddleware(err: any, req: Request, res: Response, next: NextFunction) {
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const payload = {
      error: {
        code: 'BAD_REQUEST',
        message: 'Validation error',
        details: err.errors,
      },
    };
    return res.status(400).json(payload);
  }

  // Handle ApiError instances
  const status = err.status || 500;
  const payload = {
    error: {
      code: err.code || 'SERVER_ERROR',
      message: err.message || 'Server error',
      details: err.details,
    },
  };
  res.status(status).json(payload);
}
