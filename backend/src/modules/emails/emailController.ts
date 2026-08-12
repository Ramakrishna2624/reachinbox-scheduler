import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authMiddleware';
import { getScheduledEmailsService, getSentEmailsService } from './emailService';
import { AppError } from '../../utils/AppError';

const parseQueryOptions = (query: Record<string, any>) => ({
  page: query.page ? parseInt(query.page as string, 10) : 1,
  limit: query.limit ? parseInt(query.limit as string, 10) : 20,
  status: (query.status as string) || undefined,
  sort: (query.sort as 'asc' | 'desc') || undefined,
});

export const getScheduledEmails = async (
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) return next(AppError.unauthorized());
    const result = await getScheduledEmailsService(userId, parseQueryOptions(req.query));
    res.status(200).json({ success: true, data: result.rows, meta: result.meta });
  } catch (err) {
    next(err);
  }
};

export const getSentEmails = async (
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) return next(AppError.unauthorized());
    const result = await getSentEmailsService(userId, parseQueryOptions(req.query));
    res.status(200).json({ success: true, data: result.rows, meta: result.meta });
  } catch (err) {
    next(err);
  }
};
