import rateLimit, { type Options, ipKeyGenerator } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { config } from './index.js';
import { isRedisConfigured, sendRedisCommand } from './redis.js';

/**
 * Rate Limiting Configuration
 *
 * Protects API endpoints from abuse and brute-force attacks.
 * Uses the in-memory store locally and in tests. In deployed environments,
 * setting REDIS_URL or REDIS_PRIVATE_URL enables a shared Redis store.
 *
 * Best Practices Implemented:
 * - Different limits for different endpoint types
 * - Stricter limits for authentication endpoints
 * - Named constants for all rate limit values
 * - Clear error messages for rate limit violations
 */

/**
 * Time Window Constants (in milliseconds)
 */
export const RateLimitWindows = {
  /** 1 minute in milliseconds */
  ONE_MINUTE: 1 * 60 * 1000,

  /** 5 minutes in milliseconds */
  FIVE_MINUTES: 5 * 60 * 1000,

  /** 15 minutes in milliseconds */
  FIFTEEN_MINUTES: 15 * 60 * 1000,

  /** 1 hour in milliseconds */
  ONE_HOUR: 60 * 60 * 1000,

  /** 24 hours in milliseconds */
  ONE_DAY: 24 * 60 * 60 * 1000,
} as const;

/**
 * Request Limit Constants
 */
export const RequestLimits = {
  // Authentication endpoints (strictest)
  /** Login attempts per 15 minutes */
  AUTH_LOGIN: 5,

  /** Registration attempts per hour */
  AUTH_REGISTER: 3,

  /** Password reset requests per hour */
  AUTH_PASSWORD_RESET: 3,

  /** Email verification requests per hour */
  AUTH_EMAIL_VERIFY: 5,

  // Write operations (strict)
  /** Create/update operations per 15 minutes */
  WRITE_OPERATIONS: 30,

  /** Delete operations per 15 minutes */
  DELETE_OPERATIONS: 10,

  // Read operations (moderate)
  /** Read operations per 15 minutes */
  READ_OPERATIONS: 100,

  /** List/search operations per 15 minutes */
  LIST_OPERATIONS: 50,

  // General API access (lenient)
  /** General API requests per 15 minutes */
  GENERAL_API: 150,

  /** Public endpoints per 15 minutes */
  PUBLIC_ENDPOINTS: 60,
} as const;

/**
 * Rate limit message templates
 */
const RateLimitMessages = {
  auth: 'Too many authentication attempts. Please try again later.',
  write: 'Too many requests. Please slow down and try again later.',
  read: 'Too many requests. Please wait a moment before trying again.',
  general: 'Rate limit exceeded. Please try again later.',
} as const;

/**
 * Standard rate limit handler
 * Returns a 429 status with JSON error message
 */
const standardHandler: Options['handler'] = (_req, res) => {
  res.status(429).json({
    error: 'Too Many Requests',
    message: 'You have exceeded the rate limit. Please try again later.',
    retryAfter: res.getHeader('Retry-After'),
  });
};

/**
 * Skip rate limiting in test environment
 */
const skipInTest: Options['skip'] = () => {
  return config.nodeEnv === 'test';
};

/**
 * Skip registration rate limiting while developing locally.
 */
const skipRegistrationInLocalDevelopment: Options['skip'] = () => {
  return ['local', 'development', 'test'].includes(config.nodeEnv);
};

const isLocalRateLimitEnvironment = (): boolean => {
  return ['local', 'development', 'test'].includes(config.nodeEnv);
};

const allowInMemoryRateLimit = (): boolean => {
  return process.env.ALLOW_IN_MEMORY_RATE_LIMIT === 'true';
};

const shouldUseRedisRateLimitStore = (): boolean => {
  return config.nodeEnv !== 'test' && isRedisConfigured();
};

export const rateLimitStoreName = shouldUseRedisRateLimitStore() ? 'redis' : 'memory';

if (
  rateLimitStoreName === 'memory' &&
  !isLocalRateLimitEnvironment() &&
  !allowInMemoryRateLimit()
) {
  throw new Error(
    'Redis is required for rate limiting in deployed environments. ' +
      'Set REDIS_URL or REDIS_PRIVATE_URL, or set ALLOW_IN_MEMORY_RATE_LIMIT=true only for a single-instance deployment.'
  );
}

if (config.nodeEnv !== 'test') {
  const mode = rateLimitStoreName === 'redis' ? 'Redis shared store' : 'in-memory store';
  console.info(`[rate-limit] Using ${mode}`);
}

const createRateLimitStore = (): Options['store'] | undefined => {
  if (rateLimitStoreName !== 'redis') {
    return undefined;
  }

  return new RedisStore({
    sendCommand: sendRedisCommand,
    prefix: 'scholarshipmanage:rate-limit:',
  });
};

const createBaseConfig = (): Partial<Options> => ({
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: standardHandler,
  skip: skipInTest,
  store: createRateLimitStore(),
});

