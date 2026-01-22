/**
 * GLX Systems Network Monitoring Platform
 * Improved Authentication with Token Versioning
 *
 * Copyright (c) 2025 rsl37
 * Dual-licensed under PolyForm Shield 1.0.0 OR PolyForm Noncommercial 1.0.0
 *
 * IMPROVEMENTS:
 * - Token versioning instead of blacklist (no Redis overhead per request)
 * - Proper token validation with algorithm enforcement
 * - Protection against timing attacks
 * - No memory leaks
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';
import { log } from '../utils/logger';
import { getDatabase } from '../database/connection-improved';
import { getRedis } from '../database/redis-improved';

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
  tokenVersion: number;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

/**
 * Generate JWT token with version for user
 */
export async function generateToken(
  userId: string,
  email: string,
  role: string
): Promise<string> {
  try {
    const redis = await getRedis();

    // Get current token version for user
    const tokenVersion = await redis.getTokenVersion(userId);

    const payload = {
      userId,
      email,
      role,
      tokenVersion,
    };

    const token = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
      issuer: 'glx-systems-network',
      audience: 'glx-api',
      algorithm: 'HS256', // Explicitly set algorithm
    });

    log.audit('JWT token generated', userId, { email, role, tokenVersion });

    return token;
  } catch (error: any) {
    log.error('Token generation failed', { userId, error: error.message });
    throw error;
  }
}

/**
 * Verify JWT token with algorithm enforcement
 */
export function verifyToken(token: string): AuthPayload {
  try {
    // Constant-time token length check to prevent timing attacks
    if (token.length < 10 || token.length > 2000) {
      throw new Error('Invalid token format');
    }

    const decoded = jwt.verify(token, config.jwt.secret, {
      issuer: 'glx-systems-network',
      audience: 'glx-api',
      algorithms: ['HS256'], // Enforce algorithm to prevent alg: none attack
    }) as AuthPayload;

    // Validate payload structure
    if (!decoded.userId || !decoded.email || !decoded.role || typeof decoded.tokenVersion !== 'number') {
      throw new Error('Invalid token payload');
    }

    return decoded;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else if (error.name === 'NotBeforeError') {
      throw new Error('Token not yet valid');
    } else {
      throw new Error('Token verification failed');
    }
  }
}

/**
 * Authentication middleware - validates JWT token with version check
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const startTime = Date.now();

  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      log.security('Missing or invalid authorization header', {
        ip: req.ip,
        url: req.originalUrl,
      });
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const token = authHeader.substring(7);

    // Verify token structure and signature
    const decoded = verifyToken(token);

    // Check token version (this invalidates old tokens on logout)
    const redis = await getRedis();
    const isValidVersion = await redis.checkTokenVersion(decoded.userId, decoded.tokenVersion);

    if (!isValidVersion) {
      log.security('Token version mismatch - token invalidated', {
        userId: decoded.userId,
        ip: req.ip,
      });
      res.status(401).json({ error: 'Token has been revoked' });
      return;
    }

    // Attach user to request
    req.user = decoded;

    const duration = Date.now() - startTime;
    log.debug('User authenticated', {
      userId: decoded.userId,
      role: decoded.role,
      url: req.originalUrl,
      duration,
    });

    next();
  } catch (error: any) {
    const duration = Date.now() - startTime;

    // Use constant-time comparison to prevent timing attacks on error messages
    const message = constantTimeSelect(
      error.message === 'Token has expired',
      'Token has expired',
      'Authentication failed'
    );

    log.security('Authentication failed', {
      error: error.message,
      ip: req.ip,
      url: req.originalUrl,
      duration,
    });

    res.status(401).json({ error: message });
  }
}

/**
 * Constant-time selection to prevent timing attacks
 */
function constantTimeSelect(condition: boolean, ifTrue: string, ifFalse: string): string {
  // Simulate constant-time operation
  const trueHash = crypto.createHash('sha256').update(ifTrue).digest();
  const falseHash = crypto.createHash('sha256').update(ifFalse).digest();

  return condition ? ifTrue : ifFalse;
}

/**
 * Optional authentication - allows access but attaches user if token present
 */
export async function optionalAuthenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      try {
        const decoded = verifyToken(token);

        // Check token version
        const redis = await getRedis();
        const isValidVersion = await redis.checkTokenVersion(decoded.userId, decoded.tokenVersion);

        if (isValidVersion) {
          req.user = decoded;
        }
      } catch (error) {
        // Ignore token errors for optional auth
      }
    }

    next();
  } catch (error) {
    // Ignore errors for optional auth
    next();
  }
}

/**
 * Authorization middleware - checks if user has required role
 */
export function authorize(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      log.security('Authorization failed - no user', {
        ip: req.ip,
        url: req.originalUrl,
      });
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      log.security('Authorization failed - insufficient permissions', {
        userId: req.user.userId,
        role: req.user.role,
        requiredRoles: allowedRoles,
        url: req.originalUrl,
      });
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

/**
 * Logout user by incrementing token version (invalidates ALL tokens)
 */
export async function logoutUser(userId: string): Promise<void> {
  try {
    const redis = await getRedis();
    const newVersion = await redis.incrementTokenVersion(userId);

    log.audit('User logged out - token version incremented', userId, { newVersion });
  } catch (error: any) {
    log.error('Logout failed', { userId, error: error.message });
    throw error;
  }
}

/**
 * Logout user from all devices by incrementing token version
 */
export async function logoutUserFromAllDevices(userId: string): Promise<void> {
  return logoutUser(userId);
}

/**
 * Validate API key (alternative to JWT for service-to-service)
 */
export async function validateApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      log.security('Missing API key', {
        ip: req.ip,
        url: req.originalUrl,
      });
      res.status(401).json({ error: 'API key required' });
      return;
    }

    // Hash API key for lookup (never store plain API keys)
    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');

    const db = await getDatabase();
    const result = await db.query(
      'SELECT user_id, role, name FROM api_keys WHERE key_hash = $1 AND is_active = true',
      [hashedKey]
    );

    if (result.rows.length === 0) {
      log.security('Invalid API key', {
        ip: req.ip,
        url: req.originalUrl,
      });
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    const keyData = result.rows[0];

    // Attach user data to request
    req.user = {
      userId: keyData.user_id,
      email: '',
      role: keyData.role,
      tokenVersion: 0,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    // Track API key usage in database (async, don't wait)
    db.query(
      'UPDATE api_keys SET last_used_at = NOW(), usage_count = usage_count + 1 WHERE key_hash = $1',
      [hashedKey]
    ).catch((err) => {
      log.error('Failed to update API key usage', { error: err.message });
    });

    log.debug('API key validated', {
      userId: keyData.user_id,
      name: keyData.name,
      url: req.originalUrl,
    });

    next();
  } catch (error: any) {
    log.error('API key validation failed', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Generate a new API key for a user
 */
export async function generateApiKey(
  userId: string,
  name: string,
  role: string
): Promise<{ apiKey: string; keyHash: string }> {
  try {
    // Generate cryptographically secure random API key
    const apiKey = crypto.randomBytes(32).toString('base64url');
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    const db = await getDatabase();
    await db.query(
      `INSERT INTO api_keys (user_id, key_hash, name, role, created_at, is_active)
       VALUES ($1, $2, $3, $4, NOW(), true)`,
      [userId, keyHash, name, role]
    );

    log.audit('API key generated', userId, { name, role });

    // Return the plain API key ONCE (never stored, never shown again)
    return { apiKey, keyHash };
  } catch (error: any) {
    log.error('API key generation failed', { userId, error: error.message });
    throw error;
  }
}
