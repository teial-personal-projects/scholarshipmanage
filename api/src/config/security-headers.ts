import { HelmetOptions } from 'helmet';
import { config } from './index.js';

/**
 * Security Headers Configuration
 *
 * This configuration implements comprehensive security headers including:
 * - Content Security Policy (CSP)
 * - X-Frame-Options
 * - X-Content-Type-Options
 * - Strict-Transport-Security (HSTS)
 * - Referrer-Policy
 * - Permissions-Policy
 */

const isDevelopment = config.nodeEnv === 'local' || config.nodeEnv === 'development';
const isProduction = config.nodeEnv === 'production';

export const securityHeadersConfig: HelmetOptions = {
  /**
   * Content Security Policy (CSP)
   * Prevents XSS, clickjacking, and other code injection attacks
   */
  contentSecurityPolicy: {
    directives: {
      // Default fallback for all resource types
      defaultSrc: ["'self'"],

      // Scripts: Allow self and specific trusted sources
      scriptSrc: [
        "'self'",
        // Allow inline scripts in development for hot reload
        ...(isDevelopment ? ["'unsafe-inline'"] : []),
        // Add trusted CDNs if needed (example commented out)
        // 'https://cdn.jsdelivr.net',
      ],

      // Styles: Allow self and inline styles for CSS-in-JS libraries
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Required for Chakra UI and other CSS-in-JS libraries
      ],

      // Images: Allow self, data URIs, and blob URLs
      imgSrc: [
        "'self'",
        'data:', // For inline images (base64)
        'blob:', // For generated images
        'https:', // Allow images from HTTPS sources
      ],

      // Fonts: Allow self and data URIs
      fontSrc: [
        "'self'",
        'data:',
      ],

      // Connect (AJAX, WebSocket, EventSource): API and external services
      connectSrc: [
        "'self'",
        // Supabase API endpoints
        config.supabase.url,
        // Add other API endpoints as needed
        ...(isDevelopment ? ['http://localhost:*', 'ws://localhost:*'] : []),
      ],

      // Media (audio/video): Allow self
      mediaSrc: ["'self'"],

      // Objects (embed, object, applet): Block all
      objectSrc: ["'none'"],

      // Frames: Allow self for iframes
      frameSrc: ["'self'"],

      // Form submissions: Only allow to self
      formAction: ["'self'"],

      // Frame ancestors: Prevent clickjacking by disallowing embedding
      frameAncestors: ["'none'"],

      // Base URI: Restrict base tag to self
      baseUri: ["'self'"],

      // Upgrade insecure requests in production
      ...(isProduction ? { upgradeInsecureRequests: [] } : {}),
    },
  },

  /**
   * X-Frame-Options
   * Prevents clickjacking by controlling whether the page can be embedded in frames
   */
  frameguard: {
    action: 'deny', // Completely deny framing
  },

  /**
   * X-Content-Type-Options
   * Prevents MIME type sniffing
   */
  noSniff: true,

  /**
   * Strict-Transport-Security (HSTS)
   * Forces HTTPS connections for the specified duration
   */
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true, // Apply to all subdomains
    preload: true, // Allow inclusion in browser HSTS preload lists
  },

  /**
   * Referrer-Policy
   * Controls how much referrer information is included with requests
   */
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },

  /**
   * X-DNS-Prefetch-Control
   * Controls browser DNS prefetching
   */
  dnsPrefetchControl: {
    allow: false,
  },

  /**
   * X-Download-Options
   * Prevents IE from executing downloads in site context
   */
  ieNoOpen: true,

  /**
   * X-Permitted-Cross-Domain-Policies
   * Controls cross-domain policy for Adobe products
   */
  permittedCrossDomainPolicies: {
    permittedPolicies: 'none',
  },

  /**
   * Cross-Origin-Embedder-Policy (COEP)
   * Controls loading of cross-origin resources
   */
  crossOriginEmbedderPolicy: false, // Set to true if needed for SharedArrayBuffer

  /**
   * Cross-Origin-Opener-Policy (COOP)
   * Ensures top-level document doesn't share browsing context with cross-origin documents
   */
  crossOriginOpenerPolicy: {
    policy: 'same-origin',
  },

  /**
   * Cross-Origin-Resource-Policy (CORP)
   * Controls which origins can load the resource
   */
  crossOriginResourcePolicy: {
    policy: 'same-origin',
  },

  /**
   * Origin-Agent-Cluster
   * Requests that the document be placed in an origin-keyed agent cluster
   */
  originAgentCluster: true,

  /**
   * X-XSS-Protection
   * Legacy XSS protection for older browsers (CSP is preferred)
   * Disabled as it can introduce vulnerabilities in older browsers
   */
  xssFilter: false,
};

/**
 * Additional security headers not covered by Helmet
 * These can be added manually if needed
 */
export const additionalSecurityHeaders = {
  /**
   * Permissions-Policy (formerly Feature-Policy)
   * Controls which browser features and APIs can be used
   */
  'Permissions-Policy': [
    'accelerometer=()',
    'ambient-light-sensor=()',
    'autoplay=()',
    'battery=()',
    'camera=()',
    'cross-origin-isolated=()',
    'display-capture=()',
    'document-domain=()',
    'encrypted-media=()',
    'execution-while-not-rendered=()',
    'execution-while-out-of-viewport=()',
    'fullscreen=(self)',
    'geolocation=()',
    'gyroscope=()',
    'keyboard-map=()',
    'magnetometer=()',
    'microphone=()',
    'midi=()',
    'navigation-override=()',
    'payment=()',
    'picture-in-picture=()',
    'publickey-credentials-get=()',
    'screen-wake-lock=()',
    'sync-xhr=()',
    'usb=()',
    'web-share=()',
    'xr-spatial-tracking=()',
  ].join(', '),

  /**
   * X-Robots-Tag
   * Controls search engine indexing (optional, usually handled in HTML meta tags)
   */
  // 'X-Robots-Tag': 'noindex, nofollow',
};
