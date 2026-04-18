import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/index.js';
import { errorHandler } from './middleware/error-handler.js';
import apiRoutes from './routes/index.js';
import { securityHeadersConfig, additionalSecurityHeaders } from './config/security-headers.js';
import { generalApiLimiter, publicEndpointLimiter } from './config/rate-limit.js';

const app = express();

// Security headers middleware
app.use(helmet(securityHeadersConfig));

// Additional security headers not covered by Helmet
app.use((_req, res, next) => {
  Object.entries(additionalSecurityHeaders).forEach(([header, value]) => {
    res.setHeader(header, value);
  });
  next();
});

// CORS middleware
app.use(cors());

// Request logging
app.use(morgan('dev'));

// Body parsing
app.use(express.json());

// Health check with rate limiting
app.get('/health', publicEndpointLimiter, (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes with general rate limiting
app.use('/api', generalApiLimiter, apiRoutes);

// 404 handler - must be after all routes
app.use((_req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
  });
});

// Error handler - must be last
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    app.listen(config.port, () => {
      console.log(`🚀 Server Started`);
      console.log(`📝 Environment: ${config.nodeEnv}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
