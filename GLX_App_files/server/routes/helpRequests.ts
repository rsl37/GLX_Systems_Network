/*
 * Copyright (c) 2025 GALAX Civic Networking App
 *
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import { Router } from 'express';
import { AuthRequest, authenticateToken } from '../auth.js';
import { sendSuccess, sendError, validateAuthUser, validateNumericId, createPaginationMeta, StatusCodes, ErrorMessages } from '../utils/responseHelpers.js';
import { uploadLimiter } from '../middleware/rateLimiter.js';
import { validateHelpRequest, validateFileUpload } from '../middleware/validation.js';
import { fileUploadSecurity } from '../middleware/security.js';
import { db } from '../database.js';
import RealtimeManager from '../realtimeManager.js';

const router = Router();

// Create help request
export function createHelpRequestRoutes(upload: any, realtimeManager: RealtimeManager) {
  router.post(
    '/',
    authenticateToken,
    uploadLimiter,
    upload.single('media'),
    validateFileUpload,
    fileUploadSecurity,
    validateHelpRequest,
    async (req: AuthRequest, res) => {
      try {
        const userId = validateAuthUser(req.userId);

        const {
          title,
          description,
          category,
          urgency,
          latitude,
          longitude,
          skillsNeeded,
          isOfflineCreated,
        } = req.body;

        console.log('📝 Creating help request:', {
          title,
          category,
          urgency,
          hasMedia: !!req.file,
          userId,
        });

        let mediaUrl = null;
        let mediaType = 'none';

        if (req.file) {
          mediaUrl = `/uploads/${req.file.filename}`;
          mediaType = req.file.mimetype.startsWith('image/')
            ? 'image'
            : req.file.mimetype.startsWith('video/')
              ? 'video'
              : 'audio';
          console.log('📎 Media uploaded:', { mediaUrl, mediaType });
        }

        const helpRequest = await db
          .insertInto('help_requests')
          .values({
            requester_id: userId,
            title,
            description,
            category,
            urgency,
            latitude: latitude ? parseFloat(latitude) : null,
            longitude: longitude ? parseFloat(longitude) : null,
            skills_needed: JSON.stringify(skillsNeeded || []),
            media_url: mediaUrl,
            media_type: mediaType,
            is_offline_created: isOfflineCreated ? 1 : 0,
            status: 'posted',
          })
          .returning(['id', 'created_at'])
          .executeTakeFirst();

        if (!helpRequest) {
          console.log('❌ Help request creation failed');
          return sendError(res, 'Failed to create help request', StatusCodes.INTERNAL_ERROR);
        }

        // Broadcast new help request to all connected users
        realtimeManager.broadcast({
          type: 'new_help_request',
          data: {
            id: helpRequest.id,
            title,
            category,
            urgency,
            latitude: latitude ? parseFloat(latitude) : null,
            longitude: longitude ? parseFloat(longitude) : null,
            created_at: helpRequest.created_at,
          }
        });

        console.log('✅ Help request created:', helpRequest.id);
        sendSuccess(res, { id: helpRequest.id });
      } catch (error) {
        console.error('❌ Help request creation error:', error);
        if (error.message === ErrorMessages.INVALID_TOKEN) {
          return sendError(res, ErrorMessages.INVALID_TOKEN, StatusCodes.UNAUTHORIZED);
        }
        throw error;
      }
    }
  );

  // Get help requests with pagination
  router.get('/', authenticateToken, uploadLimiter, async (req: AuthRequest, res) => {
    try {
      const {
        status,
        category,
        urgency,
        limit = 50,
        offset = 0,
        page = 1,
        sortBy = 'created_at',
        sortOrder = 'desc',
        search,
      } = req.query;

      console.log('📋 Fetching help requests:', {
        status,
        category,
        urgency,
        limit,
        offset,
        page,
        sortBy,
        sortOrder,
        search,
      });

      const pageSize = Math.min(parseInt(limit as string), 100);
      const pageNumber = parseInt(page as string);
      const offsetNumber = parseInt(offset as string) || (pageNumber - 1) * pageSize;

      // Build base query
      let query = db
        .selectFrom('help_requests')
        .innerJoin('users', 'users.id', 'help_requests.requester_id')
        .leftJoin('users as helper', 'helper.id', 'help_requests.helper_id')
        .select([
          'help_requests.id',
          'help_requests.title',
          'help_requests.description',
          'help_requests.category',
          'help_requests.urgency',
          'help_requests.latitude',
          'help_requests.longitude',
          'help_requests.skills_needed',
          'help_requests.media_url',
          'help_requests.media_type',
          'help_requests.status',
          'help_requests.created_at',
          'help_requests.updated_at',
          'help_requests.rating',
          'users.username as requester_username',
          'users.avatar_url as requester_avatar',
          'users.reputation_score as requester_reputation',
          'helper.username as helper_username',
        ]);

      // Add filters
      if (status) {
        query = query.where('help_requests.status', '=', status as string);
      }
      if (category) {
        query = query.where('help_requests.category', '=', category as string);
      }
      if (urgency) {
        query = query.where('help_requests.urgency', '=', urgency as string);
      }
      if (search) {
        query = query.where((eb) =>
          eb.or([
            eb('help_requests.title', 'like', `%${search}%`),
            eb('help_requests.description', 'like', `%${search}%`),
            eb('users.username', 'like', `%${search}%`),
          ])
        );
      }

      // Get total count
      const countQuery = query
        .clearSelect()
        .select(db.fn.count('help_requests.id').as('total'));
      const totalResult = await countQuery.executeTakeFirst();
      const total = Number(totalResult?.total || 0);

      // Add sorting
      const validSortFields = ['created_at', 'updated_at', 'urgency', 'status', 'title'];
      const sortField = validSortFields.includes(sortBy as string) ? (sortBy as string) : 'created_at';
      const order = sortOrder === 'asc' ? 'asc' : 'desc';

      query = query.orderBy(`help_requests.${sortField}` as any, order);

      if (sortField !== 'created_at') {
        query = query.orderBy('help_requests.created_at', 'desc');
      }
      query = query.orderBy('help_requests.id', 'desc');

      // Apply pagination
      query = query.limit(pageSize).offset(offsetNumber);

      const helpRequests = await query.execute();

      const pagination = createPaginationMeta(pageNumber, pageSize, total, '/api/help-requests');

      console.log('✅ Fetched help requests:', {
        count: helpRequests.length,
        total,
        page: pageNumber,
        totalPages: pagination.total_pages,
      });

      sendSuccess(res, helpRequests, {
        pagination,
        meta: {
          filters_applied: {
            status: status || null,
            category: category || null,
            urgency: urgency || null,
            search: search || null,
          },
          sort: {
            field: sortField,
            order: order,
          },
          request_timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('❌ Help requests fetch error:', error);
      throw error;
    }
  });

  // Offer help on a request
  router.post('/:id/offer-help', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = validateAuthUser(req.userId);
      const helpRequestId = validateNumericId(req.params.id, 'help request ID');

      console.log('🤝 Offering help:', { helpRequestId, helperId: userId });

      // Check if request exists and is available
      const helpRequest = await db
        .selectFrom('help_requests')
        .selectAll()
        .where('id', '=', helpRequestId)
        .where('status', '=', 'posted')
        .executeTakeFirst();

      if (!helpRequest) {
        console.log('❌ Help request not found or already assigned');
        return sendError(res, 'Help request not found or already assigned', StatusCodes.NOT_FOUND);
      }

      // Prevent users from helping their own requests
      if (helpRequest.requester_id === userId) {
        return sendError(res, 'You cannot offer help on your own request', StatusCodes.BAD_REQUEST);
      }

      // Update help request with helper
      await db
        .updateTable('help_requests')
        .set({
          helper_id: userId,
          status: 'matched',
          updated_at: new Date().toISOString(),
        })
        .where('id', '=', helpRequestId)
        .execute();

      // Create chat room
      const chatRoom = await db
        .insertInto('chat_rooms')
        .values({
          help_request_id: helpRequestId,
          requester_id: helpRequest.requester_id,
          helper_id: userId,
        })
        .returning('id')
        .executeTakeFirst();

      // Notify requester
      await db
        .insertInto('notifications')
        .values({
          user_id: helpRequest.requester_id,
          type: 'help_matched',
          title: 'Helper Found!',
          message: `Someone offered to help with "${helpRequest.title}"`,
          data: JSON.stringify({ helpRequestId, chatRoomId: chatRoom?.id }),
        })
        .execute();

      // Broadcast status update
      realtimeManager.broadcastToRoom(`help_request_${helpRequestId}`, {
        type: 'status_update',
        data: {
          id: helpRequestId,
          status: 'matched',
          helper_id: userId,
        }
      });

      console.log('✅ Help offered successfully:', { helpRequestId, helperId: userId });
      sendSuccess(res, { chatRoomId: chatRoom?.id });
    } catch (error) {
      console.error('❌ Offer help error:', error);
      if (error.message === ErrorMessages.INVALID_TOKEN) {
        return sendError(res, ErrorMessages.INVALID_TOKEN, StatusCodes.UNAUTHORIZED);
      }
      if (error.message.includes('Invalid')) {
        return sendError(res, error.message, StatusCodes.BAD_REQUEST);
      }
      throw error;
    }
  });

  return router;
}

export default createHelpRequestRoutes;