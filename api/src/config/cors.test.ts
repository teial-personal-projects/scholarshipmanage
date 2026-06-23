import { describe, expect, it } from 'vitest';
import cors from 'cors';
import express from 'express';
import request from 'supertest';
import { corsOptions } from './cors.js';

describe('CORS configuration', () => {
  const app = express();

  app.use(cors(corsOptions));
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  it('allows the dev Cloudflare Pages origin', async () => {
    const response = await request(app)
      .get('/health')
      .set('Origin', 'https://dev.scholarshipmanage.pages.dev');

    expect(response.headers['access-control-allow-origin']).toBe(
      'https://dev.scholarshipmanage.pages.dev'
    );
  });

  it('allows the local Vite origin', async () => {
    const response = await request(app)
      .get('/health')
      .set('Origin', 'http://localhost:5173');

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('does not emit CORS headers for untrusted origins', async () => {
    const response = await request(app)
      .get('/health')
      .set('Origin', 'https://example.com');

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});