/**
 * Authentication Rate Limiters
 * Strictest limits to prevent brute-force attacks
 */
export const authRateLimiters = {
  /**
   * Login rate limiter
   * 5 requests per 15 minutes
   */
  login: rateLimit({
    ...createBaseConfig(),
    windowMs: RateLimitWindows.FIFTEEN_MINUTES,
    max: RequestLimits.AUTH_LOGIN,
    message: RateLimitMessages.auth,
    skipSuccessfulRequests: false, // Count all login attempts
  }),

  /**
   * Registration rate limiter
   * 3 requests per hour
   */
  register: rateLimit({
    ...createBaseConfig(),
    windowMs: RateLimitWindows.ONE_HOUR,
    max: RequestLimits.AUTH_REGISTER,
    message: RateLimitMessages.auth,
    skip: skipRegistrationInLocalDevelopment,
  }),

  /**
   * Password reset rate limiter
   * 3 requests per hour
   */
  passwordReset: rateLimit({
    ...createBaseConfig(),
    windowMs: RateLimitWindows.ONE_HOUR,
    max: RequestLimits.AUTH_PASSWORD_RESET,
    message: RateLimitMessages.auth,
  }),

  /**
   * Email verification rate limiter
   * 5 requests per hour
   */
  emailVerify: rateLimit({
    ...createBaseConfig(),
    windowMs: RateLimitWindows.ONE_HOUR,
    max: RequestLimits.AUTH_EMAIL_VERIFY,
    message: RateLimitMessages.auth,
  }),
};

/**
 * Write Operation Rate Limiters
 * Moderate limits for create/update/delete operations
 */
export const writeRateLimiters = {
  /**
   * Create/Update operations rate limiter
   * 30 requests per 15 minutes
   */
  createUpdate: rateLimit({
    ...createBaseConfig(),
    windowMs: RateLimitWindows.FIFTEEN_MINUTES,
    max: RequestLimits.WRITE_OPERATIONS,
    message: RateLimitMessages.write,
  }),

  /**
   * Delete operations rate limiter
   * 10 requests per 15 minutes
   */
  delete: rateLimit({
    ...createBaseConfig(),
    windowMs: RateLimitWindows.FIFTEEN_MINUTES,
    max: RequestLimits.DELETE_OPERATIONS,
    message: RateLimitMessages.write,
  }),
};

/**
 * Read Operation Rate Limiters
 * More lenient limits for read operations
 */
export const readRateLimiters = {
  /**
   * Read operations rate limiter
   * 100 requests per 15 minutes
   */
  read: rateLimit({
    ...createBaseConfig(),
    windowMs: RateLimitWindows.FIFTEEN_MINUTES,
    max: RequestLimits.READ_OPERATIONS,
    message: RateLimitMessages.read,
  }),

  /**
   * List/search operations rate limiter
   * 50 requests per 15 minutes
   */
  list: rateLimit({
    ...createBaseConfig(),
    windowMs: RateLimitWindows.FIFTEEN_MINUTES,
    max: RequestLimits.LIST_OPERATIONS,
    message: RateLimitMessages.read,
  }),
};

/**
 * General API Rate Limiter
 * Applied to all API routes as a baseline
 * 150 requests per 15 minutes
 */
export const generalApiLimiter = rateLimit({
  ...createBaseConfig(),
  windowMs: RateLimitWindows.FIFTEEN_MINUTES,
  max: RequestLimits.GENERAL_API,
  message: RateLimitMessages.general,
});

/**
 * Public Endpoints Rate Limiter
 * For health checks and other public endpoints
 * 60 requests per 15 minutes
 */
export const publicEndpointLimiter = rateLimit({
  ...createBaseConfig(),
  windowMs: RateLimitWindows.FIFTEEN_MINUTES,
  max: RequestLimits.PUBLIC_ENDPOINTS,
  message: RateLimitMessages.general,
});

/**
 * Webhook Rate Limiter
 * For incoming webhooks from external services
 * 100 requests per 15 minutes
 */
export const webhookLimiter = rateLimit({
  ...createBaseConfig(),
  windowMs: RateLimitWindows.FIFTEEN_MINUTES,
  max: 100,
  message: 'Webhook rate limit exceeded',
  // Use custom key generator for webhooks (by IP or webhook signature)
  keyGenerator: (req) => {
    // Try to use webhook signature/ID if available
    const webhookId = req.headers['x-webhook-id'];
    if (webhookId) {
      return String(webhookId);
    }
    // Fallback to IP address using ipKeyGenerator for proper IPv6 handling
    // /56 subnet for IPv6 addresses (default) to prevent subnet bypass attacks
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return ipKeyGenerator(ip, 56);
  },
});

/**
 * Development/Testing: Bypass rate limiter
 * Only use in development/test environments
 */
export const bypassLimiter = rateLimit({
  ...createBaseConfig(),
  windowMs: RateLimitWindows.ONE_MINUTE,
  max: 10000, // Effectively unlimited
  skip: () => true, // Always skip
});
