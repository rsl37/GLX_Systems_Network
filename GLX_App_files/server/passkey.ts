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

import { db } from './database.js';
import { webcrypto } from 'node:crypto';

/**
 * Passkey credential data structure
 */
export interface PasskeyCredential {
  id: number;
  userId: number;
  credentialId: string;
  publicKey: string;
  counter: number;
  deviceName?: string;
  createdAt: string;
  lastUsedAt?: string;
}

/**
 * Registration challenge data
 */
export interface RegistrationChallenge {
  challenge: string;
  userId: number;
  timestamp: number;
}

/**
 * Authentication challenge data
 */
export interface AuthenticationChallenge {
  challenge: string;
  timestamp: number;
}

/**
 * In-memory challenge store
 * 
 * ⚠️ PRODUCTION NOTE: This in-memory store is suitable for development and single-instance deployments.
 * For production with load balancers or multiple instances:
 * - Use Redis for distributed challenge storage
 * - WebAuthn challenges must be accessible across different server instances
 * - Critical for proper load-balanced authentication flow
 * 
 * Example Redis implementation:
 * ```typescript
 * await redis.setex(`passkey:challenge:${challenge}`, 300, JSON.stringify(data));
 * ```
 */
const challengeStore = new Map<string, RegistrationChallenge | AuthenticationChallenge>();

/**
 * Generate a cryptographically secure random challenge
 */
export function generateChallenge(): string {
  const randomBytes = webcrypto.getRandomValues(new Uint8Array(32));
  return Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Store a challenge for verification
 */
export function storeChallenge(
  challenge: string,
  data: RegistrationChallenge | AuthenticationChallenge
): void {
  challengeStore.set(challenge, data);

  // Clean up old challenges (older than 5 minutes)
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  for (const [key, value] of challengeStore.entries()) {
    if (value.timestamp < fiveMinutesAgo) {
      challengeStore.delete(key);
    }
  }
}

/**
 * Validate and retrieve a challenge
 */
export function validateChallenge(challenge: string): (RegistrationChallenge | AuthenticationChallenge) | null {
  const stored = challengeStore.get(challenge);

  if (!stored) {
    return null;
  }

  // Check if challenge is still valid (within 5 minutes)
  const isExpired = Date.now() - stored.timestamp > 5 * 60 * 1000;

  if (isExpired) {
    challengeStore.delete(challenge);
    return null;
  }

  // Remove challenge after validation (one-time use)
  challengeStore.delete(challenge);

  return stored;
}

/**
 * Register a new passkey credential
 */
export async function registerPasskey(
  userId: number,
  credentialId: string,
  publicKey: string,
  deviceName?: string
): Promise<boolean> {
  try {
    // Check if credential already exists
    const existing = await db
      .selectFrom('passkey_credentials')
      .select('id')
      .where('credential_id', '=', credentialId)
      .executeTakeFirst();

    if (existing) {
      console.log('❌ Passkey credential already registered');
      return false;
    }

    // Insert new credential
    await db
      .insertInto('passkey_credentials')
      .values({
        user_id: userId,
        credential_id: credentialId,
        public_key: publicKey,
        counter: 0,
        device_name: deviceName || null,
        created_at: new Date().toISOString(),
        last_used_at: null,
      })
      .execute();

    console.log('✅ Passkey registered successfully for user:', userId);
    return true;
  } catch (error) {
    console.error('❌ Failed to register passkey:', error);
    return false;
  }
}

/**
 * Get all passkeys for a user
 */
export async function getUserPasskeys(userId: number): Promise<PasskeyCredential[]> {
  try {
    const credentials = await db
      .selectFrom('passkey_credentials')
      .select([
        'id',
        'user_id as userId',
        'credential_id as credentialId',
        'public_key as publicKey',
        'counter',
        'device_name as deviceName',
        'created_at as createdAt',
        'last_used_at as lastUsedAt',
      ])
      .where('user_id', '=', userId)
      .execute();

    return credentials as unknown as PasskeyCredential[];
  } catch (error) {
    console.error('❌ Error fetching passkeys:', error);
    return [];
  }
}

/**
 * Get a passkey by credential ID
 */
export async function getPasskeyByCredentialId(credentialId: string): Promise<PasskeyCredential | null> {
  try {
    const credential = await db
      .selectFrom('passkey_credentials')
      .select([
        'id',
        'user_id as userId',
        'credential_id as credentialId',
        'public_key as publicKey',
        'counter',
        'device_name as deviceName',
        'created_at as createdAt',
        'last_used_at as lastUsedAt',
      ])
      .where('credential_id', '=', credentialId)
      .executeTakeFirst();

    return credential as unknown as PasskeyCredential | null;
  } catch (error) {
    console.error('❌ Error fetching passkey:', error);
    return null;
  }
}

/**
 * Update passkey counter and last used timestamp
 */
export async function updatePasskeyUsage(
  credentialId: string,
  counter: number
): Promise<boolean> {
  try {
    await db
      .updateTable('passkey_credentials')
      .set({
        counter,
        last_used_at: new Date().toISOString(),
      })
      .where('credential_id', '=', credentialId)
      .execute();

    console.log('✅ Passkey usage updated');
    return true;
  } catch (error) {
    console.error('❌ Failed to update passkey usage:', error);
    return false;
  }
}

/**
 * Delete a passkey
 */
export async function deletePasskey(
  userId: number,
  credentialId: string
): Promise<boolean> {
  try {
    const result = await db
      .deleteFrom('passkey_credentials')
      .where('user_id', '=', userId)
      .where('credential_id', '=', credentialId)
      .execute();

    const deleted = result.reduce((acc, r) => acc + Number(r.numDeletedRows || 0), 0);

    if (deleted > 0) {
      console.log('✅ Passkey deleted successfully');
      return true;
    }

    console.log('⚠️ No passkey found to delete');
    return false;
  } catch (error) {
    console.error('❌ Error deleting passkey:', error);
    return false;
  }
}

/**
 * Rename a passkey device
 */
export async function renamePasskey(
  userId: number,
  credentialId: string,
  newName: string
): Promise<boolean> {
  try {
    const result = await db
      .updateTable('passkey_credentials')
      .set({ device_name: newName })
      .where('user_id', '=', userId)
      .where('credential_id', '=', credentialId)
      .execute();

    const updated = result.reduce((acc, r) => acc + Number(r.numUpdatedRows || 0), 0);

    if (updated > 0) {
      console.log('✅ Passkey renamed successfully');
      return true;
    }

    console.log('⚠️ No passkey found to rename');
    return false;
  } catch (error) {
    console.error('❌ Error renaming passkey:', error);
    return false;
  }
}

/**
 * Verify passkey authentication
 * This is a simplified version - in production, you would use a proper WebAuthn library
 * like @simplewebauthn/server to handle the full verification process
 */
export async function verifyPasskeyAuthentication(
  credentialId: string,
  counter: number
): Promise<{ valid: boolean; userId?: number }> {
  try {
    const credential = await getPasskeyByCredentialId(credentialId);

    if (!credential) {
      console.log('❌ Passkey not found');
      return { valid: false };
    }

    // Verify counter to prevent replay attacks
    // Counter should be strictly increasing
    if (counter <= credential.counter) {
      console.log('❌ Passkey counter did not increase - possible replay attack');
      return { valid: false };
    }

    // Update counter
    await updatePasskeyUsage(credentialId, counter);

    console.log('✅ Passkey authentication verified for user:', credential.userId);
    return { valid: true, userId: credential.userId };
  } catch (error) {
    console.error('❌ Error verifying passkey authentication:', error);
    return { valid: false };
  }
}
