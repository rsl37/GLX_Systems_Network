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

import { db } from './database.js';
import jwt from 'jsonwebtoken';

/**
 * User session information
 */
export interface UserSession {
  id: number;
  userId: number;
  token: string;
  refreshToken: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
  lastActivity: string;
  createdAt: string;
  expiresAt: string;
}

/**
 * Session storage interface
 * For production, this should be Redis or similar distributed cache
 */
interface SessionData {
  userId: number;
  token: string;
  refreshToken: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
  lastActivity: number;
  createdAt: number;
  expiresAt: number;
}

// In-memory session store (replace with Redis in production)
const sessionStore = new Map<string, SessionData>();

/**
 * Create a new session
 */
export function createSession(
  userId: number,
  token: string,
  refreshToken: string,
  options?: {
    deviceInfo?: string;
    ipAddress?: string;
    userAgent?: string;
  }
): string {
  const sessionId = generateSessionId();
  const now = Date.now();
  const expiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7 days

  const session: SessionData = {
    userId,
    token,
    refreshToken,
    deviceInfo: options?.deviceInfo,
    ipAddress: options?.ipAddress,
    userAgent: options?.userAgent,
    lastActivity: now,
    createdAt: now,
    expiresAt,
  };

  sessionStore.set(sessionId, session);
  
  // Clean up expired sessions
  cleanupExpiredSessions();

  console.log('✅ Session created for user:', userId);
  return sessionId;
}

/**
 * Get a session by ID
 */
export function getSession(sessionId: string): SessionData | null {
  const session = sessionStore.get(sessionId);
  
  if (!session) {
    return null;
  }

  // Check if session is expired
  if (Date.now() > session.expiresAt) {
    sessionStore.delete(sessionId);
    return null;
  }

  return session;
}

/**
 * Update session activity
 */
export function updateSessionActivity(sessionId: string): boolean {
  const session = sessionStore.get(sessionId);
  
  if (!session) {
    return false;
  }

  session.lastActivity = Date.now();
  return true;
}

/**
 * Get all active sessions for a user
 */
export function getUserSessions(userId: number): Array<{ sessionId: string } & SessionData> {
  const sessions: Array<{ sessionId: string } & SessionData> = [];
  
  for (const [sessionId, session] of sessionStore.entries()) {
    if (session.userId === userId && Date.now() <= session.expiresAt) {
      sessions.push({ sessionId, ...session });
    }
  }

  return sessions;
}

/**
 * Revoke a specific session
 */
export async function revokeSession(sessionId: string): Promise<boolean> {
  const session = sessionStore.get(sessionId);
  
  if (!session) {
    return false;
  }

  // Import blacklistToken to revoke tokens
  const { blacklistToken } = await import('./auth.js');
  
  // Blacklist both access and refresh tokens
  await blacklistToken(session.token, session.userId, 'session_revoked');
  await blacklistToken(session.refreshToken, session.userId, 'session_revoked');
  
  // Remove session
  sessionStore.delete(sessionId);
  
  console.log('✅ Session revoked:', sessionId);
  return true;
}

/**
 * Revoke all sessions for a user (except optionally the current one)
 */
export async function revokeAllUserSessions(
  userId: number,
  exceptSessionId?: string
): Promise<number> {
  const sessions = getUserSessions(userId);
  let revokedCount = 0;

  for (const session of sessions) {
    if (session.sessionId !== exceptSessionId) {
      const revoked = await revokeSession(session.sessionId);
      if (revoked) {
        revokedCount++;
      }
    }
  }

  console.log(`✅ Revoked ${revokedCount} sessions for user:`, userId);
  return revokedCount;
}

/**
 * Clean up expired sessions
 */
export function cleanupExpiredSessions(): number {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [sessionId, session] of sessionStore.entries()) {
    if (now > session.expiresAt) {
      sessionStore.delete(sessionId);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    console.log(`🧹 Cleaned up ${cleanedCount} expired sessions`);
  }

  return cleanedCount;
}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Extract device info from user agent
 */
export function extractDeviceInfo(userAgent?: string): string {
  if (!userAgent) {
    return 'Unknown Device';
  }

  // Simple device detection
  if (userAgent.includes('Mobile')) {
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('iPad')) return 'iPad';
    if (userAgent.includes('Android')) return 'Android Mobile';
    return 'Mobile Device';
  }

  if (userAgent.includes('Windows')) return 'Windows PC';
  if (userAgent.includes('Mac')) return 'Mac';
  if (userAgent.includes('Linux')) return 'Linux PC';
  if (userAgent.includes('Chrome')) return 'Chrome Browser';
  if (userAgent.includes('Firefox')) return 'Firefox Browser';
  if (userAgent.includes('Safari')) return 'Safari Browser';

  return 'Unknown Device';
}

/**
 * Get session statistics for a user
 */
export function getUserSessionStats(userId: number): {
  total: number;
  active: number;
  devices: string[];
  lastActivity: number;
} {
  const sessions = getUserSessions(userId);
  const now = Date.now();
  const recentThreshold = now - 30 * 60 * 1000; // 30 minutes

  const active = sessions.filter(s => s.lastActivity > recentThreshold).length;
  const devices = [...new Set(sessions.map(s => s.deviceInfo || 'Unknown'))];
  const lastActivity = Math.max(...sessions.map(s => s.lastActivity), 0);

  return {
    total: sessions.length,
    active,
    devices,
    lastActivity,
  };
}

// Auto-cleanup expired sessions every 30 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    cleanupExpiredSessions();
  }, 30 * 60 * 1000);
}
