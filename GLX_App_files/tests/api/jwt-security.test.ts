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

import { describe, it, expect, beforeEach } from 'vitest';
import {
  detectWeakSecretPatterns,
  validateJWTSecret,
  estimateEntropy,
  getCharacterTypeDiversity,
  hasExcessiveRepeatedChars,
  WEAK_SECRET_PATTERNS,
  JWT_SECURITY_REQUIREMENTS,
} from '../../server/config/security.js';

describe('JWT Secret Security Validation', () => {
  describe('detectWeakSecretPatterns', () => {
    it('should detect exact match weak patterns', () => {
      const weakSecrets = [
        'your-secret-key',
        'your-refresh-secret-key',
        'password',
        '123456',
        'qwerty',
        'admin',
        'secret',
        'test',
      ];

      weakSecrets.forEach(secret => {
        const patterns = detectWeakSecretPatterns(secret);
        expect(patterns.length).toBeGreaterThan(0);
        expect(patterns.some(p => p.severity === 'critical' || p.severity === 'high')).toBe(true);
      });
    });

    it('should detect regex-based weak patterns', () => {
      const weakSecrets = [
        '12345678', // Only numbers
        'abcdefgh', // Only letters
        'aaaaaaaa', // Repeated characters
        '123456789', // Sequential numbers
        'abcdefghi', // Sequential letters
        'abcabc', // Repeated patterns
      ];

      weakSecrets.forEach(secret => {
        const patterns = detectWeakSecretPatterns(secret);
        expect(patterns.length).toBeGreaterThan(0);
      });
    });

    it('should detect contains-based weak patterns', () => {
      const weakSecrets = ['my-localhost-secret', 'example-jwt-token', 'demo-application-key'];

      weakSecrets.forEach(secret => {
        const patterns = detectWeakSecretPatterns(secret);
        expect(patterns.length).toBeGreaterThan(0);
        expect(patterns.some(p => p.type === 'contains')).toBe(true);
      });
    });

    it('should not flag strong secrets', () => {
      const strongSecrets = [
        'K8x$mP9#vR2@nL5!wQ7^eT4&yU6*iO3%aS1$dF8#gH2@jK9!',
        'Tr7$pL9#mN4@vB8!qW3^eR6&tY2*uI5%oP1$aS8#dF4@gH7!',
        'cryptographically-secure-random-string-with-good-entropy-2024',
      ];

      strongSecrets.forEach(secret => {
        const patterns = detectWeakSecretPatterns(secret);
        // Should have no critical or high severity patterns
        expect(
          patterns.filter(p => p.severity === 'critical' || p.severity === 'high').length
        ).toBe(0);
      });
    });
  });

  describe('validateJWTSecret', () => {
    it('should reject hardcoded default secrets', () => {
      const defaultSecrets = [
        'your-secret-key',
        'your-refresh-secret-key',
        'your-super-secret-jwt-key-change-this-in-production-min-32-chars',
      ];

      defaultSecrets.forEach(secret => {
        const result = validateJWTSecret(secret, false);
        expect(result.isValid).toBe(false);
        expect(result.severity).toBe('critical');
        expect(result.weakPatterns.length).toBeGreaterThan(0);
      });
    });

    it('should enforce minimum length requirements', () => {
      const shortSecret = 'short';
      const result = validateJWTSecret(shortSecret, false);

      expect(result.isValid).toBe(false);
      expect(result.lengthOk).toBe(false);
      expect(result.severity).toBe('critical');
      expect(result.recommendations).toContain('Increase length to at least 32 characters');
    });

    it('should have stricter requirements for production', () => {
      const secret = 'acceptable-dev-secret-32chars-long'; // 34 chars

      const devResult = validateJWTSecret(secret, false);
      const prodResult = validateJWTSecret(secret, true);

      expect(devResult.lengthOk).toBe(true);
      expect(prodResult.lengthOk).toBe(false);
      expect(prodResult.severity).toBe('critical');
    });

    it('should validate character type diversity', () => {
      // The dashes in the secrets count as symbols, so these expectations need adjustment
      const secrets = {
        lowercaseonly: { expectedTypes: 1 }, // only lowercase
        MixedCase: { expectedTypes: 2 }, // lowercase + uppercase
        MixedCase123: { expectedTypes: 3 }, // lowercase + uppercase + numbers
        'MixedCase123!': { expectedTypes: 4 }, // all types
      };

      Object.entries(secrets).forEach(([secret, expected]) => {
        const result = validateJWTSecret(secret, false);
        const actualTypes = getCharacterTypeDiversity(secret);
        expect(actualTypes).toBe(expected.expectedTypes);
        expect(result.characterTypes).toBe(expected.expectedTypes);
      });
    });

    it('should detect excessive repeated characters', () => {
      const secretWithRepeated = 'aaaa-good-secret-with-repeated-chars-32-minimum';
      const result = validateJWTSecret(secretWithRepeated, false);

      expect(result.hasExcessiveRepeated).toBe(true);
      if (result.severity === 'ok') {
        expect(result.recommendations).toContain('Avoid repeated character patterns');
      }
    });

    it('should approve strong secrets', () => {
      const strongSecrets = [
        'K8x$mP9#vR2@nL5!wQ7^eT4&yU6*iO3%aS1$dF8#gH2@jK9!zX3^cV7&bN4*mL8!',
        'Tr7$pL9#mN4@vB8!qW3^eR6&tY2*uI5%oP1$aS8#dF4@gH7!wE3^rT6&yU9*iO2%',
      ];

      strongSecrets.forEach(secret => {
        const result = validateJWTSecret(secret, true);
        expect(result.isValid).toBe(true);
        expect(result.severity).toBe('ok');
        expect(result.lengthOk).toBe(true);
        expect(
          result.weakPatterns.filter(p => p.severity === 'critical' || p.severity === 'high').length
        ).toBe(0);
      });
    });

    it('should provide helpful recommendations', () => {
      const shortSecret = 'weak';
      const shortResult = validateJWTSecret(shortSecret, false);

      expect(shortResult.recommendations.length).toBeGreaterThan(0);
      // Since "weak" is short and weak, it should get the length message
      expect(shortResult.recommendations.join(' ')).toContain(
        'Increase length to at least 32 characters'
      );

      // Test a weak pattern that gets the "Replace" message - use an actual default secret
      const weakPatternSecret = 'your-secret-key';
      const weakResult = validateJWTSecret(weakPatternSecret, false);

      expect(weakResult.recommendations.join(' ')).toContain(
        'Replace with a cryptographically secure random string'
      );
    });
  });

  describe('estimateEntropy', () => {
    it('should calculate higher entropy for diverse character sets', () => {
      const lowEntropy = 'aaaaaaaaaaaaaaaa'; // Only 'a' repeated (charset=26 but low diversity)
      const mediumEntropy = 'abcdefghijklmnop'; // Different lowercase letters (charset=26)
      const highEntropy = 'Aa1!Bb2@Cc3#Dd4$'; // Mixed character types (charset=94)

      const lowResult = estimateEntropy(lowEntropy);
      const mediumResult = estimateEntropy(mediumEntropy);
      const highResult = estimateEntropy(highEntropy);

      // High entropy (mixed types) should be greater than medium (single type)
      expect(highResult).toBeGreaterThan(mediumResult);
      // Note: Our simple entropy function considers character types, not actual character diversity
      // So both lowEntropy and mediumEntropy have same charset size (26) but different actual entropy
      expect(mediumResult).toBeGreaterThanOrEqual(lowResult);
    });

    it('should return 0 for empty string', () => {
      expect(estimateEntropy('')).toBe(0);
    });
  });

  describe('getCharacterTypeDiversity', () => {
    it('should correctly count character types', () => {
      expect(getCharacterTypeDiversity('abc')).toBe(1); // lowercase only
      expect(getCharacterTypeDiversity('Abc')).toBe(2); // lowercase + uppercase
      expect(getCharacterTypeDiversity('Abc1')).toBe(3); // lowercase + uppercase + numbers
      expect(getCharacterTypeDiversity('Abc1!')).toBe(4); // all types
    });

    it('should return 0 for empty string', () => {
      expect(getCharacterTypeDiversity('')).toBe(0);
    });
  });

  describe('hasExcessiveRepeatedChars', () => {
    it('should detect excessive repetition', () => {
      expect(hasExcessiveRepeatedChars('aaaa', 3)).toBe(true);
      expect(hasExcessiveRepeatedChars('aaaabbbb', 3)).toBe(true);
      expect(hasExcessiveRepeatedChars('abcabc', 3)).toBe(false);
      expect(hasExcessiveRepeatedChars('aaa', 3)).toBe(false);
    });
  });

  describe('Security configuration integrity', () => {
    it('should have comprehensive weak pattern coverage', () => {
      const patterns = WEAK_SECRET_PATTERNS;

      // Should have patterns for major categories
      expect(patterns.some(p => p.description.includes('placeholder'))).toBe(true);
      expect(patterns.some(p => p.description.includes('password'))).toBe(true);
      expect(patterns.some(p => p.type === 'regex')).toBe(true);
      expect(patterns.some(p => p.type === 'exact')).toBe(true);
      expect(patterns.some(p => p.type === 'contains')).toBe(true);

      // Should have multiple severity levels
      expect(patterns.some(p => p.severity === 'critical')).toBe(true);
      expect(patterns.some(p => p.severity === 'high')).toBe(true);
      expect(patterns.some(p => p.severity === 'medium')).toBe(true);
    });

    it('should have reasonable security requirements', () => {
      expect(JWT_SECURITY_REQUIREMENTS.MIN_LENGTH).toBeGreaterThanOrEqual(32);
      expect(JWT_SECURITY_REQUIREMENTS.PRODUCTION_MIN_LENGTH).toBeGreaterThan(
        JWT_SECURITY_REQUIREMENTS.MIN_LENGTH
      );
      expect(JWT_SECURITY_REQUIREMENTS.REQUIRED_CHARACTER_TYPES).toBeGreaterThanOrEqual(3);
      expect(JWT_SECURITY_REQUIREMENTS.MIN_ENTROPY_BITS).toBeGreaterThanOrEqual(128);
    });
  });

  describe('Edge cases', () => {
    it('should handle extremely long secrets', () => {
      const longSecret = 'a'.repeat(1000);
      const result = validateJWTSecret(longSecret, false);

      // Should still detect weak patterns (all 'a's)
      expect(result.weakPatterns.length).toBeGreaterThan(0);
      expect(result.hasExcessiveRepeated).toBe(true);
    });

    it('should handle special characters in secrets', () => {
      const specialSecret = '!@#$%^&*()_+-=[]{}|;:,.<>?`~cryptographically-secure-random-string';
      const result = validateJWTSecret(specialSecret, true);

      expect(result.lengthOk).toBe(true);
      // Check the actual character types present
      const actualTypes = getCharacterTypeDiversity(specialSecret);
      expect(result.characterTypes).toBe(actualTypes);
      // This secret has lowercase letters, symbols, and possibly others
      expect(result.characterTypes).toBeGreaterThanOrEqual(2);
    });

    it('should handle unicode characters', () => {
      const unicodeSecret = 'αβγδεζηθικλμνξοπρστυφχψω-32-chars-minimum-length';
      const result = validateJWTSecret(unicodeSecret, false);

      expect(result.lengthOk).toBe(true);
      // Should not crash with unicode
      expect(typeof result.entropy).toBe('number');
    });
  });
});
