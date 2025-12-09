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

/*
 * Copyright (c) 2025 GLX Civic Networking App
 *
 * Security Tests for WebSocket Security Middleware
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  WebSocketSecurityMiddleware,
  defaultSecurityConfig,
} from '../../server/middleware/websocket-security.js';

describe('WebSocket Security Middleware', () => {
  let securityMiddleware: WebSocketSecurityMiddleware;

  beforeEach(() => {
    securityMiddleware = new WebSocketSecurityMiddleware(defaultSecurityConfig);
  });

  describe('Origin Validation', () => {
    it('should accept allowed origins', () => {
      const result = securityMiddleware.validateOrigin('https://glx-civic-platform.vercel.app');
      expect(result).toBe(true);
    });

    it('should reject unauthorized origins', () => {
      const result = securityMiddleware.validateOrigin('https://malicious-site.com');
      expect(result).toBe(false);
    });

    it('should reject empty origin', () => {
      const result = securityMiddleware.validateOrigin('');
      expect(result).toBe(false);
    });

    it('should handle wildcard origins', () => {
      const config = { ...defaultSecurityConfig, allowedOrigins: ['*.example.com'] };
      const middleware = new WebSocketSecurityMiddleware(config);

      expect(middleware.validateOrigin('https://app.example.com')).toBe(true);
      expect(middleware.validateOrigin('https://api.example.com')).toBe(true);
      expect(middleware.validateOrigin('https://malicious.com')).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it('should allow connections under rate limit', () => {
      for (let i = 0; i < defaultSecurityConfig.maxConnectionsPerIP; i++) {
        const result = securityMiddleware.checkConnectionRateLimit('192.168.1.1');
        expect(result).toBe(true);
      }
    });

    it('should block connections over rate limit', () => {
      // Exceed the rate limit
      for (let i = 0; i <= defaultSecurityConfig.maxConnectionsPerIP; i++) {
        securityMiddleware.checkConnectionRateLimit('192.168.1.1');
      }

      const result = securityMiddleware.checkConnectionRateLimit('192.168.1.1');
      expect(result).toBe(false);
    });

    it('should allow message sending under rate limit', () => {
      for (let i = 0; i < defaultSecurityConfig.maxMessagesPerMinute; i++) {
        const result = securityMiddleware.checkMessageRateLimit('user123');
        expect(result).toBe(true);
      }
    });

    it('should block messages over rate limit', () => {
      // Exceed the message rate limit
      for (let i = 0; i <= defaultSecurityConfig.maxMessagesPerMinute; i++) {
        securityMiddleware.checkMessageRateLimit('user123');
      }

      const result = securityMiddleware.checkMessageRateLimit('user123');
      expect(result).toBe(false);
    });
  });

  describe('Message Validation', () => {
    it('should validate clean messages', () => {
      const message = 'Hello, this is a normal civic message';
      const result = securityMiddleware.validateMessage(message);

      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe(message);
      expect(result.threats).toHaveLength(0);
    });

    it('should detect and block XSS attempts', () => {
      const message = '<script>alert("xss")</script>';
      const result = securityMiddleware.validateMessage(message);

      expect(result.isValid).toBe(false);
      expect(result.threats.length).toBeGreaterThan(0);
      expect(result.sanitized).not.toContain('<script>');
    });

    it('should detect SQL injection attempts', () => {
      const message = "'; DROP TABLE users; --";
      const result = securityMiddleware.validateMessage(message);

      expect(result.isValid).toBe(false);
      expect(result.threats.length).toBeGreaterThan(0);
    });

    it('should sanitize HTML content', () => {
      const message = '<div>Hello <b>world</b></div>';
      const result = securityMiddleware.validateMessage(message);

      expect(result.sanitized).not.toContain('<div>');
      expect(result.sanitized).not.toContain('<b>');
      expect(result.sanitized).toContain('Hello world');
    });

    it('should reject overly long messages', () => {
      const message = 'a'.repeat(2000); // Exceeds 1000 char limit
      const result = securityMiddleware.validateMessage(message);

      expect(result.isValid).toBe(false);
      expect(result.threats).toContain('Message too long');
    });

    it('should reject invalid message types', () => {
      const result1 = securityMiddleware.validateMessage(null as any);
      const result2 = securityMiddleware.validateMessage(123 as any);
      const result3 = securityMiddleware.validateMessage({} as any);

      expect(result1.isValid).toBe(false);
      expect(result2.isValid).toBe(false);
      expect(result3.isValid).toBe(false);
    });
  });

  describe('JWT Token Validation', () => {
    it('should validate proper JWT format', () => {
      const validToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywiZXhwIjoxNjQwOTk1MjAwfQ.signature';
      const result = securityMiddleware.validateTokenFormat(validToken);
      expect(result).toBe(true);
    });

    it('should reject invalid JWT format', () => {
      const invalidTokens = [
        'invalid.token',
        'too.many.parts.here',
        '',
        null,
        undefined,
        'notbase64!@#$.invalid$.chars',
      ];

      invalidTokens.forEach(token => {
        const result = securityMiddleware.validateTokenFormat(token as any);
        expect(result).toBe(false);
      });
    });
  });

  describe('CSWH Detection', () => {
    it('should detect missing origin header', () => {
      const headers = { host: 'localhost:3000' };
      const result = securityMiddleware.detectCSWH(headers, '');
      expect(result).toBe(true);
    });

    it('should detect origin/host mismatch', () => {
      const headers = { host: 'localhost:3000' };
      const origin = 'https://malicious-site.com';
      const result = securityMiddleware.detectCSWH(headers, origin);
      expect(result).toBe(true);
    });

    it('should detect suspicious user agents', () => {
      const headers = {
        host: 'localhost:3000',
        'user-agent': 'curl/7.68.0',
      };
      const origin = 'https://localhost:3000';
      const result = securityMiddleware.detectCSWH(headers, origin);
      expect(result).toBe(true);
    });

    it('should allow legitimate browser requests', () => {
      const headers = {
        host: 'localhost:3000',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      };
      const origin = 'https://localhost:3000';
      const result = securityMiddleware.detectCSWH(headers, origin);
      expect(result).toBe(false);
    });
  });

  describe('Security Event Logging', () => {
    it('should log security events with proper structure', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      securityMiddleware.logSecurityEvent('test_event', { test: 'data' }, 'high');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Security Event [HIGH]'));

      consoleSpy.mockRestore();
    });

    it('should include all required fields in security events', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(message => {
        const eventData = JSON.parse(message.split('Security Event [HIGH]: ')[1]);

        expect(eventData).toHaveProperty('timestamp');
        expect(eventData).toHaveProperty('type', 'test_event');
        expect(eventData).toHaveProperty('severity', 'high');
        expect(eventData).toHaveProperty('details');
        expect(eventData).toHaveProperty('source', 'WebSocketSecurity');
      });

      securityMiddleware.logSecurityEvent('test_event', { test: 'data' }, 'high');

      consoleSpy.mockRestore();
    });
  });

  describe('Rate Limit Status', () => {
    it('should provide accurate rate limit status', () => {
      // Create some connections and messages
      securityMiddleware.checkConnectionRateLimit('192.168.1.1');
      securityMiddleware.checkConnectionRateLimit('192.168.1.2');
      securityMiddleware.checkMessageRateLimit('user1');
      securityMiddleware.checkAuthRateLimit('192.168.1.1');

      const status = securityMiddleware.getRateLimitStatus();

      expect(status).toHaveProperty('connections');
      expect(status).toHaveProperty('messages');
      expect(status).toHaveProperty('authAttempts');
      expect(status).toHaveProperty('lastReset');
      expect(typeof status.lastReset).toBe('string');
    });
  });
});
