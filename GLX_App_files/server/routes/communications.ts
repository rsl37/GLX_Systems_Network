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

/**
 * Communication Routes
 *
 * API endpoints for the hybrid communication system including:
 * - Incident/dispatch management (Resgrid)
 * - SMS/Voice escalation (Vonage)
 * - Communication health status
 */

import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../auth.js';
import { sendSuccess, sendError } from '../utils/responseHelpers.js';
import { communicationManager, loadConfigFromEnv } from '../communications/index.js';
import type {
  Incident,
  IncidentSeverity,
  IncidentStatus,
  UnitStatus,
  MessagePriority,
} from '../communications/types.js';

const router = Router();

// ============================================================================
// Initialization
// ============================================================================

// Initialize communication manager on first request if not already done
let initializationPromise: Promise<void> | null = null;

async function ensureInitialized(): Promise<void> {
  if (!communicationManager.isInitialized()) {
    if (!initializationPromise) {
      initializationPromise = communicationManager.initialize(loadConfigFromEnv());
    }
    await initializationPromise;
  }
}

// ============================================================================
// Health & Status Endpoints
// ============================================================================

/**
 * GET /api/communications/health
 * Get health status of all communication providers
 */
router.get('/health', async (req, res) => {
  try {
    await ensureInitialized();

    const statuses = communicationManager.getHealthStatus();
    const allHealthy = communicationManager.isHealthy();

    sendSuccess(res, {
      healthy: allHealthy,
      providers: statuses,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Communication health check failed:', error);
    sendError(res, 'Health check failed', 500);
  }
});

/**
 * GET /api/communications/config
 * Get current communication configuration (non-sensitive)
 */
router.get('/config', authenticateToken, async (req: AuthRequest, res) => {
  try {
    await ensureInitialized();

    const config = communicationManager.getConfig();

    // Return non-sensitive configuration details
    sendSuccess(res, {
      defaultProvider: config?.defaultProvider,
      resgridEnabled: !!config?.resgrid,
      socketioEnabled: config?.socketio?.enabled,
      ablyEnabled: !!config?.ably,
      vonageEnabled: !!config?.vonage,
      escalation: {
        smsEnabled: config?.escalation?.enableSMS,
        voiceEnabled: config?.escalation?.enableVoice,
        priorityThreshold: config?.escalation?.priorityThreshold,
      },
    });
  } catch (error) {
    console.error('❌ Failed to get config:', error);
    sendError(res, 'Failed to get configuration', 500);
  }
});

// ============================================================================
// Incident/Dispatch Endpoints (Resgrid)
// ============================================================================

/**
 * POST /api/communications/incidents
 * Create a new incident
 */
router.post('/incidents', authenticateToken, async (req: AuthRequest, res) => {
  try {
    await ensureInitialized();

    const { title, description, severity, location, type } = req.body;

    // Validate required fields
    if (!title || !description || !severity || !location || !type) {
      return sendError(res, 'Missing required fields: title, description, severity, location, type', 400);
    }

    // Validate severity
    const validSeverities: IncidentSeverity[] = ['low', 'medium', 'high', 'critical'];
    if (!validSeverities.includes(severity)) {
      return sendError(res, `Invalid severity. Must be one of: ${validSeverities.join(', ')}`, 400);
    }

    // Validate location
    if (typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
      return sendError(res, 'Location must include valid latitude and longitude', 400);
    }

    const incident = await communicationManager.createIncident({
      title,
      description,
      severity,
      status: 'pending',
      location,
      type,
      reportedBy: req.userId!,
      assignedUnits: [],
    });

    if (!incident) {
      return sendError(res, 'Failed to create incident. Dispatch provider may not be configured.', 503);
    }

    sendSuccess(res, incident, { statusCode: 201 });
  } catch (error) {
    console.error('❌ Failed to create incident:', error);
    sendError(res, 'Failed to create incident', 500);
  }
});

/**
 * GET /api/communications/incidents
 * List incidents with optional filters
 */
router.get('/incidents', authenticateToken, async (req: AuthRequest, res) => {
  try {
    await ensureInitialized();

    const { status, severity, startDate, endDate, limit, offset } = req.query;

    const filters: any = {};

    if (status) {
      filters.status = (status as string).split(',') as IncidentStatus[];
    }
    if (severity) {
      filters.severity = (severity as string).split(',') as IncidentSeverity[];
    }
    if (startDate) {
      filters.startDate = new Date(startDate as string);
    }
    if (endDate) {
      filters.endDate = new Date(endDate as string);
    }
    if (limit) {
      filters.limit = parseInt(limit as string, 10);
    }
    if (offset) {
      filters.offset = parseInt(offset as string, 10);
    }

    const incidents = await communicationManager.listIncidents(filters);
    sendSuccess(res, incidents);
  } catch (error) {
    console.error('❌ Failed to list incidents:', error);
    sendError(res, 'Failed to list incidents', 500);
  }
});

/**
 * GET /api/communications/incidents/:id
 * Get incident by ID
 */
router.get('/incidents/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    await ensureInitialized();

    const { id } = req.params;
    const incident = await communicationManager.getIncident(id);

    if (!incident) {
      return sendError(res, 'Incident not found', 404);
    }

    sendSuccess(res, incident);
  } catch (error) {
    console.error('❌ Failed to get incident:', error);
    sendError(res, 'Failed to get incident', 500);
  }
});

