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

/**
 * OAuth provider types
 */
export type OAuthProvider = 'google' | 'github' | 'facebook' | 'twitter';

/**
 * OAuth account data structure
 */
export interface OAuthAccountData {
  provider: OAuthProvider;
  providerId: string;
  providerEmail?: string;
  providerName?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
}

/**
 * Link an OAuth account to a user
 */
export async function linkOAuthAccount(
  userId: number,
  accountData: OAuthAccountData
): Promise<boolean> {
  try {
    // Check if this OAuth account is already linked to another user
    const existingAccount = await db
      .selectFrom('oauth_accounts')
      .select('user_id')
      .where('provider', '=', accountData.provider)
      .where('provider_id', '=', accountData.providerId)
      .executeTakeFirst();

    if (existingAccount) {
      if (existingAccount.user_id === userId) {
        // Update existing link
        await db
          .updateTable('oauth_accounts')
          .set({
            provider_email: accountData.providerEmail || null,
            provider_name: accountData.providerName || null,
            access_token: accountData.accessToken || null,
            refresh_token: accountData.refreshToken || null,
            expires_at: accountData.expiresAt || null,
            updated_at: new Date().toISOString(),
          })
          .where('provider', '=', accountData.provider)
          .where('provider_id', '=', accountData.providerId)
          .where('user_id', '=', userId)
          .execute();

        console.log(`✅ Updated ${accountData.provider} OAuth link for user:`, userId);
        return true;
      } else {
        console.log(`❌ ${accountData.provider} account already linked to another user`);
        return false;
      }
    }

    // Create new OAuth link
    await db
      .insertInto('oauth_accounts')
      .values({
        user_id: userId,
        provider: accountData.provider,
        provider_id: accountData.providerId,
        provider_email: accountData.providerEmail || null,
        provider_name: accountData.providerName || null,
        access_token: accountData.accessToken || null,
        refresh_token: accountData.refreshToken || null,
        expires_at: accountData.expiresAt || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .execute();

    console.log(`✅ Linked ${accountData.provider} OAuth account for user:`, userId);
    return true;
  } catch (error) {
    console.error(`❌ Failed to link ${accountData.provider} OAuth account:`, error);
    return false;
  }
}

/**
 * Find user by OAuth account
 */
export async function findUserByOAuth(
  provider: OAuthProvider,
  providerId: string
): Promise<number | null> {
  try {
    const account = await db
      .selectFrom('oauth_accounts')
      .select('user_id')
      .where('provider', '=', provider)
      .where('provider_id', '=', providerId)
      .executeTakeFirst();

    return account?.user_id || null;
  } catch (error) {
    console.error(`❌ Error finding user by ${provider} OAuth:`, error);
    return null;
  }
}

/**
 * Get all OAuth accounts for a user
 */
export async function getUserOAuthAccounts(userId: number) {
  try {
    const accounts = await db
      .selectFrom('oauth_accounts')
      .select([
        'id',
        'provider',
        'provider_email',
        'provider_name',
        'created_at',
      ])
      .where('user_id', '=', userId)
      .execute();

    return accounts;
  } catch (error) {
    console.error('❌ Error fetching OAuth accounts:', error);
    return [];
  }
}

/**
 * Unlink an OAuth account from a user
 */
export async function unlinkOAuthAccount(
  userId: number,
  provider: OAuthProvider
): Promise<boolean> {
  try {
    const result = await db
      .deleteFrom('oauth_accounts')
      .where('user_id', '=', userId)
      .where('provider', '=', provider)
      .execute();

    const deleted = result.reduce((acc, r) => acc + Number(r.numDeletedRows || 0), 0);
    
    if (deleted > 0) {
      console.log(`✅ Unlinked ${provider} OAuth account for user:`, userId);
      return true;
    }
    
    console.log(`⚠️ No ${provider} OAuth account found for user:`, userId);
    return false;
  } catch (error) {
    console.error(`❌ Error unlinking ${provider} OAuth account:`, error);
    return false;
  }
}

/**
 * Create or link user from OAuth data
 * This is used during OAuth login flow
 */
export async function createOrLinkOAuthUser(
  accountData: OAuthAccountData,
  username?: string
): Promise<{ userId: number; isNewUser: boolean } | null> {
  try {
    // Check if OAuth account already exists
    const existingUserId = await findUserByOAuth(accountData.provider, accountData.providerId);
    
    if (existingUserId) {
      // Update OAuth account data
      await linkOAuthAccount(existingUserId, accountData);
      return { userId: existingUserId, isNewUser: false };
    }

    // Check if user exists by email
    if (accountData.providerEmail) {
      const existingUser = await db
        .selectFrom('users')
        .select('id')
        .where('email', '=', accountData.providerEmail)
        .executeTakeFirst();

      if (existingUser) {
        // Link OAuth to existing user
        const linked = await linkOAuthAccount(existingUser.id, accountData);
        if (linked) {
          return { userId: existingUser.id, isNewUser: false };
        }
        return null;
      }
    }

    // Create new user
    const generatedUsername = username || 
      `${accountData.provider}_${accountData.providerId.substring(0, 8)}`;
    
    const newUser = await db
      .insertInto('users')
      .values({
        email: accountData.providerEmail || null,
        username: generatedUsername,
        password_hash: null, // OAuth users don't have password
        wallet_address: null,
        reputation_score: 0,
        ap_balance: 1000,
        crowds_balance: 0,
        gov_balance: 0,
        roles: 'helper,requester,voter',
        skills: '[]',
        badges: '[]',
        email_verified: accountData.providerEmail ? 1 : 0, // Trust OAuth provider's email
        phone: null,
        phone_verified: 0,
        two_factor_enabled: 0,
        two_factor_secret: null,
      })
      .returning('id')
      .executeTakeFirst();

    if (!newUser) {
      console.log('❌ Failed to create new user from OAuth');
      return null;
    }

    // Link OAuth account to new user
    const linked = await linkOAuthAccount(newUser.id, accountData);
    if (!linked) {
      console.log('❌ Failed to link OAuth account to new user');
      return null;
    }

    console.log(`✅ Created new user from ${accountData.provider} OAuth:`, newUser.id);
    return { userId: newUser.id, isNewUser: true };
  } catch (error) {
    console.error('❌ Error creating or linking OAuth user:', error);
    return null;
  }
}

/**
 * Validate OAuth state parameter to prevent CSRF
 */
export function generateOAuthState(): string {
  // Generate cryptographically secure random state
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Store OAuth state in memory (for production, use Redis or database)
 * This is a simple in-memory store for development
 */
const oauthStateStore = new Map<string, { timestamp: number; userId?: number }>();

export function storeOAuthState(state: string, userId?: number): void {
  oauthStateStore.set(state, { timestamp: Date.now(), userId });
  
  // Clean up old states (older than 10 minutes)
  const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
  for (const [key, value] of oauthStateStore.entries()) {
    if (value.timestamp < tenMinutesAgo) {
      oauthStateStore.delete(key);
    }
  }
}

export function validateOAuthState(state: string): { valid: boolean; userId?: number } {
  const stored = oauthStateStore.get(state);
  
  if (!stored) {
    return { valid: false };
  }

  // Check if state is still valid (within 10 minutes)
  const isExpired = Date.now() - stored.timestamp > 10 * 60 * 1000;
  
  if (isExpired) {
    oauthStateStore.delete(state);
    return { valid: false };
  }

  // Remove state after validation (one-time use)
  oauthStateStore.delete(state);
  
  return { valid: true, userId: stored.userId };
}
