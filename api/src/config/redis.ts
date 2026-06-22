import { createClient, type RedisClientType } from 'redis';
import type { RedisReply, SendCommandFn } from 'rate-limit-redis';

let redisClient: RedisClientType | undefined;
let redisConnectPromise: Promise<RedisClientType> | undefined;

const getRedisUrl = (): string | undefined => {
  return process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL;
};

export const isRedisConfigured = (): boolean => {
  return Boolean(getRedisUrl());
};

const getRedisClient = async (): Promise<RedisClientType> => {
  if (redisClient?.isReady) {
    return redisClient;
  }

  if (!redisConnectPromise) {
    redisClient = createClient({
      url: getRedisUrl(),
      socket: {
        connectTimeout: 5_000,
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            return false;
          }

          return Math.min(retries * 250, 1_000);
        },
      },
    });

    redisClient.on('error', (error) => {
      console.error('[redis] Redis client error:', error);
    });

    redisConnectPromise = redisClient.connect().catch((error) => {
      redisClient = undefined;
      redisConnectPromise = undefined;
      throw error;
    });
  }

  return redisConnectPromise;
};

export const sendRedisCommand: SendCommandFn = async (...args) => {
  const client = await getRedisClient();
  return client.sendCommand(args) as Promise<RedisReply>;
};
