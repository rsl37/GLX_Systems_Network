/**
 * GLX: Connect the World - Civic Networking Platform
 * 
 * Copyright (c) 2025 rsl37
 * Dual-licensed under PolyForm Shield 1.0.0 OR PolyForm Noncommercial 1.0.0
 * 
 * ⚠️  TERMS:
 * - Commercial use strictly prohibited without written permission from copyright holder
 * - Forking/derivative works prohibited without written permission
 * - Violations subject to legal action and damages
 * 
 * See LICENSE file in repository root for full terms.
 * Contact: roselleroberts@pm.me for licensing inquiries
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Page Verification System
 *
 * This system ensures that authentication requests only come from legitimate
 * GLX app pages by implementing a page verification mechanism.
 */

// Store of verified page tokens and their metadata
interface VerifiedPage {
  token: string;
  origin: string;
  timestamp: number;
  pageType: 'login' | 'register';
  userAgent: string;
  expiresAt: number;
}

// In-memory store for verified pages (in production, use Redis or database)
const verifiedPages = new Map<string, VerifiedPage>();

// Page verification requirements
const PAGE_VERIFICATION_CONFIG = {
  tokenExpiry: 30 * 60 * 1000, // 30 minutes
  maxTokensPerOrigin: 10,
  requiredPageElements: {
    login: [
      'GLX Civic Networking App',
      'Join GLX',
      'Create your civic network account',
      'Email',
      'Phone',
      'Password',
      'Username for Wallet',
    ],
    register: [
      'GLX Civic Networking App',
      'Join GLX',
      'Create your civic network account',
      'Username',
      'Email',
      'Password',
      'Create Account',
    ],
  },
};

/**
 * Generate a verification token for a legitimate page
 */
export function generatePageVerificationToken(
  origin: string,
  pageType: 'login' | 'register',
  userAgent: string
): string {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();

  const verifiedPage: VerifiedPage = {
    token,
    origin,
    timestamp: now,
    pageType,
    userAgent,
    expiresAt: now + PAGE_VERIFICATION_CONFIG.tokenExpiry,
  };

  // Store the verified page
  verifiedPages.set(token, verifiedPage);

  // Clean up old tokens for this origin
  cleanupTokensForOrigin(origin);

  console.log(`🔐 Generated page verification token for ${pageType} page from ${origin}`);
  return token;
}

/**
 * Verify that a page token is valid and not expired
 */
export function verifyPageToken(
  token: string,
  origin: string,
  pageType: 'login' | 'register'
): boolean {
  const verifiedPage = verifiedPages.get(token);

  if (!verifiedPage) {
    console.warn(`⚠️ Page verification failed: Token not found for ${origin}`);
    return false;
  }

  // Check if token is expired
  if (Date.now() > verifiedPage.expiresAt) {
    verifiedPages.delete(token);
    console.warn(`⚠️ Page verification failed: Token expired for ${origin}`);
    return false;
  }

  // Check if origin matches
  if (verifiedPage.origin !== origin) {
    console.warn(
      `⚠️ Page verification failed: Origin mismatch for ${origin} (expected ${verifiedPage.origin})`
    );
    return false;
  }

  // Check if page type matches
  if (verifiedPage.pageType !== pageType) {
    console.warn(
      `⚠️ Page verification failed: Page type mismatch for ${origin} (expected ${verifiedPage.pageType}, got ${pageType})`
    );
    return false;
  }

  console.log(`✅ Page verification successful for ${pageType} page from ${origin}`);
  return true;
}

/**
 * Clean up old tokens for an origin to prevent memory leaks
 */
function cleanupTokensForOrigin(origin: string): void {
  const now = Date.now();
  let tokenCount = 0;
  const tokensToDelete: string[] = [];

  for (const [token, page] of verifiedPages.entries()) {
    if (page.origin === origin) {
      if (now > page.expiresAt) {
        tokensToDelete.push(token);
      } else {
        tokenCount++;
      }
    }
  }

  // Delete expired tokens
  tokensToDelete.forEach(token => verifiedPages.delete(token));

  // If too many tokens for this origin, delete oldest ones
  if (tokenCount > PAGE_VERIFICATION_CONFIG.maxTokensPerOrigin) {
    const originTokens = Array.from(verifiedPages.entries())
      .filter(([, page]) => page.origin === origin)
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);

    const tokensToRemove = originTokens.slice(
      0,
      tokenCount - PAGE_VERIFICATION_CONFIG.maxTokensPerOrigin
    );
    tokensToRemove.forEach(([token]) => verifiedPages.delete(token));
  }
}

/**
 * Middleware to verify that auth requests come from verified pages
 */
