import { Router } from 'express';
import { getScheduledEmails, getSentEmails } from './emailController';
import { authenticateJwt } from '../../middleware/authMiddleware';

const router = Router();

router.use(authenticateJwt as any);
router.get('/scheduled', getScheduledEmails as any);
router.get('/sent', getSentEmails as any);

export default router;
