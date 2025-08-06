/*
 * Copyright © 2025 GALAX Civic Networking.
 * Licensed under the PolyForm Shield License 1.0.0.
 * "GALAX" and related concepts are inspired by Gatchaman Crowds © Tatsunoko Production.
 * This project is unaffiliated with Tatsunoko Production or the original anime.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { TestServer, mockDb } from '../setup/test-server.js';
import request from 'supertest';

describe('Registration Error Messages', () => {
  let testServer: TestServer;

  beforeAll(async () => {
    testServer = new TestServer();
    testServer.setupBasicMiddleware();

    // Setup registration endpoint that matches the actual implementation
    testServer.app.post('/api/auth/register', (req, res) => {
      const { email, phone, password, username, walletAddress } = req.body;

      // Validate required fields
      if (!username) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Username is required',
            statusCode: 400,
          },
        });
      }

      // Check for specific conflicts to test specific error messages
      if (email) {
        const existingEmailUser = mockDb.findUser({ email });
        if (existingEmailUser) {
          return res.status(400).json({
            success: false,
            error: {
              message: 'An account with this email address already exists',
              statusCode: 400,
            },
          });
        }
      }

      if (phone) {
        const existingPhoneUser = mockDb.findUser({ phone });
        if (existingPhoneUser) {
          return res.status(400).json({
            success: false,
            error: {
              message: 'An account with this phone number already exists',
              statusCode: 400,
            },
          });
        }
      }

      const existingUsernameUser = mockDb.findUser({ username });
      if (existingUsernameUser) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'This username is already taken',
            statusCode: 400,
          },
        });
      }

      if (walletAddress) {
        const existingWalletUser = mockDb.findUser({ walletAddress });
        if (existingWalletUser) {
          return res.status(400).json({
            success: false,
            error: {
              message: 'An account with this wallet address already exists',
              statusCode: 400,
            },
          });
        }
      }

      // Create user successfully
      const user = mockDb.addUser({
        email: email || null,
        phone: phone || null,
        username,
        walletAddress: walletAddress || null,
        created_at: new Date().toISOString(),
        verified: false,
      });

      res.status(201).json({
        success: true,
        data: {
          token: 'mock-jwt-token',
          userId: user.id,
          emailVerificationRequired: !!email,
          phoneVerificationRequired: !!phone,
        },
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

  describe('Specific Error Messages for Registration Conflicts', () => {
    test('should return specific error for existing email', async () => {
      // First, create a user with an email
      await request(testServer.app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
          username: 'testuser1',
        })
        .expect(201);

      // Try to register with the same email but different username
      const response = await request(testServer.app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
          username: 'testuser2',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'An account with this email address already exists',
          statusCode: 400,
        },
      });
    });

    test('should return specific error for existing phone', async () => {
      // First, create a user with a phone
      await request(testServer.app)
        .post('/api/auth/register')
        .send({
          phone: '+1234567890',
          password: 'SecurePass123!',
          username: 'testuser1',
        })
        .expect(201);

      // Try to register with the same phone but different username
      const response = await request(testServer.app)
        .post('/api/auth/register')
        .send({
          phone: '+1234567890',
          password: 'SecurePass123!',
          username: 'testuser2',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'An account with this phone number already exists',
          statusCode: 400,
        },
      });
    });

    test('should return specific error for existing username', async () => {
      // First, create a user with a username
      await request(testServer.app)
        .post('/api/auth/register')
        .send({
          email: 'test1@example.com',
          password: 'SecurePass123!',
          username: 'testuser',
        })
        .expect(201);

      // Try to register with the same username but different email
      const response = await request(testServer.app)
        .post('/api/auth/register')
        .send({
          email: 'test2@example.com',
          password: 'SecurePass123!',
          username: 'testuser',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'This username is already taken',
          statusCode: 400,
        },
      });
    });

    test('should return specific error for existing wallet address', async () => {
      // First, create a user with a wallet address
      await request(testServer.app)
        .post('/api/auth/register')
        .send({
          walletAddress: '0x1234567890abcdef',
          username: 'testuser1',
        })
        .expect(201);

      // Try to register with the same wallet address but different username
      const response = await request(testServer.app)
        .post('/api/auth/register')
        .send({
          walletAddress: '0x1234567890abcdef',
          username: 'testuser2',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'An account with this wallet address already exists',
          statusCode: 400,
        },
      });
    });

    test('should successfully register with valid unique data', async () => {
      const response = await request(testServer.app)
        .post('/api/auth/register')
        .send({
          email: 'new@example.com',
          password: 'SecurePass123!',
          username: 'newuser',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          token: expect.any(String),
          userId: expect.any(Number),
          emailVerificationRequired: true,
          phoneVerificationRequired: false,
        },
      });
    });

    test('should prioritize email conflict over username conflict', async () => {
      // Create a user with email and username
      await request(testServer.app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          username: 'testuser',
          password: 'SecurePass123!',
        })
        .expect(201);

      // Try to register with both the same email and username - should report email conflict first
      const response = await request(testServer.app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          username: 'testuser',
          password: 'SecurePass123!',
        })
        .expect(400);

      expect(response.body.error.message).toBe('An account with this email address already exists');
    });
  });
});
