/*
 * Copyright © 2025 GLX Civic Networking.
 * Licensed under the PolyForm Shield License 1.0.0.
 * "GLX" and related concepts are inspired by Gatchaman Crowds © Tatsunoko Production.
 * This project is unaffiliated with Tatsunoko Production or the original anime.
 */


import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { validateEnvironment } from '../../server/envValidation.js';

describe('JWT Security Integration Tests', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Environment validation integration', () => {
    it('should detect weak patterns in comprehensive validation', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'password123-make-it-long-enough-for-minimum-32-characters';
      process.env.JWT_REFRESH_SECRET = 'secret123-make-it-long-enough-for-minimum-32-characters';
      process.env.CLIENT_ORIGIN = 'https://example.com';

      const result = validateEnvironment();

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('JWT_SECRET security validation failed'))).toBe(true);
      expect(result.errors.some(e => e.includes('JWT_REFRESH_SECRET security validation failed'))).toBe(true);
    });

    it('should pass validation with strong secrets', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'K8x$mP9#vR2@nL5!wQ7^eT4&yU6*iO3%aS1$dF8#gH2@jK9!zX3^cV7&bN4*mL8!';
      process.env.JWT_REFRESH_SECRET = 'Tr7$pL9#mN4@vB8!qW3^eR6&tY2*uI5%oP1$aS8#dF4@gH7!wE3^rT6&yU9*iO2%';
      process.env.CLIENT_ORIGIN = 'https://example.com';

      const result = validateEnvironment();

      // Should not have JWT-related errors
      expect(result.errors.filter(e => e.includes('JWT')).length).toBe(0);
    });

    it('should detect hardcoded default secrets', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'your-secret-key-made-long-enough-for-64-character-minimum-requirement';
      process.env.JWT_REFRESH_SECRET = 'your-refresh-secret-key-made-long-enough-for-64-character-min';
      process.env.CLIENT_ORIGIN = 'https://example.com';

      const result = validateEnvironment();

      expect(result.isValid).toBe(false);
      // Should detect weak patterns or provide security-related recommendations
      const hasSecurityIssues = result.errors.some(e => e.includes('security validation failed')) ||
                                result.errors.some(e => e.includes('critical security weaknesses'));
      expect(hasSecurityIssues).toBe(true);
    });

    it('should validate in development mode with warnings', () => {
      process.env.NODE_ENV = 'development';
      process.env.JWT_SECRET = 'test-test-test-test-test-test-test-test-test'; // Contains 'test' pattern
      process.env.JWT_REFRESH_SECRET = 'development-development-development-development'; // Contains 'development' pattern
      process.env.CLIENT_ORIGIN = 'http://localhost:3000';

      const result = validateEnvironment();

      // Should have warnings about weak patterns or security concerns
      const hasSecurityWarnings = result.warnings.some(w => w.includes('JWT_SECRET has security concerns')) ||
                                  result.warnings.some(w => w.includes('JWT_REFRESH_SECRET has security concerns')) ||
                                  result.errors.some(e => e.includes('security validation failed'));
      expect(hasSecurityWarnings).toBe(true);
    });

    it('should provide helpful recommendations for weak secrets', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'admin-admin-admin-admin-admin-admin-admin';
      process.env.CLIENT_ORIGIN = 'https://example.com';

      const result = validateEnvironment();

      expect(result.recommendations.some(r => r.includes('openssl rand -hex 32'))).toBe(true);
    });
  });
});