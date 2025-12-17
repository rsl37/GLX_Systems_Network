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

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { 
  generateRefreshToken, 
  verifyRefreshToken, 
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokensForUser,
  cleanupExpiredRefreshTokens
} from '../../server/auth.js';
import { db } from '../../server/database.js';

describe('Refresh Token Server-Side Storage', () => {
  const testUserId = 99999;
  
  beforeAll(async () => {
    // Ensure the refresh_tokens table exists
    try {
      await db.schema
        .createTable('refresh_tokens')
        .ifNotExists()
        .addColumn('id', 'integer', col => col.primaryKey().autoIncrement())
        .addColumn('user_id', 'integer', col => col.notNull())
        .addColumn('token', 'text', col => col.notNull().unique())
        .addColumn('expires_at', 'datetime', col => col.notNull())
        .addColumn('created_at', 'datetime', col => col.defaultTo("datetime('now')"))
        .addColumn('last_used_at', 'datetime')
        .addColumn('revoked', 'integer', col => col.defaultTo(0))
        .execute();
    } catch (error) {
      // Table may already exist
    }
    
    // Clean up any existing test data
    await db.deleteFrom('refresh_tokens').where('user_id', '=', testUserId).execute();
  });

  afterAll(async () => {
    // Clean up test data
    await db.deleteFrom('refresh_tokens').where('user_id', '=', testUserId).execute();
  });

  test('should store refresh token in database when generated', async () => {
    const token = await generateRefreshToken(testUserId);
    
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    
    // Verify token is stored in database
    const storedToken = await db
      .selectFrom('refresh_tokens')
      .selectAll()
      .where('token', '=', token)
      .where('user_id', '=', testUserId)
      .executeTakeFirst();
    
    expect(storedToken).toBeDefined();
    expect(storedToken?.user_id).toBe(testUserId);
    expect(storedToken?.revoked).toBe(0);
    expect(storedToken?.token).toBe(token);
  });

  test('should verify refresh token against database', async () => {
    const token = await generateRefreshToken(testUserId);
    
    // Verify token
    const userId = await verifyRefreshToken(token);
    
    expect(userId).toBe(testUserId);
    
    // Verify last_used_at was updated
    const storedToken = await db
      .selectFrom('refresh_tokens')
      .select('last_used_at')
      .where('token', '=', token)
      .executeTakeFirst();
    
    expect(storedToken?.last_used_at).toBeDefined();
    expect(storedToken?.last_used_at).not.toBeNull();
  });

  test('should reject revoked refresh tokens', async () => {
    const token = await generateRefreshToken(testUserId);
    
    // Revoke the token
    await revokeRefreshToken(token, testUserId);
    
    // Attempt to verify revoked token
    const userId = await verifyRefreshToken(token);
    
    expect(userId).toBeNull();
  });

  test('should rotate refresh token and revoke old one', async () => {
    const oldToken = await generateRefreshToken(testUserId);
    
    // Rotate token
    const newToken = await rotateRefreshToken(oldToken, testUserId);
    
    expect(newToken).toBeDefined();
    expect(newToken).not.toBe(oldToken);
    
    // Old token should be revoked
    const oldUserId = await verifyRefreshToken(oldToken);
    expect(oldUserId).toBeNull();
    
    // New token should work
    const newUserId = await verifyRefreshToken(newToken);
    expect(newUserId).toBe(testUserId);
  });

  test('should revoke all refresh tokens for a user', async () => {
    // Generate multiple tokens
    const token1 = await generateRefreshToken(testUserId);
    const token2 = await generateRefreshToken(testUserId);
    const token3 = await generateRefreshToken(testUserId);
    
    // Verify all tokens work
    expect(await verifyRefreshToken(token1)).toBe(testUserId);
    expect(await verifyRefreshToken(token2)).toBe(testUserId);
    expect(await verifyRefreshToken(token3)).toBe(testUserId);
    
    // Revoke all tokens
    const revokedCount = await revokeAllRefreshTokensForUser(testUserId);
    expect(revokedCount).toBeGreaterThan(0);
    
    // All tokens should now be invalid
    expect(await verifyRefreshToken(token1)).toBeNull();
    expect(await verifyRefreshToken(token2)).toBeNull();
    expect(await verifyRefreshToken(token3)).toBeNull();
  });

  test('should reject token not in database', async () => {
    // Create a valid JWT but don't store it in database
    const jwt = await import('jsonwebtoken');
    const fakeToken = jwt.default.sign(
      { userId: testUserId, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET || 'test-secret',
      { expiresIn: '7d' }
    );
    
    // Should be rejected even though JWT is valid
    const userId = await verifyRefreshToken(fakeToken);
    expect(userId).toBeNull();
  });

  test('should clean up expired refresh tokens', async () => {
    // Create an expired token by manipulating the database directly
    const expiredToken = await generateRefreshToken(testUserId);
    
    // Set expiry to the past
    await db
      .updateTable('refresh_tokens')
      .set({ expires_at: new Date(Date.now() - 1000).toISOString() })
      .where('token', '=', expiredToken)
      .execute();
    
    // Run cleanup
    const deletedCount = await cleanupExpiredRefreshTokens();
    
    expect(deletedCount).toBeGreaterThan(0);
    
    // Verify token was deleted
    const storedToken = await db
      .selectFrom('refresh_tokens')
      .selectAll()
      .where('token', '=', expiredToken)
      .executeTakeFirst();
    
    expect(storedToken).toBeUndefined();
  });

  test('should reject token with mismatched user ID', async () => {
    const token = await generateRefreshToken(testUserId);
    
    // Manually change user_id in database
    await db
      .updateTable('refresh_tokens')
      .set({ user_id: testUserId + 1 })
      .where('token', '=', token)
      .execute();
    
    // Should be rejected due to user ID mismatch
    const userId = await verifyRefreshToken(token);
    expect(userId).toBeNull();
  });
});
