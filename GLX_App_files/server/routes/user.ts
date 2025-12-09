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

import { Router } from 'express';
import { AuthRequest, authenticateToken, hashPassword, comparePassword } from '../auth.js';
import {
  sendSuccess,
  sendError,
  validateAuthUser,
  StatusCodes,
  ErrorMessages,
} from '../utils/responseHelpers.js';
import { profileUpdateLimiter } from '../middleware/rateLimiter.js';
import { validateProfileUpdate } from '../middleware/validation.js';
import { db } from '../database.js';

const router = Router();

// Get user profile
router.get('/profile', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = validateAuthUser(req.userId);

    console.log('👤 Profile request for user:', userId);

    const user = await db
      .selectFrom('users')
      .select([
        'id',
        'email',
        'username',
        'avatar_url',
        'reputation_score',
        'ap_balance',
        'crowds_balance',
        'gov_balance',
        'roles',
        'skills',
        'badges',
        'email_verified',
        'phone',
        'phone_verified',
        'two_factor_enabled',
        'created_at',
        'wallet_address',
      ])
      .where('id', '=', userId)
      .executeTakeFirst();

    if (!user) {
      console.log('❌ Profile fetch failed: User not found');
      return sendError(res, ErrorMessages.USER_NOT_FOUND, StatusCodes.NOT_FOUND);
    }

    console.log('✅ Profile fetched successfully for:', user.username);
    sendSuccess(res, user);
  } catch (error) {
    console.error('❌ Profile fetch error:', error);
    if (error.message === ErrorMessages.INVALID_TOKEN) {
      return sendError(res, ErrorMessages.INVALID_TOKEN, StatusCodes.UNAUTHORIZED);
    }
    throw error;
  }
});

// Update user profile
router.put('/profile', profileUpdateLimiter, authenticateToken, validateProfileUpdate, async (req: AuthRequest, res) => {
  try {
    const userId = validateAuthUser(req.userId);
    const { username, email, phone, skills, bio, wallet_address } = req.body;

    console.log('📝 Profile update for user:', userId);

    // Check if username is already taken by another user
    if (username) {
      const existingUser = await db
        .selectFrom('users')
        .select('id')
        .where('username', '=', username)
        .where('id', '!=', userId)
        .executeTakeFirst();

      if (existingUser) {
        return sendError(res, 'Username is already taken', StatusCodes.BAD_REQUEST);
      }
    }

    // Check if wallet address is already taken by another user
    if (wallet_address) {
      const existingWallet = await db
        .selectFrom('users')
        .select('id')
        .where('wallet_address', '=', wallet_address)
        .where('id', '!=', userId)
        .executeTakeFirst();

      if (existingWallet) {
        return sendError(res, 'Wallet address is already associated with another account', StatusCodes.BAD_REQUEST);
      }
    }

    // Update user profile
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (username) updateData.username = username;
    if (email !== undefined) updateData.email = email || null;
    if (phone !== undefined) updateData.phone = phone || null;
    if (skills !== undefined) updateData.skills = skills || '[]';
    if (wallet_address !== undefined) updateData.wallet_address = wallet_address || null;

    await db
      .updateTable('users')
      .set(updateData)
      .where('id', '=', userId)
      .execute();

    console.log('✅ Profile updated successfully for user:', userId);
    sendSuccess(res, { message: 'Profile updated successfully' });
  } catch (error) {
    console.error('❌ Profile update error:', error);
    if (error.message === ErrorMessages.INVALID_TOKEN) {
      return sendError(res, ErrorMessages.INVALID_TOKEN, StatusCodes.UNAUTHORIZED);
    }
    throw error;
  }
});

// Change password
router.post('/change-password', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = validateAuthUser(req.userId);
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return sendError(res, 'Current password and new password are required', StatusCodes.BAD_REQUEST);
    }

    if (newPassword.length < 8) {
      return sendError(res, 'New password must be at least 8 characters long', StatusCodes.BAD_REQUEST);
    }

    // Get current user
    const user = await db
      .selectFrom('users')
      .select(['password_hash'])
      .where('id', '=', userId)
      .executeTakeFirst();

    if (!user || !user.password_hash) {
      return sendError(res, 'Cannot change password for this account type', StatusCodes.BAD_REQUEST);
    }

    // Verify current password
    const isValid = await comparePassword(currentPassword, user.password_hash);
    if (!isValid) {
      return sendError(res, 'Current password is incorrect', StatusCodes.UNAUTHORIZED);
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await db
      .updateTable('users')
      .set({
        password_hash: newPasswordHash,
        updated_at: new Date().toISOString(),
      })
      .where('id', '=', userId)
      .execute();

    console.log('✅ Password changed successfully for user:', userId);
    sendSuccess(res, { message: 'Password changed successfully' });
  } catch (error) {
    console.error('❌ Password change error:', error);
    if (error.message === ErrorMessages.INVALID_TOKEN) {
      return sendError(res, ErrorMessages.INVALID_TOKEN, StatusCodes.UNAUTHORIZED);
    }
    sendError(res, ErrorMessages.INTERNAL_ERROR, StatusCodes.INTERNAL_ERROR);
  }
});

