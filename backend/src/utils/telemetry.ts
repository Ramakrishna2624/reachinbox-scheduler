/** Lightweight in-memory telemetry counters (informational, non-critical). */
let sent = 0;
let failed = 0;
let retried = 0;
let rateLimited = 0;
let processed = 0;

export const telemetry = {
  recordSent: () => sent++,
  recordFailed: () => failed++,
  recordRetry: () => retried++,
  recordRateLimited: () => rateLimited++,
  recordProcessed: () => processed++,
  snapshot: () => ({ sent, failed, retried, rateLimited, processed, upSince: startedAt }),
};

const startedAt = new Date().toISOString();
