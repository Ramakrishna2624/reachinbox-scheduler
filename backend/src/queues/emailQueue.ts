import { Queue, QueueEvents, Job } from 'bullmq';
import { redisOptions } from '../config/redis';
import Redis from 'ioredis';

export const EMAIL_SCHEDULER_QUEUE = 'email-scheduler';

export interface ScheduledEmailPayload {
  recipientId: string;
  campaignId: string;
  senderId?: string;
  idempotencyKey: string;
  email: string;
  subject: string;
  body: string;
  scheduledAt: string; // ISO String
}

// Lazy singletons — created on first use, not at module load
// This prevents serverless cold-start crashes from eager Redis connections
let _emailQueue: Queue<ScheduledEmailPayload> | null = null;
let _emailQueueEvents: QueueEvents | null = null;

const getConnection = () => new Redis(redisOptions as any);

export const getEmailQueue = (): Queue<ScheduledEmailPayload> => {
  if (!_emailQueue) {
    _emailQueue = new Queue<ScheduledEmailPayload>(EMAIL_SCHEDULER_QUEUE, {
      connection: getConnection(),
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { age: 86400 * 7, count: 50000 },
        removeOnFail: { age: 86400 * 14, count: 50000 },
      },
    });
  }
  return _emailQueue;
};

export const getEmailQueueEvents = (): QueueEvents => {
  if (!_emailQueueEvents) {
    _emailQueueEvents = new QueueEvents(EMAIL_SCHEDULER_QUEUE, {
      connection: getConnection(),
    });
    _emailQueueEvents.on('waiting', ({ jobId }) =>
      console.log(`[BullMQ QueueEvents] Job ${jobId} is waiting in queue`)
    );
    _emailQueueEvents.on('delayed', ({ jobId, delay }) =>
      console.log(`[BullMQ QueueEvents] Job ${jobId} delayed by ${delay}ms`)
    );
    _emailQueueEvents.on('completed', ({ jobId }) =>
      console.log(`[BullMQ QueueEvents] Job ${jobId} completed successfully`)
    );
    _emailQueueEvents.on('failed', ({ jobId, failedReason }) =>
      console.error(`[BullMQ QueueEvents] Job ${jobId} failed: ${failedReason}`)
    );
  }
  return _emailQueueEvents;
};

// Backward-compatible lazy proxy
export const emailQueue = {
  add: (...args: Parameters<Queue<ScheduledEmailPayload>['add']>) => getEmailQueue().add(...args),
  addBulk: (...args: Parameters<Queue<ScheduledEmailPayload>['addBulk']>) => getEmailQueue().addBulk(...args),
};

/**
 * Schedules a single delayed BullMQ job.
 */
export const scheduleEmailJob = async (
  payload: ScheduledEmailPayload,
  targetTime: Date
): Promise<Job<ScheduledEmailPayload>> => {
  const nowMs = Date.now();
  const targetMs = targetTime.getTime();
  const delayMs = Math.max(0, targetMs - nowMs);

  const job = await getEmailQueue().add(
    'send-recipient-email',
    payload,
    {
      delay: delayMs,
      jobId: `job_${payload.idempotencyKey}`,
    }
  );

  return job;
};

/**
 * Optimized bulk enqueuing for 1000+ email jobs in a single Redis pipeline.
 */
export const scheduleBulkEmailJobs = async (
  items: { payload: ScheduledEmailPayload; targetTime: Date }[]
): Promise<Job<ScheduledEmailPayload>[]> => {
  const nowMs = Date.now();

  const bulkJobs = items.map(({ payload, targetTime }) => {
    const delayMs = Math.max(0, targetTime.getTime() - nowMs);
    return {
      name: 'send-recipient-email',
      data: payload,
      opts: {
        delay: delayMs,
        jobId: `job_${payload.idempotencyKey}`,
      },
    };
  });

  const jobs = await getEmailQueue().addBulk(bulkJobs);
  console.log(`⚡ [BullMQ Bulk Queue] Successfully enqueued ${jobs.length} delayed jobs in Redis pipeline.`);
  return jobs;
};
