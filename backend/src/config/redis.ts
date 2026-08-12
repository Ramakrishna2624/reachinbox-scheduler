import Redis from 'ioredis';
import { env } from './env';

const isUpstash = String(env.REDIS_HOST || '').includes('upstash.io');

export const redisOptions = {
  host: String(env.REDIS_HOST || 'localhost'),
  port: Number(env.REDIS_PORT || 6379),
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
  tls: isUpstash ? {} : undefined,
  retryStrategy: (times: number) => {
    if (times > 3) return null;
    return Math.min(times * 100, 1000);
  },
};

export const redisConnection = new Redis(redisOptions as any);

redisConnection.on('connect', () => {
  console.log('⚡ [Redis] Connected to', env.REDIS_HOST);
});

redisConnection.on('error', (err) => {
  console.error('❌ [Redis] Notice:', err.message);
});
