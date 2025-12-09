/**
 * GLX: Connect the World - Civic Networking Platform
 * 
 * Copyright (c) 2025 rsl37
 * Licensed under PolyForm Shield License 1.0.0
 * 
 * ⚠️  TERMS:
 * - Commercial use strictly prohibited without written permission from copyright holder
 * - Forking/derivative works prohibited without written permission
 * - Violations subject to legal action and damages
 * 
 * See LICENSE file in repository root for full terms.
 * Contact: roselleroberts@pm.me for licensing inquiries
 */

import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

interface SecurityConfig {
  maxConnectionsPerIP: number;
  maxMessagesPerMinute: number;
  maxAuthAttemptsPerMinute: number;
  allowedOrigins: string[];
  blockSuspiciousPatterns: boolean;
}

interface RateLimitState {
  connections: Map<string, number>;
  messages: Map<string, number>;
  authAttempts: Map<string, number>;
  lastReset: number;
}

export class WebSocketSecurityMiddleware {
  private config: SecurityConfig;
  private rateLimitState: RateLimitState;
  private suspiciousPatterns: RegExp[];

  constructor(config: SecurityConfig) {
    this.config = config;
    this.rateLimitState = {
      connections: new Map(),
      messages: new Map(),
      authAttempts: new Map(),
      lastReset: Date.now(),
    };

    // Common injection patterns to detect
    this.suspiciousPatterns = [
      /<script.*?>.*?<\/script>/gi, // XSS attempts
      /javascript\s*:/gi, // JavaScript protocol
      /on\w+\s*=.*?["']/gi, // Event handlers
      /eval\s*\(/gi, // Code evaluation
      /expression\s*\(/gi, // CSS expressions
      /vbscript\s*:/gi, // VBScript protocol
      /data\s*:\s*text\/html/gi, // Data URI HTML
      /\bUNION\b.*?\bSELECT\b/gi, // SQL injection
      /\bDROP\b.*?\bTABLE\b/gi, // SQL injection
      /\bINSERT\b.*?\bINTO\b/gi, // SQL injection
    ];

    // Reset counters every minute
    setInterval(() => {
      this.resetCounters();
    }, 60000);
  }

  /**
   * Validate WebSocket connection origin
   */
  validateOrigin(origin: string): boolean {
    if (!origin) {
      console.warn('🚨 WebSocket connection without origin header');
      return false;
    }

    // Check against allowed origins
    const isAllowed = this.config.allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin === '*') return true;
      if (allowedOrigin.startsWith('*.')) {
        const domain = allowedOrigin.substring(2);
        return origin.endsWith(domain);
      }
      return origin === allowedOrigin;
    });

    if (!isAllowed) {
      console.warn(`🚨 WebSocket connection from unauthorized origin: ${origin}`);
    }

    return isAllowed;
  }

  /**
   * Check connection rate limit for IP
   */
  checkConnectionRateLimit(ip: string): boolean {
    const currentCount = this.rateLimitState.connections.get(ip) || 0;

    if (currentCount >= this.config.maxConnectionsPerIP) {
      console.warn(
        `🚨 Connection rate limit exceeded for IP: ${ip} (${currentCount}/${this.config.maxConnectionsPerIP})`
      );
      return false;
    }

    this.rateLimitState.connections.set(ip, currentCount + 1);
    return true;
  }

  /**
   * Check message rate limit for user
   */
  checkMessageRateLimit(userId: string): boolean {
    const currentCount = this.rateLimitState.messages.get(userId) || 0;

    if (currentCount >= this.config.maxMessagesPerMinute) {
      console.warn(
        `🚨 Message rate limit exceeded for user: ${userId} (${currentCount}/${this.config.maxMessagesPerMinute})`
      );
      return false;
    }

    this.rateLimitState.messages.set(userId, currentCount + 1);
    return true;
  }

  /**
   * Check authentication attempt rate limit
   */
  checkAuthRateLimit(ip: string): boolean {
    const currentCount = this.rateLimitState.authAttempts.get(ip) || 0;

    if (currentCount >= this.config.maxAuthAttemptsPerMinute) {
      console.warn(
        `🚨 Auth rate limit exceeded for IP: ${ip} (${currentCount}/${this.config.maxAuthAttemptsPerMinute})`
      );
      return false;
    }

    this.rateLimitState.authAttempts.set(ip, currentCount + 1);
    return true;
  }

