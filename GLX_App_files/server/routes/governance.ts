/*
 * Copyright (c) 2025 GLX Civic Networking App
 *
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import { Router } from 'express';
import { AuthRequest, authenticateToken } from '../auth.js';
import {
  sendSuccess,
  sendError,
  validateAuthUser,
  validateNumericId,
  StatusCodes,
  ErrorMessages,
} from '../utils/responseHelpers.js';
import { votingLimiter } from '../middleware/rateLimiter.js';
import { validateProposal, validateVote } from '../middleware/validation.js';
import { db } from '../database.js';

const router = Router();

// Create proposal
router.post('/', authenticateToken, validateProposal, async (req: AuthRequest, res) => {
  try {
    const userId = validateAuthUser(req.userId);
    const { title, description, category, deadline } = req.body;

    console.log('🗳️ Creating proposal:', {
      title,
      category,
      userId,
    });

    const proposal = await db
      .insertInto('proposals')
      .values({
        title,
        description,
        category,
        created_by: userId,
        deadline,
        status: 'active',
        votes_for: 0,
        votes_against: 0,
      })
      .returning('id')
      .executeTakeFirst();

    if (!proposal) {
      console.log('❌ Proposal creation failed');
      return sendError(res, 'Failed to create proposal', StatusCodes.INTERNAL_ERROR);
    }

    console.log('✅ Proposal created:', proposal.id);
    sendSuccess(res, { id: proposal.id });
  } catch (error) {
    console.error('❌ Proposal creation error:', error);
    if (error.message === ErrorMessages.INVALID_TOKEN) {
      return sendError(res, ErrorMessages.INVALID_TOKEN, StatusCodes.UNAUTHORIZED);
    }
    throw error;
  }
});

// Get proposals
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = validateAuthUser(req.userId);
    const { category, status } = req.query;

    console.log('🗳️ Fetching proposals for user:', userId);

    let query = db
      .selectFrom('proposals')
      .innerJoin('users', 'users.id', 'proposals.created_by')
      .leftJoin('votes', join =>
        join.onRef('votes.proposal_id', '=', 'proposals.id').on('votes.user_id', '=', userId)
      )
      .select([
        'proposals.id',
        'proposals.title',
        'proposals.description',
        'proposals.category',
        'proposals.deadline',
        'proposals.status',
        'proposals.votes_for',
        'proposals.votes_against',
        'proposals.created_at',
        'proposals.created_by',
        'users.username as creator_username',
        'votes.vote_type as user_vote',
      ]);

    if (category && category !== 'all') {
      query = query.where('proposals.category', '=', category as string);
    }
    if (status && status !== 'all') {
      query = query.where('proposals.status', '=', status as string);
    }

    const proposals = await query.execute();

    console.log('✅ Fetched proposals:', proposals.length);
    sendSuccess(res, proposals);
  } catch (error) {
    console.error('❌ Proposals fetch error:', error);
    if (error.message === ErrorMessages.INVALID_TOKEN) {
      return sendError(res, ErrorMessages.INVALID_TOKEN, StatusCodes.UNAUTHORIZED);
    }
    throw error;
  }
});

// Vote on proposal
router.post(
  '/:id/vote',
  votingLimiter,
  authenticateToken,
  validateVote,
  async (req: AuthRequest, res) => {
    try {
      const proposalId = validateNumericId(req.params.id, 'proposal ID');
      const { vote_type } = req.body;
      const userId = validateAuthUser(req.userId);

      console.log('🗳️ Voting on proposal:', {
        proposalId,
        voteType: vote_type,
        userId,
      });

      // Check if proposal exists and is active
      const proposal = await db
        .selectFrom('proposals')
        .selectAll()
        .where('id', '=', proposalId)
        .executeTakeFirst();

      if (!proposal) {
        return sendError(res, 'Proposal not found', StatusCodes.NOT_FOUND);
      }

      if (proposal.status !== 'active' || new Date(proposal.deadline) < new Date()) {
        return sendError(res, 'Voting period has ended', StatusCodes.BAD_REQUEST);
      }

      // Prevent users from voting on their own proposals
      if (proposal.created_by === userId) {
        return sendError(res, 'You cannot vote on your own proposal', StatusCodes.BAD_REQUEST);
      }

      // Check if user already voted
      const existingVote = await db
        .selectFrom('votes')
        .selectAll()
        .where('proposal_id', '=', proposalId)
        .where('user_id', '=', userId)
        .executeTakeFirst();

      if (existingVote) {
        return sendError(res, 'You have already voted on this proposal', StatusCodes.BAD_REQUEST);
      }

      // Insert vote
      await db
        .insertInto('votes')
        .values({
          proposal_id: proposalId,
          user_id: userId,
          vote_type,
        })
        .execute();

      // Update proposal vote counts
      if (vote_type === 'for') {
        await db
          .updateTable('proposals')
          .set({ votes_for: proposal.votes_for + 1 })
          .where('id', '=', proposalId)
          .execute();
      } else {
        await db
          .updateTable('proposals')
          .set({ votes_against: proposal.votes_against + 1 })
          .where('id', '=', proposalId)
          .execute();
      }

      console.log('✅ Vote recorded successfully');
      sendSuccess(res, { message: 'Vote recorded successfully' });
    } catch (error) {
      console.error('❌ Voting error:', error);
      if (error.message === ErrorMessages.INVALID_TOKEN) {
        return sendError(res, ErrorMessages.INVALID_TOKEN, StatusCodes.UNAUTHORIZED);
      }
      if (error.message.includes('Invalid')) {
        return sendError(res, error.message, StatusCodes.BAD_REQUEST);
      }
      throw error;
    }
  }
);

export default router;
