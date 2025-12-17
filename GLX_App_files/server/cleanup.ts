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

import { cleanupExpiredBlacklistedTokens, cleanupExpiredRefreshTokens } from './auth.js';

/**
 * Periodic cleanup task for expired tokens
 * Runs every hour to clean up expired refresh tokens and blacklisted tokens
 */
export function startTokenCleanupTask(): NodeJS.Timeout {
  console.log('🔄 Starting periodic token cleanup task (runs every hour)');
  
  // Run cleanup immediately on startup
  performCleanup();
  
  // Then run every hour
  return setInterval(() => {
    performCleanup();
  }, 60 * 60 * 1000); // 1 hour
}

/**
 * Perform the actual cleanup of expired tokens
 */
async function performCleanup() {
  try {
    console.log('🧹 Starting scheduled token cleanup...');
    
    // Clean up expired refresh tokens
    const refreshTokensDeleted = await cleanupExpiredRefreshTokens();
    
    // Clean up expired blacklisted tokens
    const blacklistedTokensDeleted = await cleanupExpiredBlacklistedTokens();
    
    if (refreshTokensDeleted > 0 || blacklistedTokensDeleted > 0) {
      console.log(`✅ Token cleanup complete: ${refreshTokensDeleted} refresh tokens, ${blacklistedTokensDeleted} blacklisted tokens removed`);
    } else {
      console.log('✅ Token cleanup complete: No expired tokens found');
    }
  } catch (error) {
    console.error('❌ Error during token cleanup:', error);
  }
}

/**
 * Stop the cleanup task
 */
export function stopTokenCleanupTask(intervalId: NodeJS.Timeout): void {
  clearInterval(intervalId);
  console.log('🛑 Token cleanup task stopped');
}
