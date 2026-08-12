export interface User {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  googleId?: string;
}

export interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
  env: string;
}

export interface ScheduledEmail {
  id: string;
  email: string;
  subject: string;
  scheduledAt: string;
  status: 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED';
  campaignId: string;
  attempts: number;
  bullJobId: string | null;
}

export interface SentEmail {
  id: string;
  email: string;
  subject: string;
  sentAt: string | null;
  status: 'SENT' | 'FAILED';
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

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: PaginationMeta;
}

export interface CampaignSummary {
  campaignId: string;
  recipientCount: number;
  scheduledCount: number;
  firstScheduledAt: string;
  lastScheduledAt: string;
}

export interface CreateCampaignPayload {
  subject: string;
  body: string;
  sender: { email: string; displayName?: string };
  startTime: string;
  delayBetweenEmailsMs: number;
  hourlyLimit: number;
  recipients: string[];
}

export interface ParsedLeads {
  validEmails: string[];
  invalidCount: number;
  totalExtracted: number;
}
