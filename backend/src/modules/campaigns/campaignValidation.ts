import { z } from 'zod';

export const createCampaignSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  sender: z.union([
    z.string().email('Valid sender email required'),
    z.object({
      email: z.string().email('Valid sender email required'),
      displayName: z.string().optional(),
    }),
  ]),
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Valid startTime ISO string required',
  }),
  delayBetweenEmailsMs: z.number().min(0, 'delayBetweenEmailsMs must be >= 0').default(1000),
  hourlyLimit: z.number().min(1, 'hourlyLimit must be > 0').default(100),
  recipients: z
    .array(z.string().email('Invalid email recipient address'))
    .min(1, 'At least one recipient email address is required'),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
