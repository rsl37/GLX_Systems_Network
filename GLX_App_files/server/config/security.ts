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

/**
 * Security configuration for JWT secret validation
 *
 * This file contains patterns and rules for detecting weak JWT secrets
 * that pose security risks in production environments.
 */

/**
 * WebSocket Security Configuration
 * Ensures secure WebSocket connections using WSS protocol
 */
export interface WebSocketSecurityConfig {
  protocol: 'wss' | 'ws';
  enforceSSL: boolean;
  corsOrigins: string[];
  maxConnections: number;
  heartbeatInterval: number;
}

/**
 * Get WebSocket CORS origins from environment variables
 */
function getWebSocketCorsOrigins(): string[] {
  const allowedOrigins: string[] = [];

  // Primary configurable CORS origins
  if (process.env.CORS_ALLOWED_ORIGINS) {
    allowedOrigins.push(...process.env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim()));
  }

  // WebSocket-specific origins (if configured separately)
  if (process.env.WEBSOCKET_CORS_ORIGINS) {
    allowedOrigins.push(...process.env.WEBSOCKET_CORS_ORIGINS.split(',').map(o => o.trim()));
  }

  // Fallback to existing environment variables for backward compatibility
  [
    process.env.CLIENT_ORIGIN,
    process.env.FRONTEND_URL,
    process.env.PRODUCTION_FRONTEND_URL,
    process.env.STAGING_FRONTEND_URL,
  ].forEach(origin => {
    if (origin) allowedOrigins.push(origin);
  });

  if (process.env.TRUSTED_ORIGINS) {
    allowedOrigins.push(...process.env.TRUSTED_ORIGINS.split(',').map(o => o.trim()));
  }

  // If no origins configured, use defaults based on environment
  if (allowedOrigins.length === 0) {
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined;
    if (isDevelopment) {
      allowedOrigins.push('http://localhost:3000', 'http://localhost:5173');
    } else {
      // Production fallback
      allowedOrigins.push('https://glx-civic-networking.vercel.app', 'https://glxcivicnetwork.me');
    }
  }

  return [...new Set(allowedOrigins.filter(Boolean))];
}

export const DEFAULT_WEBSOCKET_CONFIG: WebSocketSecurityConfig = {
  protocol: 'wss', // Always use secure WebSocket connections
  enforceSSL: true,
  corsOrigins: getWebSocketCorsOrigins(),
  maxConnections: 1000,
  heartbeatInterval: 30000,
};

/**
 * Get WebSocket connection URL with security enforcement
 */
export function getSecureWebSocketUrl(
  host: string = 'localhost:3001',
  path: string = '/socket.io'
): string {
  // Always use WSS for secure connections
  const protocol = DEFAULT_WEBSOCKET_CONFIG.protocol;
  const cleanHost = host.replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '');
  return `${protocol}://${cleanHost}${path}`;
}

export interface WeakSecretPattern {
  pattern: string | RegExp;
  type: 'exact' | 'regex' | 'contains';
  description: string;
  severity: 'critical' | 'high' | 'medium';
}

/**
 * Comprehensive list of weak JWT secret patterns
 * Organized by category for maintainability
 */
