import { prisma } from '../../config/prisma';
import { RecipientStatus } from '@prisma/client';

export interface ScheduledEmailRow {
  id: string;
  email: string;
  subject: string;
  scheduledAt: string;
  status: string;
  campaignId: string;
  attempts: number;
  bullJobId: string | null;
}

export interface SentEmailRow {
  id: string;
  email: string;
  subject: string;
  sentAt: string | null;
  status: string;
  messageId: string | null;
  errorMessage: string | null;
  campaignId: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListQueryOptions {
  page?: number;
  limit?: number;
  status?: string;
  sort?: 'asc' | 'desc';
}

export const getScheduledEmailsRepo = async (
  userId: string,
  options: ListQueryOptions = {}
): Promise<{ rows: ScheduledEmailRow[]; meta: PaginationMeta }> => {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const skip = (page - 1) * limit;
  const sort = options.sort || 'asc';

  const statusFilter = options.status
    ? { status: options.status as RecipientStatus }
    : {};

  // Fetch only recipients belonging to campaigns owned by userId
  const [rows, total] = await Promise.all([
    prisma.emailRecipient.findMany({
      where: {
        ...statusFilter,
        campaign: { userId },
      },
      include: {
        campaign: {
          select: { subject: true, id: true },
        },
      },
      orderBy: { scheduledAt: sort },
      skip,
      take: limit,
    }),
    prisma.emailRecipient.count({
      where: {
        ...statusFilter,
        campaign: { userId },
      },
    }),
  ]);

  return {
    rows: rows.map((r) => ({
      id: r.id,
      email: r.email,
      subject: r.campaign.subject,
      scheduledAt: r.scheduledAt.toISOString(),
      status: r.status,
      campaignId: r.campaignId,
      attempts: r.attempts,
      bullJobId: r.bullJobId,
    })),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getSentEmailsRepo = async (
  userId: string,
  options: ListQueryOptions = {}
): Promise<{ rows: SentEmailRow[]; meta: PaginationMeta }> => {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const skip = (page - 1) * limit;
  const sort = options.sort || 'desc';

  const statusFilter = options.status
    ? { status: options.status as RecipientStatus }
    : {
        status: {
          in: [RecipientStatus.SENT, RecipientStatus.FAILED],
        },
      };

  const [rows, total] = await Promise.all([
    prisma.emailRecipient.findMany({
      where: {
        ...statusFilter,
        campaign: { userId },
      },
      include: {
        campaign: { select: { subject: true, id: true } },
        sendLogs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { messageId: true, errorMessage: true, sentAt: true },
        },
      },
      orderBy: { updatedAt: sort },
      skip,
      take: limit,
    }),
    prisma.emailRecipient.count({
      where: {
        ...statusFilter,
        campaign: { userId },
      },
    }),
  ]);

  return {
    rows: rows.map((r) => ({
      id: r.id,
      email: r.email,
      subject: r.campaign.subject,
      sentAt: r.sentAt?.toISOString() || r.failedAt?.toISOString() || null,
      status: r.status,
      messageId: r.sendLogs[0]?.messageId || null,
      errorMessage: r.errorMessage || r.sendLogs[0]?.errorMessage || null,
      campaignId: r.campaignId,
    })),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};
