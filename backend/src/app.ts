import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import passport from './config/passport';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './modules/auth/authRoutes';
import campaignRoutes from './modules/campaigns/campaignRoutes';
import emailRoutes from './modules/emails/emailRoutes';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow Vercel frontend domains, local dev, or any browser request
      callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());

app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/emails', emailRoutes);

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'ReachInbox Scheduler API',
    timestamp: new Date().toISOString(),
    env: env.NODE_ENV,
  });
});

app.get('/api', (_req, res) => {
  res.status(200).json({ name: 'ReachInbox Scheduler API', version: '1.0.0' });
});

app.use(errorHandler);

export default app;
