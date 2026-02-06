/**
 * GLX Systems Network Monitoring Platform
 * Authentication Middleware
 *
 * Copyright (c) 2025 rsl37
 * Dual-licensed under PolyForm Shield 1.0.0 OR PolyForm Noncommercial 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { log } from '../utils/logger';
import { redis } from '../database/redis';

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
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
 * Generate JWT token for user
 */
export function generateToken(userId: string, email: string, role: string): string {
  const payload = {
    userId,
    email,
    role,
  };

  const token = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
    issuer: 'glx-systems-network',
    audience: 'glx-api',
  });

  log.audit('JWT token generated', userId, { email, role });

  return token;
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): AuthPayload {
  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      issuer: 'glx-systems-network',
      audience: 'glx-api',
    }) as AuthPayload;

    return decoded;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else {
      throw new Error('Token verification failed');
    }
  }
}

/**
 * Authentication middleware - validates JWT token
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
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

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Check if token is blacklisted
    const isBlacklisted = await redis.exists(`blacklist:${token}`);
    if (isBlacklisted) {
      log.security('Blacklisted token usage attempted', {
        ip: req.ip,
        url: req.originalUrl,
      });
      res.status(401).json({ error: 'Token has been revoked' });
      return;
    }

    // Verify token
    const decoded = verifyToken(token);

    // Attach user to request
    req.user = decoded;

    // Log successful authentication
    log.debug('User authenticated', {
      userId: decoded.userId,
      role: decoded.role,
      url: req.originalUrl,
    });

    next();
  } catch (error: any) {
    log.security('Authentication failed', {
      error: error.message,
      ip: req.ip,
      url: req.originalUrl,
    });
    res.status(401).json({ error: error.message || 'Authentication failed' });
  }
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

      // Check if token is blacklisted
      const isBlacklisted = await redis.exists(`blacklist:${token}`);
      if (!isBlacklisted) {
        try {
          const decoded = verifyToken(token);
          req.user = decoded;
        } catch (error) {
          // Ignore token errors for optional auth
        }
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
 * Blacklist a token (for logout)
 */
export async function blacklistToken(token: string): Promise<void> {
  try {
    const decoded = verifyToken(token);
    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

    if (expiresIn > 0) {
      await redis.set(`blacklist:${token}`, '1', expiresIn);
      log.audit('Token blacklisted', decoded.userId);
    }
  } catch (error: any) {
    log.error('Failed to blacklist token', { error: error.message });
    throw error;
  }
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

    // Check if API key exists in Redis
    const keyData = await redis.get<{
      userId: string;
      role: string;
      name: string;
    }>(`apikey:${apiKey}`, true);

    if (!keyData) {
      log.security('Invalid API key', {
        ip: req.ip,
        url: req.originalUrl,
      });
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    // Attach user data to request
    req.user = {
      userId: keyData.userId,
      email: '',
      role: keyData.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    // Track API key usage
    await redis.increment(`apikey:${apiKey}:usage`);

    log.debug('API key validated', {
      userId: keyData.userId,
      name: keyData.name,
      url: req.originalUrl,
    });

    next();
  } catch (error: any) {
    log.error('API key validation failed', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
}
