/**
 * GLX: Connect the World - Civic Networking Platform
 * 
 * Skill Matching API Routes
 * 
 * Copyright (c) 2025 [Your Name/Company]
 * Licensed under PolyForm Shield License 1.0.0
 * 
 * ⚠️  TERMS:
 * - Commercial use strictly prohibited without written permission from copyright holder
 * - Forking/derivative works prohibited without written permission
 * - Violations subject to legal action and damages
 * 
 * See LICENSE file in repository root for full terms.
 * Contact: [your-email@example.com] for licensing inquiries
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
import { apiLimiter } from '../middleware/rateLimiter.js';
import {
  findMatchingUsers,
  findMatchingHelpRequests,
  getSkillSuggestions,
  getSkillCategories,
  SKILL_CATEGORIES
} from '../skillMatching.js';
import { db } from '../database.js';

const router = Router();

/**
 * Maximum number of skills a user can have
 */
const MAX_USER_SKILLS = 50;

/**
 * GET /api/skills/categories
 * Get all skill categories
 */
router.get('/categories', (req, res) => {
  try {
    const categories = getSkillCategories();
    sendSuccess(res, {
      categories,
      total: categories.length
    });
  } catch (error) {
    console.error('❌ Error fetching skill categories:', error);
    sendError(res, 'Failed to fetch skill categories', StatusCodes.INTERNAL_ERROR);
  }
});

/**
 * GET /api/skills/suggestions
 * Get skill suggestions, optionally filtered by category
 */
router.get('/suggestions', (req, res) => {
  try {
    const { category } = req.query;
    const suggestions = getSkillSuggestions(category as string);
    
    sendSuccess(res, {
      category: category || 'all',
      skills: suggestions,
      total: suggestions.length
    });
  } catch (error) {
    console.error('❌ Error fetching skill suggestions:', error);
    sendError(res, 'Failed to fetch skill suggestions', StatusCodes.INTERNAL_ERROR);
  }
});

/**
 * GET /api/skills/all
 * Get all skills organized by category
 */
router.get('/all', (req, res) => {
  try {
    sendSuccess(res, {
      skillsByCategory: SKILL_CATEGORIES,
      totalCategories: Object.keys(SKILL_CATEGORIES).length,
      totalSkills: Object.values(SKILL_CATEGORIES).flat().length
    });
  } catch (error) {
    console.error('❌ Error fetching all skills:', error);
    sendError(res, 'Failed to fetch skills', StatusCodes.INTERNAL_ERROR);
  }
});

/**
 * POST /api/skills/match-users
 * Find users who match specified skills
 */
router.post('/match-users', authenticateToken, apiLimiter, async (req: AuthRequest, res) => {
  try {
    const userId = validateAuthUser(req.userId);
    const { skills, latitude, longitude, maxDistance, limit, minScore } = req.body;

    if (!skills || !Array.isArray(skills) || skills.length === 0) {
      return sendError(res, 'Skills array is required', StatusCodes.BAD_REQUEST);
    }

    console.log('🔍 Finding matching users for skills:', skills);

    const matches = await findMatchingUsers(skills, {
      excludeUserId: userId,
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
      maxDistance: maxDistance ? parseInt(maxDistance) : undefined,
      limit: limit ? parseInt(limit) : 20,
      minScore: minScore ? parseInt(minScore) : 10
    });

    console.log(`✅ Found ${matches.length} matching users`);

    sendSuccess(res, {
      matches,
      total: matches.length,
      searchCriteria: {
        skills,
        location: latitude && longitude ? { latitude, longitude } : null,
        maxDistance: maxDistance || 50,
        minScore: minScore || 10
      }
    });
  } catch (error) {
    console.error('❌ Error matching users:', error);
    if (error.message === ErrorMessages.INVALID_TOKEN) {
      return sendError(res, ErrorMessages.INVALID_TOKEN, StatusCodes.UNAUTHORIZED);
    }
    sendError(res, 'Failed to find matching users', StatusCodes.INTERNAL_ERROR);
  }
});

/**
 * GET /api/skills/match-requests
 * Find help requests that match the authenticated user's skills
 */
router.get('/match-requests', authenticateToken, apiLimiter, async (req: AuthRequest, res) => {
  try {
    const userId = validateAuthUser(req.userId);
    const { latitude, longitude, maxDistance, limit, minScore, status } = req.query;

    console.log('🔍 Finding matching help requests for user:', userId);

    const matches = await findMatchingHelpRequests(userId, {
      latitude: latitude ? parseFloat(latitude as string) : undefined,
      longitude: longitude ? parseFloat(longitude as string) : undefined,
      maxDistance: maxDistance ? parseInt(maxDistance as string) : undefined,
      limit: limit ? parseInt(limit as string) : 20,
      minScore: minScore ? parseInt(minScore as string) : 10,
      status: (status as string) || 'posted'
    });

    console.log(`✅ Found ${matches.length} matching help requests`);

    sendSuccess(res, {
      matches,
      total: matches.length,
      searchCriteria: {
        location: latitude && longitude ? { latitude, longitude } : null,
        maxDistance: maxDistance || 50,
        minScore: minScore || 10,
        status: status || 'posted'
      }
    });
  } catch (error) {
    console.error('❌ Error matching help requests:', error);
    if (error.message === ErrorMessages.INVALID_TOKEN) {
      return sendError(res, ErrorMessages.INVALID_TOKEN, StatusCodes.UNAUTHORIZED);
    }
    sendError(res, 'Failed to find matching help requests', StatusCodes.INTERNAL_ERROR);
  }
});

