/*
 * Copyright (c) 2025 GALAX Civic Networking App
 *
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import { Router } from 'express';
import { AuthRequest, authenticateToken } from '../auth.js';
import { sendSuccess, sendError, validateAuthUser, validateNumericId, StatusCodes, ErrorMessages } from '../utils/responseHelpers.js';
import { db } from '../database.js';

const router = Router();

// Chat messages endpoint
router.get('/chat/:helpRequestId/messages', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const helpRequestId = validateNumericId(req.params.helpRequestId, 'help request ID');

    console.log('💬 Fetching chat messages:', {
      helpRequestId,
      userId: req.userId,
    });

    const messages = await db
      .selectFrom('messages')
      .innerJoin('users', 'users.id', 'messages.sender_id')
      .select([
        'messages.id',
        'messages.message',
        'messages.created_at',
        'users.username as sender_username',
        'users.avatar_url as sender_avatar',
      ])
      .where('messages.help_request_id', '=', helpRequestId)
      .orderBy('messages.created_at', 'asc')
      .execute();

    console.log('✅ Fetched messages:', messages.length);
    sendSuccess(res, messages);
  } catch (error) {
    console.error('❌ Chat messages fetch error:', error);
    if (error.message.includes('Invalid')) {
      return sendError(res, error.message, StatusCodes.BAD_REQUEST);
    }
    throw error;
  }
});

// Transactions endpoint
router.get('/transactions', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = validateAuthUser(req.userId);

    console.log('💰 Fetching transactions for user:', userId);

    const transactions = await db
      .selectFrom('transactions')
      .selectAll()
      .where('user_id', '=', userId)
      .orderBy('created_at', 'desc')
      .limit(20)
      .execute();

    console.log('✅ Fetched transactions:', transactions.length);
    sendSuccess(res, transactions);
  } catch (error) {
    console.error('❌ Transactions fetch error:', error);
    if (error.message === ErrorMessages.INVALID_TOKEN) {
      return sendError(res, ErrorMessages.INVALID_TOKEN, StatusCodes.UNAUTHORIZED);
    }
    throw error;
  }
});

// Action Points claim endpoint
router.post('/claim', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = validateAuthUser(req.userId);
    const { amount = 100 } = req.body;

    if (typeof amount !== 'number' || amount <= 0 || amount > 1000) {
      return sendError(res, 'Invalid claim amount. Must be between 1 and 1000', StatusCodes.BAD_REQUEST);
    }

    console.log('💎 AP claim request:', { userId, amount });

    // Check current balance
    const user = await db
      .selectFrom('users')
      .select(['ap_balance'])
      .where('id', '=', userId)
      .executeTakeFirst();

    if (!user || user.ap_balance < amount) {
      console.log('❌ AP claim failed: Insufficient balance');
      return sendError(res, 'Insufficient AP balance', StatusCodes.BAD_REQUEST);
    }

    // Deduct AP
    await db
      .updateTable('users')
      .set({ ap_balance: user.ap_balance - amount })
      .where('id', '=', userId)
      .execute();

    // Record transaction
    await db
      .insertInto('transactions')
      .values({
        user_id: userId,
        type: 'claim',
        amount: -amount,
        token_type: 'AP',
        description: 'Help Now action claim',
      })
      .execute();

    console.log('✅ AP claimed successfully');
    sendSuccess(res, {
      newBalance: user.ap_balance - amount,
      message: 'AP claimed successfully',
    });
  } catch (error) {
    console.error('❌ AP claim error:', error);
    if (error.message === ErrorMessages.INVALID_TOKEN) {
      return sendError(res, ErrorMessages.INVALID_TOKEN, StatusCodes.UNAUTHORIZED);
    }
    throw error;
  }
});

export default router;