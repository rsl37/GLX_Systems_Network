/*
 * Copyright (c) 2025 GLX Civic Networking App
 *
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { TestServer, mockDb } from '../setup/test-server.js';
import request from 'supertest';

describe('Beta User Management API', () => {
  let testServer: TestServer;

  beforeAll(async () => {
    testServer = new TestServer();
    testServer.setupBasicMiddleware();

    // Setup beta user management endpoints
    testServer.app.post('/api/beta/waitlist', (req, res) => {
      const { email, name } = req.body;

      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({
          success: false,
          error: { message: 'Valid email is required', statusCode: 400 },
        });
      }

      // Check if email is already on waitlist
      const existing = mockDb.findUser({ email });
      if (existing) {
        return res.status(409).json({
          success: false,
          error: { message: 'Email is already on the waitlist', statusCode: 409 },
        });
      }

      // Add to mock database (simulating waitlist)
      const user = mockDb.addUser({
        email: email.toLowerCase(),
        firstName: name || '',
        lastName: '',
        created_at: new Date().toISOString(),
        verified: false,
      });

      res.status(201).json({
        success: true,
        data: {
          message: 'Successfully joined the waitlist!',
          position: user.id,
        },
      });
    });

    testServer.app.post('/api/beta/invite/validate', (req, res) => {
      const { code } = req.body;

      if (!code || typeof code !== 'string') {
        return res.status(400).json({
          success: false,
          error: { message: 'Invite code is required', statusCode: 400 },
        });
      }

      // Mock valid codes (new format: XXX-XXXX-XXXX-XXXX)
      const validCodes = ['GLX-TEST-1234-ABCD', 'GLX-VALI-D001-EFGH'];

      if (validCodes.includes(code.toUpperCase())) {
        return res.json({
          success: true,
          data: {
            valid: true,
            code: code.toUpperCase(),
            usesRemaining: 3,
          },
        });
      }

      return res.status(404).json({
        success: false,
        error: { message: 'Invalid invite code', statusCode: 404 },
      });
    });

    await testServer.start();
  });

  beforeEach(() => {
    mockDb.clear();
  });

  afterAll(async () => {
    await testServer.stop();
  });

  describe('POST /api/beta/waitlist', () => {
    test('should add user to waitlist successfully', async () => {
      const response = await request(testServer.app)
        .post('/api/beta/waitlist')
        .send({ email: 'test@example.com', name: 'Test User' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('waitlist');
    });

    test('should reject invalid email', async () => {
      const response = await request(testServer.app)
        .post('/api/beta/waitlist')
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should reject duplicate email', async () => {
      // First signup
      await request(testServer.app)
        .post('/api/beta/waitlist')
        .send({ email: 'test@example.com' })
        .expect(201);

      // Second signup with same email
      const response = await request(testServer.app)
        .post('/api/beta/waitlist')
        .send({ email: 'test@example.com' })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('already');
    });
  });

  describe('POST /api/beta/invite/validate', () => {
    test('should validate a valid invite code', async () => {
      const response = await request(testServer.app)
        .post('/api/beta/invite/validate')
        .send({ code: 'GLX-TEST-1234-ABCD' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.valid).toBe(true);
      expect(response.body.data.usesRemaining).toBeGreaterThan(0);
    });

    test('should reject invalid invite code', async () => {
      const response = await request(testServer.app)
        .post('/api/beta/invite/validate')
        .send({ code: 'INVALID-CODE' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    test('should require invite code', async () => {
      const response = await request(testServer.app)
        .post('/api/beta/invite/validate')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
