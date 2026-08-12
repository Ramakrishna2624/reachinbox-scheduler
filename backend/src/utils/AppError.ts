export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, code: ErrorCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
  }

  static validation(message: string) {
    return new AppError(message, 400, 'VALIDATION_ERROR');
  }
  static unauthorized(message = 'Authentication required') {
    return new AppError(message, 401, 'UNAUTHORIZED');
  }
  static forbidden(message = 'Access denied') {
    return new AppError(message, 403, 'FORBIDDEN');
  }
  static notFound(resource = 'Resource') {
    return new AppError(`${resource} not found`, 404, 'NOT_FOUND');
  }
  static conflict(message: string) {
    return new AppError(message, 409, 'CONFLICT');
  }
  static rateLimited(message = 'Rate limit exceeded') {
    return new AppError(message, 429, 'RATE_LIMITED');
  }
  static internal(message = 'An unexpected error occurred') {
    return new AppError(message, 500, 'INTERNAL_ERROR', false);
  }
}
