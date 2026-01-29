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

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from './database.js';
import { Request, Response, NextFunction } from 'express';
import { validateJWTSecret } from './config/security.js';

// Secure JWT secret configuration with validation
// SECURITY FIX: Generate random secrets instead of using hardcoded defaults
let generatedJWTSecret: string | null = null;

function getSecureJWTSecret(): string {
  const secret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!secret) {
    if (isProduction) {
      throw new Error('JWT_SECRET environment variable is required in production');
    }

    // Generate a cryptographically secure random secret for development
    // This is still insecure (not persisted) but better than a known value
    if (!generatedJWTSecret) {
      generatedJWTSecret = crypto.randomBytes(32).toString('hex');
      console.warn('⚠️ JWT_SECRET not set - generated random secret for this session');
      console.warn('⚠️ Tokens will NOT be valid across server restarts!');
    }
    return generatedJWTSecret;
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

// SECURITY FIX: Generate random refresh secret instead of using hardcoded default
let generatedRefreshSecret: string | null = null;

function getSecureJWTRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!secret) {
    if (isProduction) {
      throw new Error('JWT_REFRESH_SECRET environment variable is required in production');
    }

    // Generate a cryptographically secure random secret for development
    if (!generatedRefreshSecret) {
      generatedRefreshSecret = crypto.randomBytes(32).toString('hex');
      console.warn('⚠️ JWT_REFRESH_SECRET not set - generated random secret for this session');
      console.warn('⚠️ Refresh tokens will NOT be valid across server restarts!');
    }
    return generatedRefreshSecret;
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

export async function generateRefreshToken(userId: number): Promise<string> {
  // Add a unique identifier (jti - JWT ID) to prevent token collisions
  const { webcrypto } = await import('node:crypto');
  const randomBytes = webcrypto.getRandomValues(new Uint8Array(16));
  const jti = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
  
  const token = jwt.sign(
    { userId, type: 'refresh', jti }, 
    JWT_REFRESH_SECRET, 
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
  
  // Store refresh token in database for server-side validation
  try {
    const decoded = jwt.decode(token) as { exp?: number } | null;
    if (!decoded || !decoded.exp) {
      throw new Error('Invalid token expiry');
    }
    
    const expiresAt = new Date(decoded.exp * 1000).toISOString();
    
    await db
      .insertInto('refresh_tokens')
      .values({
        user_id: userId,
        token,
        expires_at: expiresAt,
      })
      .execute();
    
    // Sanitize userId for log output to prevent log injection/log forgery
    const sanitizedUserId = String(userId).replace(/[\r\n]/g, '');
    console.log(`✅ Refresh token stored in database for user: [userId: ${sanitizedUserId}]`);
  } catch (error) {
    console.error('❌ Failed to store refresh token in database:', error);
    throw error;
  }
  
  return token;
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
    // SECURITY FIX: Fail-secure instead of fail-open
    // If we can't check the blacklist, reject the token to be safe
    throw new Error('Unable to verify token status - access denied for security');
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

    const deletedCount = getAffectedRowCount(result);
    if (deletedCount > 0) {
      console.log(`🧹 Cleaned up ${deletedCount} expired blacklisted tokens`);
    }
    return deletedCount;
  } catch (error) {
    console.error('❌ Error cleaning up expired blacklisted tokens:', error);
    return 0;
  }
}

/**
 * Revoke a refresh token by marking it as revoked in the database
 */
export async function revokeRefreshToken(token: string, userId: number): Promise<boolean> {
  try {
    const result = await db
      .updateTable('refresh_tokens')
      .set({ revoked: 1 })
      .where('token', '=', token)
      .where('user_id', '=', userId)
      .execute();

    console.log('✅ Refresh token revoked for user:', userId);
    return true;
  } catch (error) {
    console.error('❌ Failed to revoke refresh token:', error);
    return false;
  }
}

/**
 * Helper function to normalize affected row counts across different database implementations
 */
function getAffectedRowCount(result: any[]): number {
  return result.reduce((acc, r) => {
    // PostgreSQL uses numAffectedRows, SQLite uses numChangedRows or numUpdatedRows
    return acc + Number(r.numAffectedRows || r.numChangedRows || r.numUpdatedRows || r.numDeletedRows || 0);
  }, 0);
}

/**
 * Revoke all refresh tokens for a user
 */
export async function revokeAllRefreshTokensForUser(userId: number): Promise<number> {
  try {
    const result = await db
      .updateTable('refresh_tokens')
      .set({ revoked: 1 })
      .where('user_id', '=', userId)
      .where('revoked', '=', 0)
      .execute();

    const revokedCount = getAffectedRowCount(result);
    if (revokedCount > 0) {
      console.log(`✅ Revoked ${revokedCount} refresh tokens for user:`, userId);
    }
    return revokedCount;
  } catch (error) {
    console.error('❌ Failed to revoke all refresh tokens:', error);
    return 0;
  }
}

/**
 * Clean up expired refresh tokens (should be run periodically)
 */
export async function cleanupExpiredRefreshTokens(): Promise<number> {
  try {
    const result = await db
      .deleteFrom('refresh_tokens')
      .where('expires_at', '<', new Date().toISOString())
      .execute();

    const deletedCount = getAffectedRowCount(result);
    if (deletedCount > 0) {
      console.log(`🧹 Cleaned up ${deletedCount} expired refresh tokens`);
    }
    return deletedCount;
  } catch (error) {
    console.error('❌ Error cleaning up expired refresh tokens:', error);
    return 0;
  }
}

/**
 * Verify and validate a refresh token against server-side storage
 */
export async function verifyRefreshToken(token: string): Promise<number | null> {
  try {
    // First verify JWT signature and decode
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as { userId: number; type: string };
    
    // Verify it's actually a refresh token
    if (decoded.type !== 'refresh') {
      console.log('❌ Token is not a refresh token');
      return null;
    }

    // Check if token exists in database and is not revoked
    const storedToken = await db
      .selectFrom('refresh_tokens')
      .select(['user_id', 'expires_at', 'revoked'])
      .where('token', '=', token)
      .where('revoked', '=', 0)
      .where('expires_at', '>', new Date().toISOString())
      .executeTakeFirst();

    if (!storedToken) {
      console.log('❌ Refresh token not found in database or has been revoked');
      return null;
    }

    // Verify user ID matches
    if (storedToken.user_id !== decoded.userId) {
      console.log('❌ Token user ID mismatch');
      return null;
    }

    // Update last_used_at timestamp
    await db
      .updateTable('refresh_tokens')
      .set({ last_used_at: new Date().toISOString() })
      .where('token', '=', token)
      .execute();

    return decoded.userId;
  } catch (error) {
    console.log('❌ Invalid refresh token:', error);
    return null;
  }
}

/**
 * Rotate refresh token - revoke old one in database and generate new one
 */
export async function rotateRefreshToken(
  oldToken: string,
  userId: number
): Promise<string | null> {
  try {
    // Revoke the old refresh token in the database
    await db
      .updateTable('refresh_tokens')
      .set({ revoked: 1 })
      .where('token', '=', oldToken)
      .where('user_id', '=', userId)
      .execute();
    
    // Generate new refresh token (this will store it in the database)
    const newToken = await generateRefreshToken(userId);
    
    console.log('✅ Refresh token rotated successfully for user:', userId);
    return newToken;
  } catch (error) {
    console.error('❌ Failed to rotate refresh token:', error);
    return null;
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
