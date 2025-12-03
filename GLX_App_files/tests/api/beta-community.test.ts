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
      const { email, name, referralSource } = req.body;

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

      // Mock valid codes
      const validCodes = ['GLX-TEST1234', 'GLX-VALID001'];

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
        .send({ code: 'GLX-TEST1234' })
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

describe('Community Links API', () => {
  let testServer: TestServer;

  beforeAll(async () => {
    testServer = new TestServer();
    testServer.setupBasicMiddleware();

    // Mock community links data
    const communityLinks = [
      {
        id: 1,
        platform: 'discord',
        name: 'GLX Community Discord',
        url: 'https://discord.gg/glx-civic',
        description: 'Join our Discord server',
        isPrimary: true,
      },
      {
        id: 2,
        platform: 'telegram',
        name: 'GLX Telegram',
        url: 'https://t.me/glxcivic',
        description: 'Follow us on Telegram',
        isPrimary: true,
      },
      {
        id: 3,
        platform: 'github',
        name: 'GLX GitHub',
        url: 'https://github.com/rsl37/GLX_Civic_Networking_App',
        description: 'Contribute to our open-source platform',
        isPrimary: false,
      },
    ];

    testServer.app.get('/api/community/links', (req, res) => {
      res.json({
        success: true,
        data: { links: communityLinks },
      });
    });

    testServer.app.get('/api/community/links/primary', (req, res) => {
      const primaryLinks = communityLinks.filter(link => link.isPrimary);
      res.json({
        success: true,
        data: { links: primaryLinks },
      });
    });

    testServer.app.get('/api/community/links/:platform', (req, res) => {
      const { platform } = req.params;
      const link = communityLinks.find(l => l.platform === platform);

      if (!link) {
        return res.status(404).json({
          success: false,
          error: { message: 'Community link not found', statusCode: 404 },
        });
      }

      res.json({
        success: true,
        data: { link },
      });
    });

    await testServer.start();
  });

  afterAll(async () => {
    await testServer.stop();
  });

  describe('GET /api/community/links', () => {
    test('should return all community links', async () => {
      const response = await request(testServer.app)
        .get('/api/community/links')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.links)).toBe(true);
      expect(response.body.data.links.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/community/links/primary', () => {
    test('should return only primary community links', async () => {
      const response = await request(testServer.app)
        .get('/api/community/links/primary')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.links.every((link: any) => link.isPrimary)).toBe(true);
    });
  });

  describe('GET /api/community/links/:platform', () => {
    test('should return Discord link', async () => {
      const response = await request(testServer.app)
        .get('/api/community/links/discord')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.link.platform).toBe('discord');
      expect(response.body.data.link.url).toContain('discord');
    });

    test('should return 404 for non-existent platform', async () => {
      const response = await request(testServer.app)
        .get('/api/community/links/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});

describe('Stablecoin Mock Contract API', () => {
  let testServer: TestServer;

  beforeAll(async () => {
    testServer = new TestServer();
    testServer.setupBasicMiddleware();

    // Mock reserve data
    const mockReserveData = {
      totalReserve: 2500000,
      collateralRatio: 1.25,
      reserveAssets: [
        { symbol: 'USDC', name: 'USD Coin', balance: 1500000, valueUsd: 1500000, percentage: 60 },
        { symbol: 'DAI', name: 'Dai Stablecoin', balance: 500000, valueUsd: 500000, percentage: 20 },
      ],
      lastUpdated: new Date().toISOString(),
      blockNumber: 1000000,
    };

    testServer.app.get('/api/stablecoin/contract/reserve', (req, res) => {
      res.json({
        success: true,
        data: mockReserveData,
        network: 'testnet',
        contract: '0x1234567890abcdef',
      });
    });

    testServer.app.get('/api/stablecoin/contract/health', (req, res) => {
      res.json({
        success: true,
        data: {
          isHealthy: true,
          collateralizationStatus: 'healthy',
          metrics: {
            collateralRatio: 1.25,
            targetRatio: 1.2,
            deviation: 0.041,
            reserveValue: 2500000,
            supplyValue: 2000000,
          },
          recommendations: [],
        },
      });
    });

    await testServer.start();
  });

  afterAll(async () => {
    await testServer.stop();
  });

  describe('GET /api/stablecoin/contract/reserve', () => {
    test('should return reserve data from mock contract', async () => {
      const response = await request(testServer.app)
        .get('/api/stablecoin/contract/reserve')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalReserve).toBeGreaterThan(0);
      expect(response.body.data.collateralRatio).toBeGreaterThan(1);
      expect(Array.isArray(response.body.data.reserveAssets)).toBe(true);
      expect(response.body.network).toBe('testnet');
    });
  });

  describe('GET /api/stablecoin/contract/health', () => {
    test('should return reserve health metrics', async () => {
      const response = await request(testServer.app)
        .get('/api/stablecoin/contract/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isHealthy).toBeDefined();
      expect(response.body.data.collateralizationStatus).toBeDefined();
      expect(response.body.data.metrics).toBeDefined();
    });
  });
});
