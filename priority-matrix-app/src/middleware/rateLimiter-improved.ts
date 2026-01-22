/**
 * GLX Systems Network Monitoring Platform
 * Improved Rate Limiting with Atomic Operations
 *
 * Copyright (c) 2025 rsl37
 * Dual-licensed under PolyForm Shield 1.0.0 OR PolyForm Noncommercial 1.0.0
 *
 * IMPROVEMENTS:
 * - Atomic Redis operations (no race conditions)
 * - No memory leaks (automatic expiration in Lua script)
 * - Graceful degradation (fail open with logging)
 * - Multiple rate limit strategies
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { log } from '../utils/logger';
import { getRedis } from '../database/redis-improved';

export class RateLimiter {
  private windowMs: number;
  private maxRequests: number;
  private keyPrefix: string;
  private skipSuccessfulRequests: boolean;

  constructor(
    windowMs: number,
    maxRequests: number,
    keyPrefix: string = 'ratelimit',
    skipSuccessfulRequests: boolean = false
  ) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.keyPrefix = keyPrefix;
    this.skipSuccessfulRequests = skipSuccessfulRequests;
  }

  /**
   * Get identifier for rate limiting
   */
  private getIdentifier(req: Request): string {
    // Prefer user ID if authenticated, otherwise use IP
    if (req.user?.userId) {
      return `user:${req.user.userId}`;
    }

    // Get real IP (considering proxies)
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
    return `ip:${ip}`;
  }

  /**
   * Rate limiter middleware
   */
  public middleware() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const identifier = this.getIdentifier(req);
        const key = `${this.keyPrefix}:${identifier}`;

        const redis = await getRedis();

        // Use atomic Lua script for rate limiting
        const result = await redis.checkRateLimit(
          key,
          this.maxRequests,
          Math.ceil(this.windowMs / 1000)
        );

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', this.maxRequests);
        res.setHeader('X-RateLimit-Remaining', result.allowed ? 'available' : '0');

        if (!result.allowed) {
          res.setHeader('Retry-After', result.retryAfter);

          log.security('Rate limit exceeded', {
            identifier,
            limit: this.maxRequests,
            window: this.windowMs,
            url: req.originalUrl,
          });

          res.status(429).json({
            error: 'Too many requests',
            message: 'Please try again later',
            retryAfter: result.retryAfter,
          });
          return;
        }

        // If skipSuccessfulRequests, decrement on error
        if (this.skipSuccessfulRequests) {
          res.on('finish', async () => {
            if (res.statusCode >= 400) {
              // This was an error - don't count it
              try {
                const redis = await getRedis();
                await redis.getClient().decr(key);
              } catch (err) {
                // Ignore errors in cleanup
              }
            }
          });
        }

        next();
      } catch (error: any) {
        log.error('Rate limiter error', {
          error: error.message,
          url: req.originalUrl,
        });

        // Fail open - allow request if rate limiter fails
        // But log security concern
        log.security('Rate limiter failed - allowing request (fail open)', {
          url: req.originalUrl,
          error: error.message,
        });

        next();
      }
    };
  }
}

/**
 * DDoS Protection with IP blocking
 */
export class DDosProtection {
  private suspiciousThreshold: number;
  private blockDuration: number;
  private windowSeconds: number;

  constructor(
    suspiciousThreshold: number = 1000,
    blockDuration: number = 3600,
    windowSeconds: number = 60
  ) {
    this.suspiciousThreshold = suspiciousThreshold;
    this.blockDuration = blockDuration;
    this.windowSeconds = windowSeconds;
  }

  public middleware() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';

        const redis = await getRedis();

        // Check if IP is blocked
        const isBlocked = await redis.exists(`blocked:${ip}`);
        if (isBlocked) {
          log.security('Blocked IP attempted access', {
            ip,
            url: req.originalUrl,
          });
          res.status(403).json({ error: 'Access denied - IP temporarily blocked' });
          return;
        }

        // Check request rate
        const result = await redis.checkRateLimit(
          `ddos:${ip}`,
          this.suspiciousThreshold,
          this.windowSeconds
        );

        if (!result.allowed) {
          // Block the IP
          await redis.set(`blocked:${ip}`, '1', this.blockDuration);

          log.security('IP blocked due to suspicious activity', {
            ip,
            threshold: this.suspiciousThreshold,
            blockDuration: this.blockDuration,
          });

          res.status(403).json({
            error: 'Too many requests',
            message: 'Your IP has been temporarily blocked',
          });
          return;
        }

        next();
      } catch (error: any) {
        log.error('DDoS protection error', { error: error.message });
        // Fail open - allow request if DDoS protection fails
        next();
      }
    };
  }

  /**
   * Manually block an IP address
   */
  public async blockIP(ip: string, duration?: number): Promise<void> {
    const blockDuration = duration || this.blockDuration;
    const redis = await getRedis();
    await redis.set(`blocked:${ip}`, '1', blockDuration);
    log.security('IP manually blocked', { ip, duration: blockDuration });
  }

  /**
   * Unblock an IP address
   */
  public async unblockIP(ip: string): Promise<void> {
    const redis = await getRedis();
    await redis.delete(`blocked:${ip}`);
    log.security('IP manually unblocked', { ip });
  }

  /**
   * Check if IP is blocked
   */
  public async isBlocked(ip: string): Promise<boolean> {
    const redis = await getRedis();
    return await redis.exists(`blocked:${ip}`);
  }
}

// Export pre-configured instances
export const apiRateLimiter = new RateLimiter(
  config.security.rateLimit.windowMs,
  config.security.rateLimit.maxRequests,
  'api'
);

export const authRateLimiter = new RateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  'auth',
  true // Skip successful requests
);

export const sensitiveOperationLimiter = new RateLimiter(
  60 * 60 * 1000, // 1 hour
  10,
  'sensitive'
);

export const ddosProtection = new DDosProtection(
  1000, // 1000 requests per minute
  3600, // 1 hour block
  60 // 1 minute window
);

/**
 * Apply rate limiting based on endpoint sensitivity
 */
export function getRateLimiter(sensitivity: 'low' | 'medium' | 'high' | 'critical'): RateLimiter {
  switch (sensitivity) {
    case 'low':
      return new RateLimiter(60 * 1000, 300, 'low'); // 300/min
    case 'medium':
      return apiRateLimiter;
    case 'high':
      return new RateLimiter(60 * 1000, 30, 'high'); // 30/min
    case 'critical':
      return authRateLimiter;
    default:
      return apiRateLimiter;
  }
}
