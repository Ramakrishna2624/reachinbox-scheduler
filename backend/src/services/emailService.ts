import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';

export interface SendEmailOptions {
  from?: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export interface SendEmailResult {
  messageId: string;
  previewUrl: string | false;
  accepted: string[];
  rejected: string[];
}

let transporterInstance: Transporter | null = null;
let etherealAccountInfo: string | null = null;

/**
 * Returns a cached Nodemailer transporter singleton for Ethereal Email SMTP.
 * If credentials are missing in .env, automatically creates a single Ethereal test account.
 */
export const getTransporter = async (): Promise<Transporter> => {
  if (transporterInstance) {
    return transporterInstance;
  }

  const host = env.ETHEREAL_HOST || 'smtp.ethereal.email';
  const port = Number(env.ETHEREAL_PORT || 587);

  if (env.ETHEREAL_USER && env.ETHEREAL_PASS) {
    console.log(`📧 [Nodemailer] Using configured Ethereal credentials for user: ${env.ETHEREAL_USER}`);
    transporterInstance = nodemailer.createTransport({
      host,
      port,
      secure: false,
      auth: {
        user: String(env.ETHEREAL_USER),
        pass: String(env.ETHEREAL_PASS),
      },
    });
    etherealAccountInfo = `User: ${env.ETHEREAL_USER}`;
  } else {
    console.log('🧪 [Nodemailer] Ethereal credentials missing in .env. Generating new Ethereal test account...');
    const testAccount = await nodemailer.createTestAccount();
    console.log(`✅ [Nodemailer] Created Ethereal test account: ${testAccount.user}`);

    transporterInstance = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    etherealAccountInfo = `Auto-Generated User: ${testAccount.user}`;
  }

  return transporterInstance;
};

/**
 * Sends an email via Nodemailer Ethereal SMTP.
 * Returns messageId and Ethereal preview URL.
 */
export const sendEmail = async (options: SendEmailOptions): Promise<SendEmailResult> => {
  try {
    const transporter = await getTransporter();

    const fromAddress = options.from || env.ETHEREAL_USER || 'ReachInbox Scheduler <scheduler@reachinbox.ai>';

    const info = await transporter.sendMail({
      from: fromAddress,
      to: options.to,
      subject: options.subject,
      html: options.html || `<p>${options.text || options.subject}</p>`,
      text: options.text || options.subject,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);

    console.log(`✉️ [Nodemailer] Sent email to: ${options.to} | MessageID: ${info.messageId}`);
    if (previewUrl) {
      console.log(`🔗 [Ethereal Preview URL]: ${previewUrl}`);
    }

    return {
      messageId: info.messageId,
      previewUrl: previewUrl || false,
      accepted: Array.isArray(info.accepted) ? info.accepted.map(String) : [],
      rejected: Array.isArray(info.rejected) ? info.rejected.map(String) : [],
    };
  } catch (error: any) {
    console.error(`❌ [Nodemailer Error] Failed to send email to ${options.to}:`, error.message);
    throw new Error(`Email dispatch failed for ${options.to}: ${error.message}`);
  }
};
