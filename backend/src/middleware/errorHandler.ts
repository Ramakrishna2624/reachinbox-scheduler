import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { env } from '../config/env';

const isProduction = env.NODE_ENV === 'production';

const SAFE_SAFE_FIELDS_BLOCKLIST = [
  'password', 'secret', 'database_url', 'redis', 'smtp', 'credentials',
];

const sanitizeMessage = (msg: string): string => {
  const lower = msg.toLowerCase();
  if (SAFE_SAFE_FIELDS_BLOCKLIST.some((kw) => lower.includes(kw))) {
    return 'An internal service error occurred';
  }
  return msg;
};

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const timestamp = new Date().toISOString();
  const path = `${req.method} ${req.path}`;

  if (err instanceof AppError) {
    if (isProduction) {
      console.error(
        JSON.stringify({
          level: 'error',
          type: 'API_ERROR',
          code: err.code,
          statusCode: err.statusCode,
          message: err.message,
          path,
          timestamp,
        })
      );
    } else {
      console.error(`[API Error] ${err.statusCode} ${err.code}: ${err.message} | ${path}`);
    }

    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
  }

  // Unexpected (non-operational) errors
  const rawMessage =
    err instanceof Error ? err.message : 'Unknown server error';

  console.error(
    JSON.stringify({
      level: 'error',
      type: 'UNEXPECTED_ERROR',
      message: rawMessage,
      stack: err instanceof Error ? err.stack : undefined,
      path,
      timestamp,
    })
  );

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: isProduction
        ? 'An unexpected server error occurred'
        : sanitizeMessage(rawMessage),
    },
  });
};
