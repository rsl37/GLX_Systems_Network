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
import { VonageProvider } from '../../server/communications/vonage.js';

describe('VonageProvider', () => {
  let provider: VonageProvider;

  beforeEach(() => {
    provider = new VonageProvider();
  });

  test('should have correct name', () => {
    expect(provider.name).toBe('vonage');
  });

  test('should not be connected before initialization', () => {
    expect(provider.isConnected()).toBe(false);
  });

  test('should initialize with config', () => {
    provider.initialize({
      apiKey: 'test-key',
      apiSecret: 'test-secret',
      fromNumber: '+1234567890',
    });

    // Should not throw
    expect(provider.isConnected()).toBe(false);
  });

  test('should return health status', () => {
    provider.initialize({
      apiKey: 'test-key',
      apiSecret: 'test-secret',
      fromNumber: '+1234567890',
    });

    const status = provider.getHealthStatus();

    expect(status.provider).toBe('vonage');
    expect(status.connected).toBe(false);
    expect(status.details?.phoneNumber).toBe('+1234567890');
  });

  test('should throw when sending SMS without connection', async () => {
    await expect(
      provider.sendSMS({
        to: '+1234567890',
        body: 'Test',
        priority: 'high',
      })
    ).rejects.toThrow('not connected');
  });
});
