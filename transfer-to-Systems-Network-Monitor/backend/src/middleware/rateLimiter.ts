/**
 * GLX Systems Network Monitoring Platform
 * Rate Limiting and DDoS Protection
 *
 * Copyright (c) 2025 rsl37
 * Dual-licensed under PolyForm Shield 1.0.0 OR PolyForm Noncommercial 1.0.0
 */

import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { Request, Response } from 'express';
import { config } from '../config';
import { log } from '../utils/logger';
import { redis } from '../database/redis';

/**
 * Standard rate limiter for API endpoints
 */
export const apiRateLimiter = rateLimit({
  windowMs: config.security.rateLimit.windowMs, // 15 minutes
  max: config.security.rateLimit.maxRequests, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    log.security('Rate limit exceeded', {
      ip: req.ip,
      url: req.originalUrl,
      userAgent: req.get('user-agent'),
    });
    res.status(429).json({
      error: 'Too many requests',
      message: 'Please try again later',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
  skip: (req: Request) => {
    // Skip rate limiting for health check endpoints
    return req.path === '/health';
  },
});

/**
 * Strict rate limiter for authentication endpoints
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req: Request, res: Response) => {
    log.security('Auth rate limit exceeded', {
      ip: req.ip,
      url: req.originalUrl,
      email: req.body.email,
    });
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'Please try again after 15 minutes',
    });
  },
});

/**
 * Stricter rate limiter for sensitive operations
 */
export const sensitiveOperationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    log.security('Sensitive operation rate limit exceeded', {
      ip: req.ip,
      url: req.originalUrl,
      userId: req.user?.userId,
    });
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many sensitive operations. Please try again later.',
    });
  },
});

/**
 * Speed limiter - gradually slows down requests
 */
export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // Allow 50 requests per window at full speed
  delayMs: (hits) => hits * 100, // Add 100ms delay per request after delayAfter
  maxDelayMs: 3000, // Maximum delay of 3 seconds
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

/**
 * Custom Redis-based rate limiter for fine-grained control
 */
export class RedisRateLimiter {
  private windowSize: number;
  private maxRequests: number;

  constructor(windowSize: number, maxRequests: number) {
    this.windowSize = windowSize;
    this.maxRequests = maxRequests;
  }

  public middleware() {
    return async (req: Request, res: Response, next: Function): Promise<void> => {
      try {
        const identifier = this.getIdentifier(req);
        const key = `ratelimit:${identifier}`;

        // Increment request count
        const currentCount = await redis.increment(key);

        // Set expiration on first request
        if (currentCount === 1) {
          await redis.expire(key, Math.ceil(this.windowSize / 1000));
        }

        // Get TTL
        const ttl = await redis.ttl(key);

        // Set headers
        res.setHeader('X-RateLimit-Limit', this.maxRequests);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, this.maxRequests - currentCount));
        res.setHeader('X-RateLimit-Reset', Date.now() + ttl * 1000);

        // Check if limit exceeded
        if (currentCount > this.maxRequests) {
          log.security('Redis rate limit exceeded', {
            identifier,
            currentCount,
            maxRequests: this.maxRequests,
            url: req.originalUrl,
          });

          res.status(429).json({
            error: 'Rate limit exceeded',
            retryAfter: ttl,
          });
          return;
        }

        next();
      } catch (error: any) {
        log.error('Rate limiter error', { error: error.message });
        // Fail open - allow request if rate limiter fails
        next();
      }
    };
  }

  private getIdentifier(req: Request): string {
    // Use user ID if authenticated, otherwise use IP
    if (req.user?.userId) {
      return `user:${req.user.userId}`;
    }
    return `ip:${req.ip}`;
  }
}

/**
 * IP-based request tracker for DDoS detection
 */
export class DDosProtection {
  private suspiciousThreshold: number;
  private blockDuration: number;

  constructor(suspiciousThreshold: number = 1000, blockDuration: number = 3600) {
    this.suspiciousThreshold = suspiciousThreshold;
    this.blockDuration = blockDuration;
  }

  public middleware() {
    return async (req: Request, res: Response, next: Function): Promise<void> => {
      try {
        const ip = req.ip || 'unknown';

        // Check if IP is blocked
        const isBlocked = await redis.exists(`blocked:${ip}`);
        if (isBlocked) {
          log.security('Blocked IP attempted access', {
            ip,
            url: req.originalUrl,
          });
          res.status(403).json({ error: 'Access denied' });
          return;
        }

        // Track requests per IP
        const requestKey = `ddos:${ip}`;
        const requestCount = await redis.increment(requestKey);

        // Set expiration on first request (1 minute window)
        if (requestCount === 1) {
          await redis.expire(requestKey, 60);
        }

        // Check if threshold exceeded
        if (requestCount > this.suspiciousThreshold) {
          // Block the IP
          await redis.set(`blocked:${ip}`, '1', this.blockDuration);

          log.security('IP blocked due to suspicious activity', {
            ip,
            requestCount,
            threshold: this.suspiciousThreshold,
          });

          res.status(403).json({
            error: 'Too many requests',
            message: 'Your IP has been temporarily blocked',
          });
          return;
        }

        // Warn if approaching threshold
        if (requestCount > this.suspiciousThreshold * 0.8) {
          log.warn('IP approaching DDoS threshold', {
            ip,
            requestCount,
            threshold: this.suspiciousThreshold,
          });
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
    await redis.set(`blocked:${ip}`, '1', blockDuration);
    log.security('IP manually blocked', { ip, duration: blockDuration });
  }

  /**
   * Unblock an IP address
   */
  public async unblockIP(ip: string): Promise<void> {
    await redis.delete(`blocked:${ip}`);
    log.security('IP manually unblocked', { ip });
  }

  /**
   * Check if IP is blocked
   */
  public async isBlocked(ip: string): Promise<boolean> {
    return await redis.exists(`blocked:${ip}`);
  }
}

// Export pre-configured instances
export const ddosProtection = new DDosProtection();
export const perUserLimiter = new RedisRateLimiter(15 * 60 * 1000, 200);
export const perIPLimiter = new RedisRateLimiter(15 * 60 * 1000, 100);
