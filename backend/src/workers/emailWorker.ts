import { Worker, Job, UnrecoverableError } from 'bullmq';
import { EMAIL_SCHEDULER_QUEUE, ScheduledEmailPayload } from '../queues/emailQueue';
import { redisConnection } from '../config/redis';
import { prisma } from '../config/prisma';
import { sendEmail } from '../services/emailService';
import { consumeCapacity } from '../services/rateLimiterService';
import { telemetry } from '../utils/telemetry';
import { env } from '../config/env';
import { RecipientStatus } from '@prisma/client';

const MAX_JOB_ATTEMPTS = Number(process.env.MAX_JOB_ATTEMPTS || 5);

const log = (level: 'info' | 'warn' | 'error', msg: string, meta?: object) => {
  console[level](
    JSON.stringify({ level, type: 'WORKER', message: msg, timestamp: new Date().toISOString(), ...meta })
  );
};

export const createEmailWorker = () => {
  const workerConcurrency = Number(env.WORKER_CONCURRENCY || 5);
  log('info', `Email worker starting`, { concurrency: workerConcurrency, maxAttempts: MAX_JOB_ATTEMPTS });

  const worker = new Worker<ScheduledEmailPayload>(
    EMAIL_SCHEDULER_QUEUE,
    async (job: Job<ScheduledEmailPayload>) => {
      const { recipientId, campaignId, senderId, email, subject, body } = job.data;
      const isLastAttempt = job.attemptsMade >= MAX_JOB_ATTEMPTS - 1;
      telemetry.recordProcessed();

      log('info', `Processing job`, { jobId: job.id, email, attempt: job.attemptsMade + 1, maxAttempts: MAX_JOB_ATTEMPTS });

      // ── 1. Atomic SCHEDULED → PROCESSING claim ────────────────────────────
      const claimResult = await prisma.emailRecipient.updateMany({
        where: { id: recipientId, status: RecipientStatus.SCHEDULED },
        data: { status: RecipientStatus.PROCESSING, attempts: { increment: 1 } },
      });

      if (claimResult.count === 0) {
        // Either another worker claimed it, or it is already SENT/FAILED
        const existing = await prisma.emailRecipient.findUnique({
          where: { id: recipientId },
          select: { status: true },
        });
        log('warn', `Claim failed – recipient already in state: ${existing?.status ?? 'not found'}`, { jobId: job.id, email });
        return { skipped: true, reason: 'Already claimed or completed' };
      }

      // ── 2. Distributed rate-limit check ───────────────────────────────────
      const effectiveSenderId = senderId || campaignId;
      const rateLimit = await consumeCapacity(effectiveSenderId!);

      if (!rateLimit.allowed) {
        telemetry.recordRateLimited();
        // Revert claim so a future worker can pick it up
        await prisma.emailRecipient.update({
          where: { id: recipientId },
          data: { status: RecipientStatus.SCHEDULED },
        });
        const delayMs = Math.max(5000, (rateLimit.retryAt?.getTime() ?? Date.now() + 3600_000) - Date.now());
        log('warn', `Rate limit reached – rescheduling job`, { jobId: job.id, email, retryInMs: delayMs });
        await job.moveToDelayed(Date.now() + delayMs, job.token);
        telemetry.recordRetry();
        return { rateLimited: true, retryAt: rateLimit.retryAt };
      }

      // ── 3. Send email ──────────────────────────────────────────────────────
      try {
        let result: { messageId: string; previewUrl: string | false };

        if (env.SIMULATE_SMTP === 'true') {
          result = { messageId: `sim_${Date.now()}_${job.id}`, previewUrl: false };
        } else {
          result = await sendEmail({
            to: email,
            subject,
            html: `<div style="font-family:Arial,sans-serif;padding:20px"><h2 style="color:#2563eb">${subject}</h2><div style="line-height:1.6;color:#334155">${body.replace(/\n/g, '<br/>')}</div></div>`,
            text: body,
          });
        }

        const sentTime = new Date();

        // ── 4. PROCESSING → SENT ──────────────────────────────────────────────
        await prisma.emailRecipient.update({
          where: { id: recipientId },
          data: { status: RecipientStatus.SENT, sentAt: sentTime },
        });
        await prisma.emailSendLog.create({
          data: { recipientId, campaignId, status: RecipientStatus.SENT, messageId: result.messageId, sentAt: sentTime },
        });

        telemetry.recordSent();
        log('info', `Email delivered`, { jobId: job.id, email, messageId: result.messageId });
        return { success: true, recipient: email, messageId: result.messageId };

      } catch (smtpErr: any) {
        const errorMessage = smtpErr?.message || 'SMTP error';
        log('error', `SMTP dispatch failed`, { jobId: job.id, email, error: errorMessage, isLastAttempt });

        if (isLastAttempt) {
          // ── Permanent failure ──────────────────────────────────────────────
          telemetry.recordFailed();
          await prisma.emailRecipient.update({
            where: { id: recipientId },
            data: { status: RecipientStatus.FAILED, failedAt: new Date(), errorMessage },
          });
          await prisma.emailSendLog.create({
            data: { recipientId, campaignId, status: RecipientStatus.FAILED, errorMessage },
          });
          // Use UnrecoverableError so BullMQ marks the job failed without further retries
          throw new UnrecoverableError(`Permanent failure after ${MAX_JOB_ATTEMPTS} attempts: ${errorMessage}`);
        }

        // ── Transient failure – revert to SCHEDULED for exponential backoff retry
        await prisma.emailRecipient.update({
          where: { id: recipientId },
          data: { status: RecipientStatus.SCHEDULED },
        });
        telemetry.recordRetry();
        throw smtpErr; // BullMQ retries with exponential backoff
      }
    },
    {
      connection: redisConnection,
      concurrency: workerConcurrency,
      settings: { backoffStrategy: (attempt) => Math.min(2 ** attempt * 3000, 60_000) },
    }
  );

  // ── Worker-level error guard – prevents process crash ──────────────────────
  worker.on('error', (err) => {
    log('error', `Worker encountered an error (process continues)`, { error: err.message });
  });

  worker.on('completed', (job) =>
    log('info', `Job completed`, { jobId: job.id })
  );

  worker.on('failed', (job, err) =>
    log('error', `Job failed permanently`, { jobId: job?.id, error: err.message })
  );

  return worker;
};
