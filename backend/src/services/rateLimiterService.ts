import { redisConnection } from '../config/redis';
import { env } from '../config/env';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  consumed: number;
  limit: number;
  retryAt?: Date;
}

/**
 * Atomic Lua Script for Redis Rate Limiting.
 * KEYS[1]: Redis rate limit key (e.g. ratelimit:sender:123:hour:2026-08-12-16)
 * ARGV[1]: Max emails per hour limit
 * ARGV[2]: Key expiration TTL in seconds (7200s = 2 hours)
 */
const RATE_LIMIT_LUA_SCRIPT = `
  local current = redis.call('INCR', KEYS[1])
  if current == 1 then
    redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2]))
  end
  local limit = tonumber(ARGV[1])
  if current > limit then
    return {0, current, limit}
  end
  return {1, current, limit}
`;

/**
 * Formats the current hour key for Redis rate limiting.
 * Format: YYYY-MM-DD-HH
 */
export const getHourKey = (date: Date = new Date()): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hour = pad(date.getUTCHours());
  return `${year}-${month}-${day}-${hour}`;
};

/**
 * Calculates the start of the next hour window.
 * Used for rescheduling jobs delayed by rate limits.
 */
export const getNextAvailableWindow = (date: Date = new Date()): Date => {
  const nextHour = new Date(date);
  nextHour.setUTCHours(nextHour.getUTCHours() + 1, 0, 0, 0);
  return nextHour;
};

/**
 * Atomically checks and consumes 1 unit of email dispatch capacity for a sender.
 * Safe across concurrent workers, process restarts, and multiple backend instances.
 */
export const consumeCapacity = async (
  senderId: string,
  customLimit?: number
): Promise<RateLimitResult> => {
  const limit = customLimit || Number(env.MAX_EMAILS_PER_HOUR || 200);
  const hourKey = getHourKey();
  const redisKey = `ratelimit:sender:${senderId}:hour:${hourKey}`;

  try {
    // Execute atomic Lua script in Redis
    const evalResult = (await redisConnection.eval(
      RATE_LIMIT_LUA_SCRIPT,
      1,
      redisKey,
      String(limit),
      '7200' // TTL: 2 hours
    )) as [number, number, number];

    const [isAllowed, currentCount, maxLimit] = evalResult;
    const allowed = isAllowed === 1;
    const remaining = Math.max(0, maxLimit - currentCount);

    let retryAt: Date | undefined;
    if (!allowed) {
      retryAt = getNextAvailableWindow();
      console.warn(
        `🚨 [Rate Limiter] Sender ${senderId} exceeded limit (${currentCount}/${maxLimit}). Rescheduling next dispatch for ${retryAt.toISOString()}`
      );
    }

    return {
      allowed,
      remaining,
      consumed: currentCount,
      limit: maxLimit,
      retryAt,
    };
  } catch (error: any) {
    console.error(`❌ [Rate Limiter Redis Error] Failed to evaluate rate limit script for sender ${senderId}:`, error.message);
    // Fail-open or fallback with default permit if Redis error occurs
    return {
      allowed: true,
      remaining: 1,
      consumed: 0,
      limit,
    };
  }
};

/**
 * Inspects remaining hourly capacity without consuming it.
 */
export const getRemainingCapacity = async (
  senderId: string,
  customLimit?: number
): Promise<number> => {
  const limit = customLimit || Number(env.MAX_EMAILS_PER_HOUR || 200);
  const hourKey = getHourKey();
  const redisKey = `ratelimit:sender:${senderId}:hour:${hourKey}`;

  const currentStr = await redisConnection.get(redisKey);
  const current = currentStr ? parseInt(currentStr, 10) : 0;
  return Math.max(0, limit - current);
};
