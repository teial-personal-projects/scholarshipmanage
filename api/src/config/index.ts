import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const loadEnvFile = (filePath: string, override = false) => {
  const { error } = dotenv.config({ path: filePath, override });
  if (error) {
    console.error(`[config] Failed to load environment file at ${filePath}`, error);
    return false;
  }

  return true;
};

const workspaceRoot = process.cwd();
const env = process.env.NODE_ENV || 'local';
const envFileName = `.env.${env}`;
const envPath = path.resolve(workspaceRoot, envFileName);

if (fs.existsSync(envPath)) {
  loadEnvFile(envPath);
} else {
  console.warn(`[config] Environment file "${envFileName}" not found at ${envPath}.`);
}


interface Config {
  port: number;
  nodeEnv: string;
  supabase: {
    url: string;
    serviceRoleKey: string;
  };
  resend: {
    apiKey: string;
    webhookSecret: string;
    fromEmail: string;
    fromName: string;
  };
  app: {
    url: string; // Frontend URL for generating invite links
  };
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'local',
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY || '',
    webhookSecret: process.env.RESEND_WEBHOOK_SECRET || '',
    fromEmail: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
    fromName: process.env.RESEND_FROM_NAME || 'Scholarship Hub',
  },
  app: {
    url: process.env.APP_URL || 'http://localhost:5173',
  },
};

// Validate required environment variables
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.warn(
    `⚠️  Warning: Missing environment variables: ${missingEnvVars.join(', ')}`
  );
  console.warn('   Create a .env file in the api directory with these values.');
}
