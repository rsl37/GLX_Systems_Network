/*
 * Copyright (c) 2025 GALAX Civic Networking App
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
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

export interface AuthRequest extends Request {
  userId?: number;
  username?: string;
}

export async function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    req.userId = decoded.userId;
    
    // Get username for Pusher auth
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