// Privacy settings endpoints
router.get('/privacy-settings', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = validateAuthUser(req.userId);

    // Get privacy settings from user_privacy table
    let privacySettings = await db
      .selectFrom('user_privacy')
      .select(['show_email', 'show_phone', 'show_wallet', 'wallet_display_mode'])
      .where('user_id', '=', userId)
      .executeTakeFirst();

    if (!privacySettings) {
      // Create default privacy settings
      await db
        .insertInto('user_privacy')
        .values({
          user_id: userId,
          show_email: 0,
          show_phone: 0,
          show_wallet: 0,
          wallet_display_mode: 'hidden',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .execute();

      privacySettings = {
        show_email: 0,
        show_phone: 0,
        show_wallet: 0,
        wallet_display_mode: 'hidden',
      };
    }

    sendSuccess(res, {
      showEmail: !!privacySettings.show_email,
      showPhone: !!privacySettings.show_phone,
      showWallet: !!privacySettings.show_wallet,
      walletDisplayMode: privacySettings.wallet_display_mode,
    });
  } catch (error) {
    console.error('❌ Privacy settings fetch error:', error);
    if (error.message === ErrorMessages.INVALID_TOKEN) {
      return sendError(res, ErrorMessages.INVALID_TOKEN, StatusCodes.UNAUTHORIZED);
    }
    sendError(res, 'Failed to fetch privacy settings', StatusCodes.INTERNAL_ERROR);
  }
});

router.put('/privacy-settings', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = validateAuthUser(req.userId);
    const { showEmail, showPhone, showWallet, walletDisplayMode } = req.body;

    // Validate input
    if (
      typeof showEmail !== 'boolean' ||
      typeof showPhone !== 'boolean' ||
      typeof showWallet !== 'boolean'
    ) {
      return sendError(res, 'Invalid privacy settings format', StatusCodes.BAD_REQUEST);
    }

    if (walletDisplayMode && !['hidden', 'public', 'tip-button'].includes(walletDisplayMode)) {
      return sendError(res, 'Invalid wallet display mode', StatusCodes.BAD_REQUEST);
    }

    // Update or insert privacy settings
    const existingSettings = await db
      .selectFrom('user_privacy')
      .select('user_id')
      .where('user_id', '=', userId)
      .executeTakeFirst();

    if (existingSettings) {
      await db
        .updateTable('user_privacy')
        .set({
          show_email: showEmail ? 1 : 0,
          show_phone: showPhone ? 1 : 0,
          show_wallet: showWallet ? 1 : 0,
          wallet_display_mode: walletDisplayMode || 'hidden',
          updated_at: new Date().toISOString(),
        })
        .where('user_id', '=', userId)
        .execute();
    } else {
      await db
        .insertInto('user_privacy')
        .values({
          user_id: userId,
          show_email: showEmail ? 1 : 0,
          show_phone: showPhone ? 1 : 0,
          show_wallet: showWallet ? 1 : 0,
          wallet_display_mode: walletDisplayMode || 'hidden',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .execute();
    }

    console.log('✅ Privacy settings updated for user:', userId);
    sendSuccess(res, { message: 'Privacy settings updated successfully' });
  } catch (error) {
    console.error('❌ Privacy settings update error:', error);
    if (error.message === ErrorMessages.INVALID_TOKEN) {
      return sendError(res, ErrorMessages.INVALID_TOKEN, StatusCodes.UNAUTHORIZED);
    }
    sendError(res, 'Failed to update privacy settings', StatusCodes.INTERNAL_ERROR);
  }
});

// User statistics
router.get('/stats', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = validateAuthUser(req.userId);

    console.log('📊 Stats request for user:', userId);

    // Get user statistics
    const helpRequestsCreated = await db
      .selectFrom('help_requests')
      .select(db.fn.count('id').as('count'))
      .where('requester_id', '=', userId)
      .executeTakeFirst();

    const helpOffered = await db
      .selectFrom('help_requests')
      .select(db.fn.count('id').as('count'))
      .where('helper_id', '=', userId)
      .executeTakeFirst();

    const crisisReported = await db
      .selectFrom('crisis_alerts')
      .select(db.fn.count('id').as('count'))
      .where('created_by', '=', userId)
      .executeTakeFirst();

    const proposalsCreated = await db
      .selectFrom('proposals')
      .select(db.fn.count('id').as('count'))
      .where('created_by', '=', userId)
      .executeTakeFirst();

    const votescast = await db
      .selectFrom('votes')
      .select(db.fn.count('id').as('count'))
      .where('user_id', '=', userId)
      .executeTakeFirst();

    // Get recent activity
    const recentActivity = await db
      .selectFrom('help_requests')
      .select(['id', 'title', 'category', 'urgency', 'created_at'])
      .where('requester_id', '=', userId)
      .orderBy('created_at', 'desc')
      .limit(5)
      .execute();

    const stats = {
      helpRequestsCreated: Number(helpRequestsCreated?.count || 0),
      helpOffered: Number(helpOffered?.count || 0),
      crisisReported: Number(crisisReported?.count || 0),
      proposalsCreated: Number(proposalsCreated?.count || 0),
      votescast: Number(votescast?.count || 0),
      recentActivity: recentActivity,
    };

    console.log('✅ Stats fetched successfully:', stats);
    sendSuccess(res, stats);
  } catch (error) {
    console.error('❌ Stats fetch error:', error);
    if (error.message === ErrorMessages.INVALID_TOKEN) {
      return sendError(res, ErrorMessages.INVALID_TOKEN, StatusCodes.UNAUTHORIZED);
    }
    throw error;
  }
});

export default router;
