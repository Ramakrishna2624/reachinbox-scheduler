import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';
import { AuthRequest } from '../../middleware/authMiddleware';

export const googleAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Google OAuth credentials missing. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env',
      },
    });
    return;
  }

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })(req, res, next);
};

export const googleCallback = (req: Request, res: Response, next: NextFunction): void => {
  passport.authenticate('google', { session: false }, (err: any, user: any) => {
    if (err || !user) {
      console.error('❌ Google OAuth callback error:', err);
      res.redirect(`${env.CLIENT_URL}/login?error=google_auth_failed`);
      return;
    }

    try {
      const signOptions: SignOptions = {
        expiresIn: '7d',
      };

      const token = jwt.sign(
        { id: user.id, email: user.email },
        String(env.JWT_SECRET),
        signOptions
      );

      res.cookie('token', token, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      console.log(`👤 User authenticated via Google OAuth: ${user.email}`);
      res.redirect(`${env.CLIENT_URL}/dashboard`);
      return;
    } catch (tokenErr) {
      console.error('❌ Token generation error:', tokenErr);
      res.redirect(`${env.CLIENT_URL}/login?error=token_generation_failed`);
      return;
    }
  })(req, res, next);
};

export const getMe = (req: Request, res: Response): void => {
  const authReq = req as AuthRequest;
  res.status(200).json({
    success: true,
    data: { user: authReq.user },
  });
};

export const logout = (_req: Request, res: Response): void => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};
