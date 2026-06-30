import type { CorsOptions } from 'cors';

const DEFAULT_DEV_ALLOWED_ORIGINS = [
  'https://dev.scholarshipmanage.pages.dev',
  'http://localhost:5173',
];

const normalizeOrigin = (origin: string): string => {
  try {
    return new URL(origin).origin;
  } catch {
    return origin.trim().replace(/\/+$/, '');
  }
};

const parseAllowedOrigins = (value: string): string[] => {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map(normalizeOrigin);
};

const getDefaultAllowedOrigins = (): string[] => {
  if (['local', 'development', 'dev', 'test'].includes(process.env.NODE_ENV || 'local')) {
    return DEFAULT_DEV_ALLOWED_ORIGINS;
  }

  return [process.env.APP_URL || 'http://localhost:5173'];
};

export const allowedCorsOrigins = new Set(
  parseAllowedOrigins(
    process.env.CORS_ALLOWED_ORIGINS || getDefaultAllowedOrigins().join(',')
  )
);

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    callback(null, allowedCorsOrigins.has(normalizeOrigin(origin)));
  },
  exposedHeaders: ['X-App-Version'],
};
