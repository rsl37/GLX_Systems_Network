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

import { describe, test, expect, beforeEach } from 'vitest';
import { ResgridProvider } from '../../server/communications/resgrid.js';

describe('ResgridProvider', () => {
  let provider: ResgridProvider;

  beforeEach(() => {
    provider = new ResgridProvider();
  });

  test('should have correct name', () => {
    expect(provider.name).toBe('resgrid');
  });

  test('should not be connected before initialization', () => {
    expect(provider.isConnected()).toBe(false);
  });

  test('should throw when connecting without initialization', async () => {
    await expect(provider.connect()).rejects.toThrow('not initialized');
  });

  test('should initialize with config', () => {
    provider.initialize({
      apiKey: 'test-key',
      apiUrl: 'https://api.resgrid.com',
      departmentId: 'dept-123',
    });

    // Should not throw
    expect(provider.isConnected()).toBe(false); // Still not connected
  });

  test('should return health status', () => {
    const status = provider.getHealthStatus();

    expect(status.provider).toBe('resgrid');
    expect(status.connected).toBe(false);
    expect(status.lastCheck).toBeInstanceOf(Date);
  });

  test('should throw when creating incident without connection', async () => {
    await expect(
      provider.createIncident({
        title: 'Test',
        description: 'Test incident',
        severity: 'high',
        status: 'pending',
        location: { latitude: 0, longitude: 0 },
        type: 'test',
        reportedBy: 1,
        assignedUnits: [],
      })
    ).rejects.toThrow('not connected');
  });
});
