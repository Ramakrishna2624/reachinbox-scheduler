import { Router } from 'express';
import { createCampaign, getCampaigns, getCampaignById } from './campaignController';
import { authenticateJwt } from '../../middleware/authMiddleware';

const router = Router();

// Protect all campaign endpoints with JWT auth
router.use(authenticateJwt as any);

router.post('/', createCampaign as any);
router.get('/', getCampaigns as any);
router.get('/:id', getCampaignById as any);

export default router;