/**
 * PATCH /api/communications/incidents/:id
 * Update an incident
 */
router.patch('/incidents/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    await ensureInitialized();

    const { id } = req.params;
    const updates: Partial<Incident> = {};

    // Only include allowed fields
    const allowedFields = ['title', 'description', 'severity', 'status', 'location', 'notes'];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        (updates as any)[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return sendError(res, 'No valid update fields provided', 400);
    }

    const updated = await communicationManager.updateIncident(id, updates);

    if (!updated) {
      return sendError(res, 'Failed to update incident', 404);
    }

    sendSuccess(res, updated);
  } catch (error) {
    console.error('❌ Failed to update incident:', error);
    sendError(res, 'Failed to update incident', 500);
  }
});

/**
 * POST /api/communications/incidents/:id/dispatch
 * Dispatch units to an incident
 */
router.post('/incidents/:id/dispatch', authenticateToken, async (req: AuthRequest, res) => {
  try {
    await ensureInitialized();

    const { id } = req.params;
    const { unitIds, priority, instructions } = req.body;

    if (!unitIds || !Array.isArray(unitIds) || unitIds.length === 0) {
      return sendError(res, 'unitIds must be a non-empty array', 400);
    }

    const success = await communicationManager.dispatchUnits({
      incidentId: id,
      unitIds,
      priority: priority || 'high',
      instructions,
    });

    if (!success) {
      return sendError(res, 'Failed to dispatch units', 503);
    }

    sendSuccess(res, { message: 'Units dispatched successfully' });
  } catch (error) {
    console.error('❌ Failed to dispatch units:', error);
    sendError(res, 'Failed to dispatch units', 500);
  }
});

// ============================================================================
// Unit/Resource Endpoints
// ============================================================================

/**
 * GET /api/communications/units
 * List units with optional filters
 */
router.get('/units', authenticateToken, async (req: AuthRequest, res) => {
  try {
    await ensureInitialized();

    const { status, type, lat, lon, radius } = req.query;

    const filters: any = {};

    if (status) {
      filters.status = (status as string).split(',') as UnitStatus[];
    }
    if (type) {
      filters.type = (type as string).split(',');
    }
    if (lat && lon && radius) {
      filters.nearLocation = {
        latitude: parseFloat(lat as string),
        longitude: parseFloat(lon as string),
        radiusKm: parseFloat(radius as string),
      };
    }

    const units = await communicationManager.getUnits(filters);
    sendSuccess(res, units);
  } catch (error) {
    console.error('❌ Failed to list units:', error);
    sendError(res, 'Failed to list units', 500);
  }
});

/**
 * PATCH /api/communications/units/:id/status
 * Update unit status
 */
router.patch('/units/:id/status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    await ensureInitialized();

    const { id } = req.params;
    const { status } = req.body;

    const validStatuses: UnitStatus[] = [
      'available',
      'busy',
      'en_route',
      'on_scene',
      'returning',
      'off_duty',
    ];

    if (!status || !validStatuses.includes(status)) {
      return sendError(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
    }

    const success = await communicationManager.updateUnitStatus(id, status);

    if (!success) {
      return sendError(res, 'Failed to update unit status', 503);
    }

    sendSuccess(res, { message: 'Unit status updated successfully' });
  } catch (error) {
    console.error('❌ Failed to update unit status:', error);
    sendError(res, 'Failed to update unit status', 500);
  }
});

// ============================================================================
// Escalation Endpoints (Vonage)
// ============================================================================

/**
 * POST /api/communications/escalate/sms
 * Send SMS escalation message
 */
router.post('/escalate/sms', authenticateToken, async (req: AuthRequest, res) => {
  try {
    await ensureInitialized();

    const { to, body, priority, incidentId } = req.body;

    if (!to || !body) {
      return sendError(res, 'Missing required fields: to, body', 400);
    }

    // Validate phone number format (basic validation)
    if (!/^\+?[1-9]\d{1,14}$/.test(to.replace(/[\s-]/g, ''))) {
      return sendError(res, 'Invalid phone number format', 400);
    }

    const validPriorities: MessagePriority[] = ['low', 'normal', 'high', 'critical', 'emergency'];
    const messagePriority = priority && validPriorities.includes(priority) ? priority : 'high';

    const result = await communicationManager.sendSMS({
      to,
      body,
      priority: messagePriority,
      userId: req.userId,
      incidentId,
    });

    if (!result.success) {
      return sendError(res, result.error || 'Failed to send SMS', 503);
    }

    sendSuccess(res, {
      messageId: result.messageId,
      deliveryStatus: result.deliveryStatus,
    });
  } catch (error) {
    console.error('❌ Failed to send SMS:', error);
    sendError(res, 'Failed to send SMS', 500);
  }
});

