#!/usr/bin/env node
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

/**
 * @file mcp-servers/auth-server-hardened.js
 * Hardened JWT Authentication Server for MCP
 *
 * Provides secure token generation, validation, and permission management.
 * ALL tokens are short-lived; refresh tokens enable longer sessions.
 * Every operation is logged; secrets are never exposed.
 */

const crypto = require('crypto');
const { validateEnv, BASE_ENV_SCHEMA, hashSecretForLogging } = require('./lib/env-validator');
const { validateString, validateId, validateArray } = require('./lib/input-validator');
const { Logger } = require('./lib/logger');

const AUTH_ENV_SCHEMA = {
  ...BASE_ENV_SCHEMA,
  JWT_SECRET: {
    type: 'string',
    required: true,
    validate: (v) => v.length >= 32,
    validateMsg: 'JWT_SECRET must be at least 32 bytes',
  },
  JWT_ACCESS_TOKEN_EXPIRY: {
    type: 'integer',
    required: false,
    default: 900, // 15 minutes
    min: 60,
    max: 86400, // Max 1 day
  },
  JWT_REFRESH_TOKEN_EXPIRY: {
    type: 'integer',
    required: false,
    default: 604800, // 7 days
    min: 3600,
    max: 31536000, // Max 1 year
  },
  ALLOWED_ORIGINS: {
    type: 'json',
    required: false,
    default: ['http://localhost:3000'],
  },
};

class JwtAuthServer {
  constructor() {
    try {
      this.config = validateEnv(AUTH_ENV_SCHEMA);
    } catch (err) {
      console.error(`Fatal: Environment validation failed: ${err.message}`);
      process.exit(1);
    }

    this.logger = new Logger('jwt-auth-server', this.config.LOG_LEVEL);
    this.logger.info('JWT Auth Server initializing', {
      nodeEnv: this.config.NODE_ENV,
      jwtSecret: hashSecretForLogging(this.config.JWT_SECRET),
    });

    // In-memory token blacklist (in production, use Redis)
    this.tokenBlacklist = new Set();

    // Token store for demonstration (in production, use a database)
    this.tokenStore = new Map();
  }

  /**
   * Generate a new access token.
   * @param {string} userId - User identifier
   * @param {Array<string>} scopes - Permission scopes
   * @returns {Object} { accessToken, expiresIn, tokenType }
   */
  generateAccessToken(userId, scopes = []) {
    validateString(userId, { required: true, minLength: 1, maxLength: 256 });
    validateArray(scopes, { maxLength: 50 });

    const header = {
      alg: 'HS256',
      typ: 'JWT',
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: 'glx-civic-mcp',
      sub: userId,
      iat: now,
      exp: now + this.config.JWT_ACCESS_TOKEN_EXPIRY,
      scopes,
      tokenId: crypto.randomBytes(16).toString('hex'),
    };

    const token = this._signJwt(header, payload);

    this.logger.audit('generate_access_token', true, {
      userId,
      scopeCount: scopes.length,
      expiresIn: this.config.JWT_ACCESS_TOKEN_EXPIRY,
    });

    return {
      accessToken: token,
      expiresIn: this.config.JWT_ACCESS_TOKEN_EXPIRY,
      tokenType: 'Bearer',
    };
  }

  /**
   * Generate a refresh token (long-lived, single-use).
   * @param {string} userId - User identifier
   * @returns {Object} { refreshToken, expiresIn }
   */
  generateRefreshToken(userId) {
    validateString(userId, { required: true, minLength: 1, maxLength: 256 });

    const header = {
      alg: 'HS256',
      typ: 'JWT',
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: 'glx-civic-mcp',
      sub: userId,
      iat: now,
      exp: now + this.config.JWT_REFRESH_TOKEN_EXPIRY,
      type: 'refresh',
      tokenId: crypto.randomBytes(16).toString('hex'),
    };

    const token = this._signJwt(header, payload);
    this.tokenStore.set(token, { userId, used: false });

    this.logger.audit('generate_refresh_token', true, {
      userId,
      expiresIn: this.config.JWT_REFRESH_TOKEN_EXPIRY,
    });

    return {
      refreshToken: token,
      expiresIn: this.config.JWT_REFRESH_TOKEN_EXPIRY,
    };
  }

  /**
   * Validate an access token and return payload.
   * @param {string} token - JWT token to validate
   * @returns {Object} Decoded payload
   * @throws {Error} If invalid or expired
   */
  verifyAccessToken(token) {
    validateString(token, { required: true, minLength: 20 });

    try {
      const payload = this._verifyJwt(token);

      // Check if token is in blacklist
      if (this.tokenBlacklist.has(token)) {
        throw new Error('Token has been revoked');
      }

      // Validate token type
      if (payload.type === 'refresh') {
        throw new Error('Refresh token cannot be used as access token');
      }

      this.logger.debug('Access token verified', {
        userId: payload.sub,
        tokenId: payload.tokenId,
      });

      return payload;
    } catch (err) {
      this.logger.warn('Access token verification failed', {
        error: err.message,
      });
      throw err;
    }
  }

