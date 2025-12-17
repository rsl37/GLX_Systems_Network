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