export const WEAK_SECRET_PATTERNS: WeakSecretPattern[] = [
  // Default/placeholder values
  {
    pattern: 'your-secret-key',
    type: 'exact',
    description: 'Default placeholder secret',
    severity: 'critical',
  },
  {
    pattern: 'your-refresh-secret-key',
    type: 'exact',
    description: 'Default refresh token secret placeholder',
    severity: 'critical',
  },
  {
    pattern: 'your-super-secret-jwt-key-change-this-in-production-min-32-chars',
    type: 'exact',
    description: 'Extended default placeholder secret',
    severity: 'critical',
  },
  {
    pattern: 'change-this-secret',
    type: 'exact',
    description: 'Common placeholder text',
    severity: 'critical',
  },
  {
    pattern: 'replace-me',
    type: 'exact',
    description: 'Common placeholder text',
    severity: 'critical',
  },
  {
    pattern: 'secret-key',
    type: 'exact',
    description: 'Generic secret key',
    severity: 'high',
  },

  // Common weak passwords
  {
    pattern: 'password',
    type: 'exact',
    description: 'Common weak password',
    severity: 'critical',
  },
  {
    pattern: 'password',
    type: 'contains',
    description: 'Contains common weak password pattern',
    severity: 'critical',
  },
  {
    pattern: '123456',
    type: 'exact',
    description: 'Numeric sequence',
    severity: 'critical',
  },
  {
    pattern: 'qwerty',
    type: 'exact',
    description: 'Keyboard pattern',
    severity: 'critical',
  },
  {
    pattern: 'admin',
    type: 'exact',
    description: 'Common administrative password',
    severity: 'critical',
  },
  {
    pattern: 'secret',
    type: 'exact',
    description: 'Generic secret word',
    severity: 'high',
  },
  {
    pattern: 'secret',
    type: 'contains',
    description: 'Contains generic secret word',
    severity: 'high',
  },
  {
    pattern: 'test',
    type: 'exact',
    description: 'Test value',
    severity: 'high',
  },
  {
    pattern: 'test',
    type: 'contains',
    description: 'Contains test value',
    severity: 'high',
  },
  {
    pattern: 'development',
    type: 'exact',
    description: 'Development environment value',
    severity: 'high',
  },
  {
    pattern: 'development',
    type: 'contains',
    description: 'Contains development environment value',
    severity: 'high',
  },
  {
    pattern: 'dev',
    type: 'exact',
    description: 'Development environment abbreviation',
    severity: 'high',
  },
  {
    pattern: 'your-secret-key',
    type: 'contains',
    description: 'Contains default placeholder secret pattern',
    severity: 'critical',
  },
  {
    pattern: 'your-refresh-secret-key',
    type: 'contains',
    description: 'Contains default refresh token secret placeholder pattern',
    severity: 'critical',
  },

  // Pattern-based weak secrets
  {
    pattern: /^(.*)\1+$/, // Repeated patterns like "abcabc" or "123123"
    type: 'regex',
    description: 'Repeated character patterns',
    severity: 'high',
  },
  {
    pattern: /^[a-zA-Z]+$/, // Only letters
    type: 'regex',
    description: 'Only alphabetic characters (low entropy)',
    severity: 'medium',
  },
  {
    pattern: /^\d+$/, // Only numbers
    type: 'regex',
    description: 'Only numeric characters (low entropy)',
    severity: 'high',
  },
  {
    pattern: /^(.)\1{7,}$/, // Same character repeated 8+ times
    type: 'regex',
    description: 'Single character repeated',
    severity: 'critical',
  },
  {
    pattern: /^(012345|123456|234567|345678|456789|567890|678901|789012|890123|901234)/, // Sequential numbers
    type: 'regex',
    description: 'Sequential numeric patterns',
    severity: 'critical',
  },
  {
    pattern:
      /^(abcdef|bcdefg|cdefgh|defghi|efghij|fghijk|ghijkl|hijklm|ijklmn|jklmno|klmnop|lmnopq|mnopqr|nopqrs|opqrst|pqrstu|qrstuv|rstuvw|stuvwx|tuvwxy|uvwxyz)/, // Sequential letters
    type: 'regex',
    description: 'Sequential alphabetic patterns',
    severity: 'critical',
  },

  // Common dictionary words (subset for performance)
  {
    pattern: 'password123',
    type: 'exact',
    description: 'Common password + numbers pattern',
    severity: 'critical',
  },
  {
    pattern: 'secret123',
    type: 'exact',
    description: 'Secret + numbers pattern',
    severity: 'critical',
  },
  {
    pattern: 'jwt-secret',
    type: 'exact',
    description: 'JWT-specific weak secret',
    severity: 'high',
  },
  {
    pattern: 'token-secret',
    type: 'exact',
    description: 'Token-specific weak secret',
    severity: 'high',
  },

  // Environment-specific weak patterns
  {
    pattern: 'localhost',
    type: 'contains',
    description: 'Contains localhost reference',
    severity: 'medium',
  },
  {
    pattern: 'example',
    type: 'contains',
    description: 'Contains example text',
    severity: 'medium',
  },
  {
    pattern: 'demo',
    type: 'contains',
    description: 'Contains demo text',
    severity: 'medium',
  },
];

/**
 * Security requirements for JWT secrets
 */
export const JWT_SECURITY_REQUIREMENTS = {
  MIN_LENGTH: 32,
  MIN_ENTROPY_BITS: 128, // Rough estimate for strong secrets
  REQUIRED_CHARACTER_TYPES: 3, // At least 3 of: uppercase, lowercase, numbers, symbols
  MAX_REPEATED_CHARS: 3, // Maximum consecutive identical characters
  PRODUCTION_MIN_LENGTH: 64, // Stricter requirement for production
} as const;

/**
 * Check if a secret matches any weak patterns
 */