  /**
   * Revoke a token (add to blacklist).
   * @param {string} token - Token to revoke
   */
  revokeToken(token) {
    validateString(token, { required: true, minLength: 20 });
    this.tokenBlacklist.add(token);
    this.logger.audit('revoke_token', true, {});
  }

  /**
   * Refresh an access token using a refresh token.
   * @param {string} refreshToken - Valid refresh token
   * @returns {Object} { accessToken, expiresIn, tokenType }
   * @throws {Error} If invalid or already used
   */
  refreshAccessToken(refreshToken) {
    validateString(refreshToken, { required: true, minLength: 20 });

    try {
      const payload = this._verifyJwt(refreshToken);

      if (payload.type !== 'refresh') {
        throw new Error('Invalid token type for refresh');
      }

      // Check if refresh token was already used
      const stored = this.tokenStore.get(refreshToken);
      if (!stored || stored.used) {
        throw new Error('Refresh token has already been used');
      }

      // Mark as used
      stored.used = true;

      // Generate new access token
      return this.generateAccessToken(payload.sub, payload.scopes || []);
    } catch (err) {
      this.logger.warn('Refresh token validation failed', {
        error: err.message,
      });
      throw err;
    }
  }

  /**
   * Sign a JWT.
   * @private
   */
  _signJwt(header, payload) {
    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64');
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    const message = `${headerB64}.${payloadB64}`;

    const signature = crypto
      .createHmac('sha256', this.config.JWT_SECRET)
      .update(message)
      .digest('base64');

    return `${message}.${signature}`;
  }

  /**
   * Verify and decode a JWT.
   * @private
   */
  _verifyJwt(token) {
    const [headerB64, payloadB64, signature] = token.split('.');

    if (!headerB64 || !payloadB64 || !signature) {
      throw new Error('Invalid JWT format');
    }

    // Verify signature
    const message = `${headerB64}.${payloadB64}`;
    const expected = crypto
      .createHmac('sha256', this.config.JWT_SECRET)
      .update(message)
      .digest('base64');

    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
      throw new Error('Invalid JWT signature');
    }

    // Decode payload
    const payload = JSON.parse(
      Buffer.from(payloadB64, 'base64').toString('utf-8')
    );

    // Check expiry
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('JWT has expired');
    }

    return payload;
  }
}

// MCP Tool Definitions
const tools = [
  {
    name: 'generate_access_token',
    description: 'Generate a short-lived access token for a user',
    inputSchema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'Unique user identifier',
        },
        scopes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Permission scopes (e.g., ["read:civic", "write:database"])',
        },
      },
      required: ['userId'],
    },
  },
  {
    name: 'generate_refresh_token',
    description: 'Generate a long-lived refresh token (single-use)',
    inputSchema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'Unique user identifier',
        },
      },
      required: ['userId'],
    },
  },
  {
    name: 'verify_jwt_token',
    description: 'Verify and decode a JWT access token',
    inputSchema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          description: 'JWT token to verify',
        },
      },
      required: ['token'],
    },
  },
  {
    name: 'refresh_access_token',
    description: 'Get a new access token using a refresh token',
    inputSchema: {
      type: 'object',
      properties: {
        refreshToken: {
          type: 'string',
          description: 'Valid refresh token',
        },
      },
      required: ['refreshToken'],
    },
  },
  {
    name: 'revoke_token',
    description: 'Revoke/blacklist a token (access or refresh)',
    inputSchema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          description: 'Token to revoke',
        },
      },
      required: ['token'],
    },
  },
];

// Initialize server
const server = new JwtAuthServer();

// Main tool handler
function handleToolCall(toolName, toolInput) {
  switch (toolName) {
    case 'generate_access_token':
      return server.generateAccessToken(toolInput.userId, toolInput.scopes || []);

    case 'generate_refresh_token':
      return server.generateRefreshToken(toolInput.userId);

    case 'verify_jwt_token':
      return server.verifyAccessToken(toolInput.token);

    case 'refresh_access_token':
      return server.refreshAccessToken(toolInput.refreshToken);

    case 'revoke_token':
      server.revokeToken(toolInput.token);
      return { success: true, message: 'Token revoked' };

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// Export for use in MCP framework
module.exports = {
  tools,
  handleToolCall,
  JwtAuthServer,
};
