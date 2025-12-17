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

import { describe, test, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import communicationsRoutes from '../../server/routes/communications.js';
import { generateToken } from '../../server/auth.js';

describe('Hybrid Communication System Tests', () => {
  let app: express.Express;
  let authToken: string;

  beforeAll(async () => {
    // Create Express app
    app = express();
    app.use(express.json());

    // Generate a valid test token
    authToken = generateToken(1);

    // Mount communications routes
    app.use('/api/communications', communicationsRoutes);
  });

  describe('Health & Configuration', () => {
    test('should return health status', async () => {
      const response = await request(app).get('/api/communications/health').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('healthy');
      expect(response.body.data).toHaveProperty('providers');
      expect(response.body.data).toHaveProperty('timestamp');
    });

    test('should return configuration (authenticated)', async () => {
      const response = await request(app)
        .get('/api/communications/config')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('defaultProvider');
      expect(response.body.data).toHaveProperty('escalation');
    });

    test('should require auth for config endpoint', async () => {
      const response = await request(app).get('/api/communications/config').expect(401);

      // Auth middleware returns error without success field
      expect(response.status).toBe(401);
    });
  });

  describe('Incident Management', () => {
    test('should validate required fields for incident creation', async () => {
      const response = await request(app)
        .post('/api/communications/incidents')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Incident',
          // Missing required fields
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Missing required fields');
    });

    test('should validate severity values', async () => {
      const response = await request(app)
        .post('/api/communications/incidents')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Incident',
          description: 'Test description',
          severity: 'invalid-severity',
          location: { latitude: 40.7128, longitude: -74.006 },
          type: 'emergency',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid severity');
    });

    test('should validate location format', async () => {
      const response = await request(app)
        .post('/api/communications/incidents')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Incident',
          description: 'Test description',
          severity: 'high',
          location: { latitude: 'invalid', longitude: -74.006 },
          type: 'emergency',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Location must include valid');
    });

    test('should require auth for incident listing', async () => {
      const response = await request(app).get('/api/communications/incidents').expect(401);

      // Auth middleware returns 401
      expect(response.status).toBe(401);
    });

    test('should accept valid query parameters for incident listing', async () => {
      const response = await request(app)
        .get('/api/communications/incidents')
        .query({
          status: 'pending,dispatched',
          severity: 'high,critical',
          limit: 10,
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Unit Management', () => {
    test('should require auth for unit listing', async () => {
      const response = await request(app).get('/api/communications/units').expect(401);

      // Auth middleware returns 401
      expect(response.status).toBe(401);
    });

    test('should validate status values for unit update', async () => {
      const response = await request(app)
        .patch('/api/communications/units/123/status')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'invalid-status' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid status');
    });

    test('should accept valid status values', async () => {
      // This will fail because no dispatch provider, but validates input
      const response = await request(app)
        .patch('/api/communications/units/123/status')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'available' });

      // Either success or 503 (no provider) is acceptable
      expect([200, 503]).toContain(response.status);
    });
  });

  describe('SMS Escalation', () => {
    test('should validate required fields for SMS', async () => {
      const response = await request(app)
        .post('/api/communications/escalate/sms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          to: '+1234567890',
          // Missing body
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Missing required fields');
    });

    test('should validate phone number format', async () => {
      const response = await request(app)
        .post('/api/communications/escalate/sms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          to: 'invalid-phone',
          body: 'Test message',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid phone number');
    });

    test('should require auth for SMS sending', async () => {
      const response = await request(app)
        .post('/api/communications/escalate/sms')
        .send({
          to: '+1234567890',
          body: 'Test message',
        })
        .expect(401);

      // Auth middleware returns 401
      expect(response.status).toBe(401);
    });
  });

  describe('Voice Escalation', () => {
    test('should validate required fields for voice call', async () => {
      const response = await request(app)
        .post('/api/communications/escalate/voice')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          to: '+1234567890',
          // Missing message
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Missing required fields');
    });

    test('should validate phone number format for voice', async () => {
      const response = await request(app)
        .post('/api/communications/escalate/voice')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          to: 'not-a-phone',
          message: 'Test voice message',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid phone number');
    });
  });

  describe('Broadcast SMS', () => {
    test('should validate recipients array', async () => {
      const response = await request(app)
        .post('/api/communications/escalate/broadcast')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipients: 'not-an-array',
          body: 'Test broadcast',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('non-empty array');
    });

    test('should validate empty recipients array', async () => {
      const response = await request(app)
        .post('/api/communications/escalate/broadcast')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipients: [],
          body: 'Test broadcast',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('non-empty array');
    });

    test('should limit recipients to 100', async () => {
      const recipients = Array(101)
        .fill(null)
        .map((_, i) => `+1234567${i.toString().padStart(4, '0')}`);

      const response = await request(app)
        .post('/api/communications/escalate/broadcast')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipients,
          body: 'Test broadcast',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Maximum 100 recipients');
    });

    test('should require body for broadcast', async () => {
      const response = await request(app)
        .post('/api/communications/escalate/broadcast')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipients: ['+1234567890'],
          // Missing body
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('body is required');
    });
  });

  describe('Dispatch Endpoints', () => {
    test('should validate unitIds for dispatch', async () => {
      const response = await request(app)
        .post('/api/communications/incidents/123/dispatch')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing or invalid unitIds
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('unitIds must be a non-empty array');
    });

    test('should validate empty unitIds array', async () => {
      const response = await request(app)
        .post('/api/communications/incidents/123/dispatch')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          unitIds: [],
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('non-empty array');
    });
  });

  describe('Webhooks', () => {
    test('should accept Vonage webhook', async () => {
      const response = await request(app)
        .post('/api/communications/webhooks/vonage')
        .send({
          message_uuid: 'msg-123',
          status: 'delivered',
        });

      // Returns 200 with JSON response
      expect(response.status).toBe(200);
    });
  });
});
