/*
 * Copyright (c) 2025 GLX Civic Networking App
 *
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from './database.js';
import { Request, Response, NextFunction } from 'express';
import { validateJWTSecret } from './config/security.js';

// Secure JWT secret configuration with validation
function getSecureJWTSecret(): string {
  const secret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!secret) {
    if (isProduction) {
      throw new Error('JWT_SECRET environment variable is required in production');
    }
    console.warn('⚠️ JWT_SECRET not set - using insecure default for development');
    return 'insecure-dev-secret-change-in-production-32chars-minimum';
  }

  // Validate secret strength
  const validation = validateJWTSecret(secret, isProduction);
  if (!validation.isValid) {
    const message = `JWT_SECRET security validation failed: ${validation.recommendations.join(', ')}`;
    if (isProduction) {
      throw new Error(message);
    }
    console.warn(`⚠️ ${message}`);
  }

  return secret;
}

function getSecureJWTRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!secret) {
    if (isProduction) {
      throw new Error('JWT_REFRESH_SECRET environment variable is required in production');
    }
    console.warn('⚠️ JWT_REFRESH_SECRET not set - using insecure default for development');
    return 'insecure-dev-refresh-secret-change-in-production-32chars-minimum';
  }

  // Validate secret strength
  const validation = validateJWTSecret(secret, isProduction);
  if (!validation.isValid) {
    const message = `JWT_REFRESH_SECRET security validation failed: ${validation.recommendations.join(', ')}`;
    if (isProduction) {
      throw new Error(message);
    }
    console.warn(`⚠️ ${message}`);
  }

  return secret;
}

const JWT_SECRET = getSecureJWTSecret();
const JWT_REFRESH_SECRET = getSecureJWTRefreshSecret();
const TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function generateRefreshToken(userId: number): string {
  return jwt.sign({ userId, type: 'refresh' }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

export interface AuthRequest extends Request {
  userId?: number;
  username?: string;
}

/**
 * Blacklist a token for immediate revocation
 */
export async function blacklistToken(token: string, userId: number, reason: string = 'logout'): Promise<boolean> {
  try {
    // Decode token to get expiry time
    const decoded = jwt.decode(token) as { exp?: number } | null;
    if (!decoded || !decoded.exp) {
      console.log('❌ Cannot blacklist token: Invalid token format');
      return false;
    }

    const expiresAt = new Date(decoded.exp * 1000).toISOString();

    await db
      .insertInto('token_blacklist')
      .values({
        token,
        user_id: userId,
        reason,
        expires_at: expiresAt,
      })
      .execute();

    console.log('✅ Token blacklisted successfully for user:', userId);
    return true;
  } catch (error) {
    console.error('❌ Failed to blacklist token:', error);
    return false;
  }
}

/**
 * Check if a token is blacklisted
 */
export async function isTokenBlacklisted(token: string): Promise<boolean> {
  try {
    const blacklistedToken = await db
      .selectFrom('token_blacklist')
      .select('id')
      .where('token', '=', token)
      .where('expires_at', '>', new Date().toISOString())
      .executeTakeFirst();

    return !!blacklistedToken;
  } catch (error) {
    console.error('❌ Error checking token blacklist:', error);
    return false;
  }
}

/**
 * Clean up expired blacklisted tokens (should be run periodically)
 */
export async function cleanupExpiredBlacklistedTokens(): Promise<number> {
  try {
    const result = await db
      .deleteFrom('token_blacklist')
      .where('expires_at', '<', new Date().toISOString())
      .execute();

    const deletedCount = result.reduce((acc, r) => acc + Number(r.numDeletedRows || 0), 0);
    if (deletedCount > 0) {
      console.log(`🧹 Cleaned up ${deletedCount} expired blacklisted tokens`);
    }
    return deletedCount;
  } catch (error) {
    console.error('❌ Error cleaning up expired blacklisted tokens:', error);
    return 0;
  }
}

export async function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    // Check if token is blacklisted
    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
      res.status(403).json({ error: 'Token has been revoked' });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    req.userId = decoded.userId;

    // Get username for Socket.io auth
    try {
      const user = await db
        .selectFrom('users')
        .select('username')
        .where('id', '=', decoded.userId)
        .executeTakeFirst();
      req.username = user?.username || 'Unknown';
    } catch (error) {
      req.username = 'Unknown';
    }

    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid token' });
    return;
  }
}
