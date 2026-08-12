import nodemailer from 'nodemailer';
import { env } from './env';

export const createTransporter = async () => {
  if (env.ETHEREAL_USER && env.ETHEREAL_PASS) {
    return nodemailer.createTransport({
      host: String(env.ETHEREAL_HOST || 'smtp.ethereal.email'),
      port: Number(env.ETHEREAL_PORT || 587),
      secure: false,
      auth: {
        user: String(env.ETHEREAL_USER),
        pass: String(env.ETHEREAL_PASS),
      },
    });
  }

  // Create test account automatically if credentials not provided in .env
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
};
