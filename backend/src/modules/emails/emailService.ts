import {
  getScheduledEmailsRepo,
  getSentEmailsRepo,
  ListQueryOptions,
} from './emailRepository';

export const getScheduledEmailsService = (userId: string, opts: ListQueryOptions) =>
  getScheduledEmailsRepo(userId, opts);

export const getSentEmailsService = (userId: string, opts: ListQueryOptions) =>
  getSentEmailsRepo(userId, opts);
