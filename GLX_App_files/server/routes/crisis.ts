/*
 * Copyright (c) 2025 GLX Civic Networking App
 *
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import { Router } from 'express';
import { AuthRequest, authenticateToken } from '../auth.js';
import { sendSuccess, sendError, validateAuthUser, StatusCodes, ErrorMessages } from '../utils/responseHelpers.js';
import { crisisLimiter } from '../middleware/rateLimiter.js';
import { validateCrisisAlert } from '../middleware/validation.js';
import { db } from '../database.js';

const router = Router();

// Create crisis alert
router.post('/', authenticateToken, crisisLimiter, validateCrisisAlert, async (req: AuthRequest, res) => {
  try {
    const userId = validateAuthUser(req.userId);
    const { title, description, severity, latitude, longitude, radius } = req.body;

    console.log('🚨 Creating crisis alert:', {
      title,
      severity,
      userId,
    });

    const alert = await db
      .insertInto('crisis_alerts')
      .values({
        title,
        description,
        severity,
        latitude,
        longitude,
        radius: radius || 1000,
        created_by: userId,
        status: 'active',
      })
      .returning('id')
      .executeTakeFirst();

    if (!alert) {
      console.log('❌ Crisis alert creation failed');
      return sendError(res, 'Failed to create crisis alert', StatusCodes.INTERNAL_ERROR);
    }

    console.log('✅ Crisis alert created:', alert.id);
    sendSuccess(res, { id: alert.id });
  } catch (error) {
    console.error('❌ Crisis alert creation error:', error);
    if (error.message === ErrorMessages.INVALID_TOKEN) {
      return sendError(res, ErrorMessages.INVALID_TOKEN, StatusCodes.UNAUTHORIZED);
    }
    throw error;
  }
});

// Get crisis alerts
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    console.log('🚨 Fetching crisis alerts for user:', req.userId);

    const alerts = await db
      .selectFrom('crisis_alerts')
      .innerJoin('users', 'users.id', 'crisis_alerts.created_by')
      .select([
        'crisis_alerts.id',
        'crisis_alerts.title',
        'crisis_alerts.description',
        'crisis_alerts.severity',
        'crisis_alerts.latitude',
        'crisis_alerts.longitude',
        'crisis_alerts.radius',
        'crisis_alerts.status',
        'crisis_alerts.created_at',
        'crisis_alerts.created_by',
        'users.username as creator_username',
      ])
      .where('crisis_alerts.status', '=', 'active')
      .execute();

    console.log('✅ Fetched crisis alerts:', alerts.length);
    sendSuccess(res, alerts);
  } catch (error) {
    console.error('❌ Crisis alerts fetch error:', error);
    throw error;
  }
});

export default router;