export function requirePageVerification(req: Request, res: Response, next: NextFunction): void {
  // Skip verification in development mode (NODE_ENV undefined or 'development')
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined) {
    return next();
  }

  const origin = req.get('Origin') || req.get('Referer');
  const pageVerificationToken = req.get('X-Page-Verification-Token');
  const pageType = req.path.includes('/login') ? 'login' : 'register';

  if (!origin) {
    console.warn(`🚨 Auth request blocked: No origin header for ${req.path}`);
    res.status(403).json({
      success: false,
      error: {
        message: 'Authentication requests must include origin information',
        statusCode: 403,
      },
    });
    return;
  }

  if (!pageVerificationToken) {
    console.warn(
      `🚨 Auth request blocked: No page verification token for ${req.path} from ${origin}`
    );
    res.status(403).json({
      success: false,
      error: {
        message: 'Authentication requests must include page verification',
        statusCode: 403,
      },
    });
    return;
  }

  const isValidPage = verifyPageToken(pageVerificationToken, origin, pageType);

  if (!isValidPage) {
    console.warn(
      `🚨 Auth request blocked: Invalid page verification for ${req.path} from ${origin}`
    );
    res.status(403).json({
      success: false,
      error: {
        message: 'Authentication request from unverified page',
        statusCode: 403,
      },
    });
    return;
  }

  console.log(`✅ Auth request verified: ${req.path} from verified ${pageType} page at ${origin}`);
  next();
}

/**
 * Enhanced CORS configuration for auth endpoints with page verification
 */
export function createAuthCorsConfig() {
  return {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => {
      const isDevelopment =
        process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined;
      const isProduction = process.env.NODE_ENV === 'production';

      const allowedOrigins = [
        // Development origins
        ...(isDevelopment
          ? [
              'http://localhost:3000',
              'http://localhost:3001',
              'http://localhost:3002',
              'http://localhost:5173',
              'http://127.0.0.1:3000',
              'http://127.0.0.1:3001',
              'http://127.0.0.1:3002',
              'http://127.0.0.1:5173',
            ]
          : []),

        // Production origins - Supporting both domains
        ...(isProduction
          ? [
              "https://glx-civic-networking.vercel.app",
              "https://glxcivicnetwork.me",
              "https://www.glxcivicnetwork.me",
              "https://staging.glxcivicnetwork.me",
              'https://galax-civic-networking.vercel.app',
              'https://galaxcivicnetwork.me',
              'https://www.galaxcivicnetwork.me',
              'https://staging.galaxcivicnetwork.me',
            ]
          : []),

        // Environment-specific origins
        process.env.CLIENT_ORIGIN,
        process.env.FRONTEND_URL,
        process.env.PRODUCTION_FRONTEND_URL,
        process.env.STAGING_FRONTEND_URL,

        // Additional trusted origins from environment
        ...(process.env.TRUSTED_ORIGINS ? process.env.TRUSTED_ORIGINS.split(',') : []),
      ].filter(Boolean);

      // In development, allow requests with no origin
      if (!origin && isDevelopment) {
        return callback(null, true);
      }

      // In production, require origin for auth endpoints
      if (!origin && isProduction) {
        console.warn('🚨 Auth CORS: Blocked request with no origin in production');
        return callback(new Error('Origin required for authentication requests'));
      }

      // Check against allowed origins
      if (origin && allowedOrigins.includes(origin)) {
        console.log(`✅ Auth CORS: Allowed origin ${origin} for auth request`);
        callback(null, true);
      } else {
        console.warn(`🚨 Auth CORS: Blocked origin ${origin} for auth request`, {
          allowedOrigins: allowedOrigins.length,
          isDevelopment,
          isProduction,
          availableOrigins: allowedOrigins,
          timestamp: new Date().toISOString(),
        });
        callback(new Error('Authentication not allowed from this origin'));
      }
    },

    credentials: true,
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Page-Verification-Token',
    ],
    exposedHeaders: ['X-Request-ID', 'X-Response-Time'],
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204,
  };
}

/**
 * Periodic cleanup of expired tokens
 */
setInterval(
  () => {
    const now = Date.now();
    const expiredTokens: string[] = [];

    for (const [token, page] of verifiedPages.entries()) {
      if (now > page.expiresAt) {
        expiredTokens.push(token);
      }
    }

    expiredTokens.forEach(token => verifiedPages.delete(token));

    if (expiredTokens.length > 0) {
      console.log(`🧹 Cleaned up ${expiredTokens.length} expired page verification tokens`);
    }
  },
  5 * 60 * 1000
); // Run every 5 minutes

export { PAGE_VERIFICATION_CONFIG };