  /**
   * Validate and sanitize message content
   */
  validateMessage(message: string): { isValid: boolean; sanitized: string; threats: string[] } {
    const threats: string[] = [];
    let sanitized = message;

    if (!message || typeof message !== 'string') {
      return { isValid: false, sanitized: '', threats: ['Invalid message format'] };
    }

    // Check message length
    if (message.length > 1000) {
      threats.push('Message too long');
      return { isValid: false, sanitized: '', threats };
    }

    // Check for suspicious patterns
    if (this.config.blockSuspiciousPatterns) {
      for (const pattern of this.suspiciousPatterns) {
        if (pattern.test(message)) {
          threats.push(`Suspicious pattern detected: ${pattern.source}`);
        }
      }
    }

    // Basic HTML/Script sanitization
    sanitized = message
      .replace(/<script.*?>.*?<\/script>/gi, '')
      .replace(/<.*?>/g, '') // Remove all HTML tags
      .replace(/javascript\s*:/gi, '')
      .replace(/on\w+\s*=.*?["']/gi, '')
      .trim();

    // Check for remaining threats after sanitization
    const isValid = threats.length === 0;

    if (!isValid) {
      console.warn(`🚨 Malicious message detected from user: ${threats.join(', ')}`);
    }

    return { isValid, sanitized, threats };
  }

  /**
   * Validate JWT token format and structure
   */
  validateTokenFormat(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    // Basic JWT format validation (3 parts separated by dots)
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.warn('🚨 Invalid JWT format - incorrect number of parts');
      return false;
    }

    // Check if parts are base64 encoded
    try {
      for (const part of parts) {
        if (!part || part.length === 0) {
          return false;
        }
        // Basic base64 validation
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(part)) {
          return false;
        }
      }
    } catch (error) {
      console.warn('🚨 Invalid JWT format - base64 validation failed');
      return false;
    }

    return true;
  }

  /**
   * Check for Cross-Site WebSocket Hijacking (CSWH) indicators
   */
  detectCSWH(headers: any, origin: string): boolean {
    // Check for missing or invalid origin
    if (!origin) {
      console.warn('🚨 Potential CSWH: Missing origin header');
      return true;
    }

    // Check for mismatched origin and host
    const host = headers.host;
    if (host && origin) {
      const originHost = new URL(origin).hostname;
      if (originHost !== host && !this.config.allowedOrigins.includes(origin)) {
        console.warn(`🚨 Potential CSWH: Origin (${originHost}) doesn't match host (${host})`);
        return true;
      }
    }

    // Check for suspicious user agent patterns
    const userAgent = headers['user-agent'];
    if (userAgent) {
      const suspiciousAgents = [/curl/i, /wget/i, /python/i, /java/i, /go-http/i, /node/i];

      if (suspiciousAgents.some(pattern => pattern.test(userAgent))) {
        console.warn(`🚨 Potential CSWH: Suspicious user agent: ${userAgent}`);
        return true;
      }
    }

    return false;
  }

  /**
   * Log security event for monitoring
   */
  logSecurityEvent(type: string, details: any, severity: 'low' | 'medium' | 'high' | 'critical') {
    const event = {
      timestamp: new Date().toISOString(),
      type,
      severity,
      details,
      source: 'WebSocketSecurity',
    };

    console.log(`🔒 Security Event [${severity.toUpperCase()}]: ${JSON.stringify(event)}`);

    // In production, this would send to a security monitoring system
    // For now, we'll just log to console and potentially to a file
  }

  /**
   * Reset rate limiting counters
   */
  private resetCounters() {
    const now = Date.now();

    // Only reset if a minute has passed
    if (now - this.rateLimitState.lastReset >= 60000) {
      this.rateLimitState.connections.clear();
      this.rateLimitState.messages.clear();
      this.rateLimitState.authAttempts.clear();
      this.rateLimitState.lastReset = now;

      console.log('🔄 WebSocket rate limit counters reset');
    }
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus() {
    return {
      connections: this.rateLimitState.connections.size,
      messages: this.rateLimitState.messages.size,
      authAttempts: this.rateLimitState.authAttempts.size,
      lastReset: new Date(this.rateLimitState.lastReset).toISOString(),
    };
  }

  /**
   * Express middleware for WebSocket security
   */
  getExpressMiddleware() {
    return rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: this.config.maxConnectionsPerIP,
      message: 'Too many WebSocket connection attempts from this IP',
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req: Request, res: Response) => {
        this.logSecurityEvent(
          'rate_limit_exceeded',
          {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            endpoint: 'websocket_connection',
          },
          'medium'
        );

        res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: '60 seconds',
        });
      },
    });
  }
}

// Default security configuration
export const defaultSecurityConfig: SecurityConfig = {
  maxConnectionsPerIP: 10,
  maxMessagesPerMinute: 60,
  maxAuthAttemptsPerMinute: 5,
  allowedOrigins: [
    'https://glx-civic-platform.vercel.app',
    'https://localhost:3000',
    'https://127.0.0.1:3000',
  ],
  blockSuspiciousPatterns: true,
};

export default WebSocketSecurityMiddleware;
