import { Router } from 'express';
import { googleAuth, googleCallback, getMe, logout } from './authController';
import { authenticateJwt } from '../../middleware/authMiddleware';

const router = Router();

// Google OAuth Initiate
router.get('/google', googleAuth);

// Google OAuth Callback
router.get('/google/callback', googleCallback);

// Fetch Current Authenticated User Profile
router.get('/me', authenticateJwt, getMe);

// Logout Session
router.post('/logout', logout);

export default router;
