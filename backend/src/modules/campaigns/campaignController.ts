import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authMiddleware';
import { createCampaignSchema } from './campaignValidation';
import { createCampaignService, getCampaignsService, getCampaignByIdService } from './campaignService';
import { AppError } from '../../utils/AppError';

export const createCampaign = async (
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) return next(AppError.unauthorized());

    const parsed = createCampaignSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(AppError.validation('Invalid campaign payload'));
    }

    const summary = await createCampaignService(userId, parsed.data);
    res.status(201).json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
};

export const getCampaigns = async (
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) return next(AppError.unauthorized());
    const campaigns = await getCampaignsService(userId);
    res.status(200).json({ success: true, data: campaigns });
  } catch (err) {
    next(err);
  }
};

export const getCampaignById = async (
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) return next(AppError.unauthorized());

    const campaign = await getCampaignByIdService(userId, req.params.id);
    if (!campaign) return next(AppError.notFound('Campaign'));

    res.status(200).json({ success: true, data: campaign });
  } catch (err) {
    next(err);
  }
};