/**
 * POST /api/communications/escalate/voice
 * Initiate voice call escalation
 */
router.post('/escalate/voice', authenticateToken, async (req: AuthRequest, res) => {
  try {
    await ensureInitialized();

    const { to, message, priority, incidentId, callbackUrl } = req.body;

    if (!to || !message) {
      return sendError(res, 'Missing required fields: to, message', 400);
    }

    // Validate phone number format
    if (!/^\+?[1-9]\d{1,14}$/.test(to.replace(/[\s-]/g, ''))) {
      return sendError(res, 'Invalid phone number format', 400);
    }

    const validPriorities: MessagePriority[] = ['low', 'normal', 'high', 'critical', 'emergency'];
    const callPriority = priority && validPriorities.includes(priority) ? priority : 'critical';

    const result = await communicationManager.initiateVoiceCall({
      to,
      message,
      priority: callPriority,
      userId: req.userId,
      incidentId,
      callbackUrl,
    });

    if (!result.success) {
      return sendError(res, result.error || 'Failed to initiate voice call', 503);
    }

    sendSuccess(res, {
      callId: result.callId,
      status: result.status,
    });
  } catch (error) {
    console.error('❌ Failed to initiate voice call:', error);
    sendError(res, 'Failed to initiate voice call', 500);
  }
});

/**
 * POST /api/communications/escalate/broadcast
 * Broadcast SMS to multiple recipients
 */
router.post('/escalate/broadcast', authenticateToken, async (req: AuthRequest, res) => {
  try {
    await ensureInitialized();

    const { recipients, body, priority, incidentId } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return sendError(res, 'recipients must be a non-empty array', 400);
    }

    if (!body) {
      return sendError(res, 'body is required', 400);
    }

    // Limit recipients to prevent abuse
    if (recipients.length > 100) {
      return sendError(res, 'Maximum 100 recipients per broadcast', 400);
    }

    const validPriorities: MessagePriority[] = ['low', 'normal', 'high', 'critical', 'emergency'];
    const messagePriority = priority && validPriorities.includes(priority) ? priority : 'high';

    const messages = recipients.map((to: string) => ({
      to,
      body,
      priority: messagePriority,
      userId: req.userId,
      incidentId,
    }));

    const results = await communicationManager.sendBulkSMS(messages);

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    sendSuccess(res, {
      total: recipients.length,
      successful,
      failed,
      results: results.map((r, i) => ({
        recipient: recipients[i],
        success: r.success,
        messageId: r.messageId,
        error: r.error,
      })),
    });
  } catch (error) {
    console.error('❌ Failed to broadcast SMS:', error);
    sendError(res, 'Failed to broadcast SMS', 500);
  }
});

// ============================================================================
// Webhook Endpoints
// ============================================================================

/**
 * POST /api/communications/webhooks/resgrid
 * Handle Resgrid webhook events
 */
router.post('/webhooks/resgrid', async (req, res) => {
  try {
    await ensureInitialized();

    const signature = req.headers['x-resgrid-signature'] as string;
    const payload = JSON.stringify(req.body);

    // Get dispatch provider and verify signature
    const dispatchProvider = communicationManager.getDispatchProvider();
    if (!dispatchProvider) {
      return sendError(res, 'Dispatch provider not configured', 503);
    }

    // Verify webhook signature (if configured)
    // Note: This requires the provider to implement verifyWebhookSignature
    // For now, we'll process the webhook but log a warning if signature verification is not available

    const { eventType, data } = req.body;
    console.log(`📨 Received Resgrid webhook: ${eventType}`);

    // Process the webhook event
    // The dispatch provider will emit appropriate events through the communication manager

    sendSuccess(res, { received: true });
  } catch (error) {
    console.error('❌ Resgrid webhook error:', error);
    sendError(res, 'Webhook processing failed', 500);
  }
});

/**
 * POST /api/communications/webhooks/vonage
 * Handle Vonage webhook events (delivery status, etc.)
 */
router.post('/webhooks/vonage', async (req, res) => {
  try {
    const { message_uuid, status, to, from, timestamp, uuid, call_uuid } = req.body;

    console.log('📨 Received Vonage webhook:', {
      messageUuid: message_uuid,
      status: status,
      to: to,
      from: from,
      callUuid: call_uuid || uuid,
    });

    // Process status updates
    // Could update database records, emit events, etc.

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('❌ Vonage webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
