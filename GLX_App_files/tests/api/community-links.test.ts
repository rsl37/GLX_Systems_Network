/*
 * Copyright (c) 2025 GLX Civic Networking App
 *
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { TestServer } from '../setup/test-server.js';
import request from 'supertest';

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
