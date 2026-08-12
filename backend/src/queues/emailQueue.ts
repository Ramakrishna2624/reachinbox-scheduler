import { Queue, QueueEvents, Job } from 'bullmq';
import { redisConnection } from '../config/redis';

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

export const emailQueue = new Queue<ScheduledEmailPayload>(EMAIL_SCHEDULER_QUEUE, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 86400 * 7,
      count: 50000,
    },
    removeOnFail: {
      age: 86400 * 14,
      count: 50000,
    },
  },
});

export const emailQueueEvents = new QueueEvents(EMAIL_SCHEDULER_QUEUE, {
  connection: redisConnection,
});

emailQueueEvents.on('waiting', ({ jobId }) => {
  console.log(`[BullMQ QueueEvents] Job ${jobId} is waiting in queue`);
});

emailQueueEvents.on('delayed', ({ jobId, delay }) => {
  console.log(`[BullMQ QueueEvents] Job ${jobId} delayed by ${delay}ms`);
});

emailQueueEvents.on('completed', ({ jobId }) => {
  console.log(`[BullMQ QueueEvents] Job ${jobId} completed successfully`);
});

emailQueueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`[BullMQ QueueEvents] Job ${jobId} failed: ${failedReason}`);
});

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

  const job = await emailQueue.add(
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

  const jobs = await emailQueue.addBulk(bulkJobs);
  console.log(`⚡ [BullMQ Bulk Queue] Successfully enqueued ${jobs.length} delayed jobs in Redis pipeline.`);
  return jobs;
};
