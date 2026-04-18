/**
 * Test Server Helper
 * Utilities for spinning up Express app for integration tests
 */

import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import request from 'supertest';
import { vi } from 'vitest';
import apiRoutes from '../../routes/index.js';
import { errorHandler } from '../../middleware/error-handler.js';

/**
 * Create a test Express app with full configuration matching production
 */
export const createTestApp = (): Express => {
  const app = express();

  // Middleware (matching production setup)
  app.use(helmet());
  app.use(cors());
  app.use(morgan('dev'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use('/api', apiRoutes);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: 'The requested resource was not found',
    });
  });

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
};

/**
 * Create supertest agent for testing
 */
export const createTestAgent = (app: Express) => {
  return request(app);
};

/**
 * Mock database cleanup utilities
 * In real tests, these would clean up test data from the database
 */
export const dbTestHelpers = {
  /**
   * Clean up all test data
   */
  cleanup: vi.fn(async () => {
    // In a real implementation, this would:
    // - Delete all test records from database
    // - Reset sequences/auto-increment IDs
    // - Clear any cached data
    return Promise.resolve();
  }),

  /**
   * Set up test data
   */
  seed: vi.fn(async (data: any) => {
    // In a real implementation, this would:
    // - Insert seed data into database
    // - Return the inserted records
    return Promise.resolve(data);
  }),

  /**
   * Reset database to clean state
   */
  reset: vi.fn(async () => {
    // In a real implementation, this would:
    // - Truncate all tables
    // - Reset sequences
    // - Re-apply migrations if needed
    return Promise.resolve();
  }),
};

/**
 * Test helper for authenticated requests
 */
export const authenticatedRequest = (
  agent: ReturnType<typeof request>,
  token: string = 'mock-jwt-token'
) => {
  return {
    get: (url: string) => agent.get(url).set('Authorization', `Bearer ${token}`),
    post: (url: string) => agent.post(url).set('Authorization', `Bearer ${token}`),
    patch: (url: string) => agent.patch(url).set('Authorization', `Bearer ${token}`),
    put: (url: string) => agent.put(url).set('Authorization', `Bearer ${token}`),
    delete: (url: string) => agent.delete(url).set('Authorization', `Bearer ${token}`),
  };
};

import { expect } from 'vitest';

/**
 * Test helper for expecting common HTTP responses
 */
export const expectSuccess = (response: request.Response, expectedStatus: number = 200) => {
  expect(response.status).toBe(expectedStatus);
  expect(response.body).toBeDefined();
};

export const expectError = (
  response: request.Response,
  expectedStatus: number,
  errorMessage?: string
) => {
  expect(response.status).toBe(expectedStatus);
  expect(response.body.error).toBeDefined();
  if (errorMessage) {
    expect(response.body.error).toContain(errorMessage);
  }
};

/**
 * Wait for async operations
 */
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
