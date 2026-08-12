import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';

export interface AuthUser {
  id: string;
  googleId: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export const authenticateJwt = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token = req.cookies?.token;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return next(AppError.unauthorized('No authentication token provided'));
    }

    let decoded: { id: string };
    try {
      decoded = jwt.verify(token, String(env.JWT_SECRET)) as { id: string };
    } catch {
      return next(AppError.unauthorized('Invalid or expired token'));
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, googleId: true, email: true, name: true, avatarUrl: true },
    });
    if (!user) return next(AppError.unauthorized('User no longer exists'));

    (req as AuthRequest).user = user;
    next();
  } catch {
    next(AppError.internal());
  }
};
