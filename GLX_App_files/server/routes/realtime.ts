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

import express from 'express';
import { authenticateToken, AuthRequest } from '../auth.js';
import RealtimeManager from '../realtimeManager.js';

function createRealtimeRoutes(realtimeManager: RealtimeManager) {
  const router = express.Router();

  // SSE endpoint for real-time updates
  router.get('/events', authenticateToken, (req: AuthRequest, res) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const connectionId = realtimeManager.createSSEConnection(userId, res);
      console.log(`📡 SSE connection created for user ${userId}: ${connectionId}`);
    } catch (error) {
      console.error('❌ Error creating SSE connection:', error);
      res.status(500).json({
        error: 'Failed to establish real-time connection',
        details:
          'Unable to connect to our real-time services. Please check your internet connection and try again.',
      });
    }
  });

  // Join help request room
  router.post('/join-room', authenticateToken, (req: AuthRequest, res) => {
    try {
      const { helpRequestId, connectionId } = req.body;

      if (!helpRequestId || typeof helpRequestId !== 'number') {
        return res.status(400).json({
          error: 'Invalid help request ID',
          details: 'Please provide a valid help request to join.',
        });
      }

      if (!connectionId || typeof connectionId !== 'string') {
        return res.status(400).json({
          error: 'Invalid connection ID',
          details: 'Connection not found. Please refresh the page and try again.',
        });
      }

      const roomId = `help_request_${helpRequestId}`;
      const success = realtimeManager.joinRoom(connectionId, roomId);

      if (success) {
        res.json({
          success: true,
          roomId,
          message: 'Successfully joined help request',
        });
      } else {
        res.status(404).json({
          error: 'Connection not found',
          details: 'Your connection expired. Please refresh the page and try again.',
        });
      }
    } catch (error) {
      console.error('❌ Error joining room:', error);
      res.status(500).json({
        error: 'Failed to join room',
        details: 'Unable to join the help request. Please try again in a moment.',
      });
    }
  });

  // Leave help request room
  router.post('/leave-room', authenticateToken, (req: AuthRequest, res) => {
    try {
      const { helpRequestId, connectionId } = req.body;

      if (!helpRequestId || typeof helpRequestId !== 'number') {
        return res.status(400).json({
          error: 'Invalid help request ID',
          details: 'Please provide a valid help request to leave.',
        });
      }

      if (!connectionId || typeof connectionId !== 'string') {
        return res.status(400).json({
          error: 'Invalid connection ID',
          details: 'Connection not found. Please refresh the page and try again.',
        });
      }

      const roomId = `help_request_${helpRequestId}`;
      const success = realtimeManager.leaveRoom(connectionId, roomId);

      if (success) {
        res.json({
          success: true,
          roomId,
          message: 'Successfully left help request',
        });
      } else {
        res.status(404).json({
          error: 'Connection not found',
          details: 'Your connection expired. No action needed.',
        });
      }
    } catch (error) {
      console.error('❌ Error leaving room:', error);
      res.status(500).json({
        error: 'Failed to leave room',
        details: 'Unable to leave the help request. This may resolve automatically.',
      });
    }
  });

  // Send message to help request
  router.post('/send-message', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({
          error: 'User not authenticated',
          details: 'Please log in to send messages.',
        });
      }

      const { helpRequestId, message } = req.body;

      if (!helpRequestId || typeof helpRequestId !== 'number') {
        return res.status(400).json({
          error: 'Invalid help request ID',
          details: 'Please select a valid help request to send a message.',
        });
      }

      if (!message || typeof message !== 'string') {
        return res.status(400).json({
          error: 'Invalid message',
          details: 'Please enter a message to send.',
        });
      }

      const result = await realtimeManager.handleMessageSend(userId, helpRequestId, message);

      if (result.success) {
        res.json({
          success: true,
          messageId: result.messageId,
          message: 'Message sent successfully',
        });
      } else {
        res.status(400).json({
          error: 'Failed to send message',
          details: result.error || 'Unable to send your message. Please try again.',
        });
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
      res.status(500).json({
        error: 'Failed to send message',
        details: 'Unable to send your message due to a server error. Please try again in a moment.',
      });
    }
  });

  // Health check endpoint
  router.get('/health', (req, res) => {
    try {
      const health = realtimeManager.getHealthStatus();
      res.json({
        status: 'healthy',
        ...health,
      });
    } catch (error) {
      console.error('❌ Error getting health status:', error);
      res.status(500).json({
        status: 'unhealthy',
        error: 'Health check failed',
      });
    }
  });

  return router;
}

export default createRealtimeRoutes;
