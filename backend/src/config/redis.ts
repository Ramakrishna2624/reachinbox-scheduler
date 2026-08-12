import Redis from 'ioredis';
import { env } from './env';

export const redisOptions = {
  host: String(env.REDIS_HOST || 'localhost'),
  port: Number(env.REDIS_PORT || 6379),
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

export const redisConnection = new Redis(redisOptions);

redisConnection.on('connect', () => {
  console.log('⚡ [Redis] Client connected successfully');
});

redisConnection.on('error', (err) => {
  console.error('❌ [Redis] Connection error:', err.message);
});
