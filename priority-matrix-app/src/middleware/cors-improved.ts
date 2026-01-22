/**
 * GLX Systems Network Monitoring Platform
 * Secure CORS Configuration
 *
 * Copyright (c) 2025 rsl37
 * Dual-licensed under PolyForm Shield 1.0.0 OR PolyForm Noncommercial 1.0.0
 *
 * IMPROVEMENTS:
 * - Proper origin validation with regex support
 * - No automatic allowance for no-origin requests
 * - Whitelist with subdomain support
 * - Environment-specific defaults
 */

import { CorsOptions } from 'cors';
import { Request } from 'express';
import { config } from '../config';
import { log } from '../utils/logger';

interface OriginPattern {
  pattern: RegExp | string;
  allowSubdomains: boolean;
}

class CorsValidator {
  private allowedOrigins: OriginPattern[] = [];
  private allowNoOrigin: boolean = false;

  constructor() {
    this.initializeAllowedOrigins();
  }

  private initializeAllowedOrigins(): void {
    const originsConfig = config.security.corsOrigins;

    // Parse allowed origins
    for (const origin of originsConfig) {
      if (origin === '*') {
        // Only allow wildcard in development
        if (config.app.env !== 'production') {
          this.allowNoOrigin = true;
          log.warn('CORS wildcard (*) enabled - DEVELOPMENT ONLY');
        } else {
          log.error('CORS wildcard (*) not allowed in production');
        }
      } else if (origin.startsWith('*.')) {
        // Subdomain wildcard: *.example.com
        const domain = origin.substring(2);
        this.allowedOrigins.push({
          pattern: new RegExp(`^https?://([a-z0-9-]+\\.)*${this.escapeRegex(domain)}$`, 'i'),
          allowSubdomains: true,
        });
      } else if (origin.includes('*')) {
        // Other wildcard patterns
        const regexPattern = origin
          .replace(/\./g, '\\.')
          .replace(/\*/g, '[a-z0-9-]+');
        this.allowedOrigins.push({
          pattern: new RegExp(`^${regexPattern}$`, 'i'),
          allowSubdomains: false,
        });
      } else {
        // Exact match
        this.allowedOrigins.push({
          pattern: origin,
          allowSubdomains: false,
        });
      }
    }

    log.info('CORS origins configured', {
      count: this.allowedOrigins.length,
      allowNoOrigin: this.allowNoOrigin,
    });
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Check if origin is allowed
   */
  public isOriginAllowed(origin: string | undefined): boolean {
    // No origin header
    if (!origin) {
      // Only allow no-origin in development or for specific trusted scenarios
      if (this.allowNoOrigin) {
        log.debug('No origin header - allowed in development');
        return true;
      }

      // In production, no-origin requests must be explicitly allowed
      // (e.g., mobile apps, Electron apps, server-to-server)
      if (config.app.env === 'production') {
        log.security('Request with no origin header blocked in production');
        return false;
      }

      return false;
    }

    // Check against allowed origins
    for (const allowed of this.allowedOrigins) {
      if (typeof allowed.pattern === 'string') {
        // Exact match
        if (origin === allowed.pattern) {
          return true;
        }
      } else {
        // Regex match
        if (allowed.pattern.test(origin)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get the origin to set in Access-Control-Allow-Origin header
   * Returns the origin if allowed, otherwise null
   */
  public getAllowedOrigin(origin: string | undefined): string | null {
    if (this.isOriginAllowed(origin)) {
      // Return the specific origin (never return *)
      return origin || 'null';
    }

    return null;
  }
}

// Create singleton validator
const corsValidator = new CorsValidator();

/**
 * CORS options for Express cors middleware
 */
export const corsOptions: CorsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowed = corsValidator.isOriginAllowed(origin);

    if (allowed) {
      callback(null, true);
    } else {
      log.security('CORS blocked request from unauthorized origin', {
        origin: origin || 'no-origin',
      });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-API-Key',
    'X-Request-ID',
    'X-CSRF-Token',
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
  ],
  maxAge: 86400, // 24 hours
};

/**
 * Manual CORS validation for SSE and WebSocket
 */
export function validateOrigin(req: Request): boolean {
  const origin = req.headers.origin;
  return corsValidator.isOriginAllowed(origin);
}

/**
 * Get allowed origin header value
 */
export function getAllowedOriginHeader(req: Request): string | null {
  const origin = req.headers.origin;
  return corsValidator.getAllowedOrigin(origin);
}

/**
 * Check if request is same-origin
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.origin;
  if (!origin) {
    return true; // No origin header typically means same-origin
  }

  const host = req.headers.host;
  const protocol = req.protocol;

  const requestOrigin = `${protocol}://${host}`;

  return origin === requestOrigin;
}

export default corsOptions;