export function detectWeakSecretPatterns(secret: string): WeakSecretPattern[] {
  const matches: WeakSecretPattern[] = [];

  for (const pattern of WEAK_SECRET_PATTERNS) {
    let isMatch = false;

    switch (pattern.type) {
      case 'exact':
        isMatch = secret === pattern.pattern;
        break;
      case 'contains':
        isMatch = secret.toLowerCase().includes((pattern.pattern as string).toLowerCase());
        break;
      case 'regex':
        isMatch = (pattern.pattern as RegExp).test(secret);
        break;
    }

    if (isMatch) {
      matches.push(pattern);
    }
  }

  return matches;
}

/**
 * Calculate rough entropy estimate for a string
 */
export function estimateEntropy(secret: string): number {
  if (!secret) return 0;

  // Character set size estimation
  let charsetSize = 0;
  if (/[a-z]/.test(secret)) charsetSize += 26;
  if (/[A-Z]/.test(secret)) charsetSize += 26;
  if (/[0-9]/.test(secret)) charsetSize += 10;
  if (/[^a-zA-Z0-9]/.test(secret)) charsetSize += 32; // Rough estimate for symbols

  // Shannon entropy approximation
  return secret.length * Math.log2(charsetSize || 1);
}

/**
 * Check character type diversity
 */
export function getCharacterTypeDiversity(secret: string): number {
  let types = 0;
  if (/[a-z]/.test(secret)) types++;
  if (/[A-Z]/.test(secret)) types++;
  if (/[0-9]/.test(secret)) types++;
  if (/[^a-zA-Z0-9]/.test(secret)) types++;
  return types;
}

/**
 * Check for excessive repeated characters
 */
export function hasExcessiveRepeatedChars(
  secret: string,
  maxRepeated: number = JWT_SECURITY_REQUIREMENTS.MAX_REPEATED_CHARS
): boolean {
  const regex = new RegExp(`(.)\\1{${maxRepeated},}`);
  return regex.test(secret);
}

/**
 * Comprehensive JWT secret validation
 */
export interface JWTSecretValidationResult {
  isValid: boolean;
  weakPatterns: WeakSecretPattern[];
  entropy: number;
  characterTypes: number;
  hasExcessiveRepeated: boolean;
  lengthOk: boolean;
  recommendations: string[];
  severity: 'ok' | 'warning' | 'critical';
}

export function validateJWTSecret(
  secret: string,
  isProduction: boolean = false
): JWTSecretValidationResult {
  const weakPatterns = detectWeakSecretPatterns(secret);
  const entropy = estimateEntropy(secret);
  const characterTypes = getCharacterTypeDiversity(secret);
  const hasExcessiveRepeated = hasExcessiveRepeatedChars(secret);
  const minLength = isProduction
    ? JWT_SECURITY_REQUIREMENTS.PRODUCTION_MIN_LENGTH
    : JWT_SECURITY_REQUIREMENTS.MIN_LENGTH;
  const lengthOk = secret.length >= minLength;

  const recommendations: string[] = [];
  let severity: 'ok' | 'warning' | 'critical' = 'ok';

  // Critical issues
  if (weakPatterns.some(p => p.severity === 'critical')) {
    severity = 'critical';
    recommendations.push('Replace with a cryptographically secure random string');
  }

  if (!lengthOk) {
    severity = 'critical';
    recommendations.push(`Increase length to at least ${minLength} characters`);
  }

  // High severity issues
  if (weakPatterns.some(p => p.severity === 'high') && severity !== 'critical') {
    severity = 'critical'; // Treat high severity as critical for JWT secrets
    recommendations.push('Use a more complex, unpredictable secret');
  }

  // Warnings
  if (entropy < JWT_SECURITY_REQUIREMENTS.MIN_ENTROPY_BITS && severity === 'ok') {
    severity = 'warning';
    recommendations.push('Consider using higher entropy (more randomness)');
  }

  if (characterTypes < JWT_SECURITY_REQUIREMENTS.REQUIRED_CHARACTER_TYPES && severity === 'ok') {
    severity = 'warning';
    recommendations.push('Use a mix of uppercase, lowercase, numbers, and symbols');
  }

  if (hasExcessiveRepeated && severity === 'ok') {
    severity = 'warning';
    recommendations.push('Avoid repeated character patterns');
  }

  if (recommendations.length === 0) {
    recommendations.push('Secret meets security requirements');
  }

  const isValid = severity !== 'critical' && lengthOk && weakPatterns.length === 0;

  return {
    isValid,
    weakPatterns,
    entropy,
    characterTypes,
    hasExcessiveRepeated,
    lengthOk,
    recommendations,
    severity,
  };
}