/**
 * POST /api/skills/match-for-request/:id
 * Find users who match the skills needed for a specific help request
 */
router.post('/match-for-request/:id', authenticateToken, apiLimiter, async (req: AuthRequest, res) => {
  try {
    const helpRequestId = validateNumericId(req.params.id, 'help request ID');
    const { limit, minScore } = req.body;

    console.log('🔍 Finding matching users for help request:', helpRequestId);

    // Get the help request
    const helpRequest = await db
      .selectFrom('help_requests')
      .select(['id', 'title', 'skills_needed', 'requester_id'])
      .where('id', '=', helpRequestId)
      .executeTakeFirst();

    if (!helpRequest) {
      return sendError(res, 'Help request not found', StatusCodes.NOT_FOUND);
    }

    // Parse skills needed
    let skillsNeeded: string[] = [];
    try {
      skillsNeeded = JSON.parse(helpRequest.skills_needed || '[]');
    } catch {
      skillsNeeded = [];
    }

    const matches = await findMatchingUsers(skillsNeeded, {
      excludeUserId: helpRequest.requester_id,
      limit: limit ? parseInt(limit) : 20,
      minScore: minScore ? parseInt(minScore) : 10
    });

    console.log(`✅ Found ${matches.length} matching users for request ${helpRequestId}`);

    sendSuccess(res, {
      helpRequestId,
      helpRequestTitle: helpRequest.title,
      skillsNeeded,
      matches,
      total: matches.length
    });
  } catch (error) {
    console.error('❌ Error matching users for request:', error);
    if (error.message === ErrorMessages.INVALID_TOKEN) {
      return sendError(res, ErrorMessages.INVALID_TOKEN, StatusCodes.UNAUTHORIZED);
    }
    if (error.message.includes('Invalid')) {
      return sendError(res, error.message, StatusCodes.BAD_REQUEST);
    }
    sendError(res, 'Failed to find matching users', StatusCodes.INTERNAL_ERROR);
  }
});

/**
 * PUT /api/skills/user
 * Update the authenticated user's skills
 */
router.put('/user', authenticateToken, apiLimiter, async (req: AuthRequest, res) => {
  try {
    const userId = validateAuthUser(req.userId);
    const { skills } = req.body;

    if (!Array.isArray(skills)) {
      return sendError(res, 'Skills must be an array', StatusCodes.BAD_REQUEST);
    }

    // Validate and normalize skills
    const normalizedSkills = skills
      .filter(s => typeof s === 'string')
      .map(s => s.toLowerCase().trim())
      .filter(Boolean)
      .slice(0, MAX_USER_SKILLS); // Limit to maximum allowed skills

    console.log('📝 Updating skills for user:', userId);

    await db
      .updateTable('users')
      .set({
        skills: JSON.stringify(normalizedSkills),
        updated_at: new Date().toISOString()
      })
      .where('id', '=', userId)
      .execute();

    console.log('✅ Skills updated successfully');

    sendSuccess(res, {
      message: 'Skills updated successfully',
      skills: normalizedSkills
    });
  } catch (error) {
    console.error('❌ Error updating skills:', error);
    if (error.message === ErrorMessages.INVALID_TOKEN) {
      return sendError(res, ErrorMessages.INVALID_TOKEN, StatusCodes.UNAUTHORIZED);
    }
    sendError(res, 'Failed to update skills', StatusCodes.INTERNAL_ERROR);
  }
});

/**
 * GET /api/skills/user
 * Get the authenticated user's skills
 */
router.get('/user', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = validateAuthUser(req.userId);

    const user = await db
      .selectFrom('users')
      .select('skills')
      .where('id', '=', userId)
      .executeTakeFirst();

    if (!user) {
      return sendError(res, ErrorMessages.USER_NOT_FOUND, StatusCodes.NOT_FOUND);
    }

    let skills: string[] = [];
    try {
      skills = JSON.parse(user.skills || '[]');
    } catch {
      skills = [];
    }

    sendSuccess(res, { skills });
  } catch (error) {
    console.error('❌ Error fetching user skills:', error);
    if (error.message === ErrorMessages.INVALID_TOKEN) {
      return sendError(res, ErrorMessages.INVALID_TOKEN, StatusCodes.UNAUTHORIZED);
    }
    sendError(res, 'Failed to fetch skills', StatusCodes.INTERNAL_ERROR);
  }
});

export default router;
