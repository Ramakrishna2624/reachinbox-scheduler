import { prisma } from '../../config/prisma';
import { CreateCampaignInput } from './campaignValidation';
import { scheduleBulkEmailJobs, ScheduledEmailPayload } from '../../queues/emailQueue';
import { CampaignStatus, RecipientStatus } from '@prisma/client';

export interface CampaignSummary {
  campaignId: string;
  recipientCount: number;
  scheduledCount: number;
  firstScheduledAt: string;
  lastScheduledAt: string;
}

export const createCampaignService = async (
  userId: string,
  input: CreateCampaignInput
): Promise<CampaignSummary> => {
  const { subject, body, sender, startTime, delayBetweenEmailsMs, hourlyLimit, recipients } = input;

  const senderEmail = typeof sender === 'string' ? sender : sender.email;
  const senderName = typeof sender === 'string' ? sender.split('@')[0] : sender.displayName || sender.email.split('@')[0];

  // 1. Find or create Sender record
  let senderEntity = await prisma.sender.findFirst({
    where: { userId, email: senderEmail },
  });

  if (!senderEntity) {
    senderEntity = await prisma.sender.create({
      data: {
        userId,
        email: senderEmail,
        displayName: senderName,
      },
    });
  }

  const baseStartTimeMs = new Date(startTime).getTime();

  // 2. Create EmailCampaign record
  const campaign = await prisma.emailCampaign.create({
    data: {
      userId,
      senderId: senderEntity.id,
      subject,
      body,
      startTime: new Date(startTime),
      delayBetweenEmailsMs,
      hourlyLimit,
      status: CampaignStatus.SCHEDULED,
    },
  });

  // 3. Prepare bulk recipient data array for PostgreSQL
  const recipientInsertData = recipients.map((rawEmail, index) => {
    const normalizedEmail = rawEmail.trim().toLowerCase();
    const targetScheduledTimeMs = baseStartTimeMs + delayBetweenEmailsMs * index;
    const recipientScheduledAt = new Date(targetScheduledTimeMs);
    const idempotencyKey = `cmp_${campaign.id}_rcp_${normalizedEmail}_idx_${index}`;

    return {
      campaignId: campaign.id,
      email: normalizedEmail,
      status: RecipientStatus.SCHEDULED,
      scheduledAt: recipientScheduledAt,
      idempotencyKey,
    };
  });

  // 4. Perform bulk PostgreSQL database insert (eliminates N+1 query overhead for 1000+ leads)
  await prisma.emailRecipient.createMany({
    data: recipientInsertData,
    skipDuplicates: true,
  });

  // 5. Fetch created recipients to acquire generated IDs and idempotency keys
  const createdRecipients = await prisma.emailRecipient.findMany({
    where: { campaignId: campaign.id },
    select: {
      id: true,
      email: true,
      idempotencyKey: true,
      scheduledAt: true,
    },
  });

  // 6. Build bulk BullMQ job payload array
  const bulkQueueItems = createdRecipients.map((rcp) => ({
    payload: {
      recipientId: rcp.id,
      campaignId: campaign.id,
      senderId: senderEntity!.id,
      idempotencyKey: rcp.idempotencyKey,
      email: rcp.email,
      subject,
      body,
      scheduledAt: rcp.scheduledAt.toISOString(),
    } as ScheduledEmailPayload,
    targetTime: rcp.scheduledAt,
  }));

  // 7. Enqueue all delayed BullMQ jobs in a single Redis pipeline call
  const enqueuedJobs = await scheduleBulkEmailJobs(bulkQueueItems);

  // 8. Perform bulk update back to PostgreSQL storing bullJobId for all recipients
  const updatePromises = enqueuedJobs.map((job) => {
    const recipientId = job.data.recipientId;
    return prisma.emailRecipient.update({
      where: { id: recipientId },
      data: { bullJobId: String(job.id) },
    });
  });

  await Promise.all(updatePromises);

  const firstScheduledAtMs = baseStartTimeMs;
  const lastScheduledAtMs = baseStartTimeMs + delayBetweenEmailsMs * (recipients.length - 1);

  console.log(
    `🚀 [Bulk Campaign Engine] Successfully scheduled campaign ${campaign.id} with ${enqueuedJobs.length}/${recipients.length} recipients.`
  );

  return {
    campaignId: campaign.id,
    recipientCount: recipients.length,
    scheduledCount: enqueuedJobs.length,
    firstScheduledAt: new Date(firstScheduledAtMs).toISOString(),
    lastScheduledAt: new Date(lastScheduledAtMs).toISOString(),
  };
};

export const getCampaignsService = async (userId: string) => {
  return prisma.emailCampaign.findMany({
    where: { userId },
    include: {
      sender: true,
      recipients: {
        select: {
          id: true,
          email: true,
          status: true,
          scheduledAt: true,
          sentAt: true,
          failedAt: true,
          errorMessage: true,
        },
      },
      _count: {
        select: { recipients: true, sendLogs: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const getCampaignByIdService = async (userId: string, campaignId: string) => {
  return prisma.emailCampaign.findFirst({
    where: { id: campaignId, userId },
    include: {
      sender: true,
      recipients: true,
      sendLogs: {
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
  });
};
