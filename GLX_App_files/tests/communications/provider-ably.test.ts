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

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { AblyProvider } from '../../server/communications/globalMessaging.js';

describe('AblyProvider (Scaffold)', () => {
  let provider: AblyProvider;

  beforeEach(() => {
    provider = new AblyProvider();
  });

  test('should have correct name', () => {
    expect(provider.name).toBe('ably');
  });

  test('should not be connected before initialization', () => {
    expect(provider.isConnected()).toBe(false);
  });

  test('should initialize with config', () => {
    provider.initialize({
      apiKey: 'test-key',
      clientId: 'test-client',
    });

    // Should not throw
    expect(provider.isConnected()).toBe(false);
  });

  test('should connect in scaffold mode', async () => {
    provider.initialize({
      apiKey: 'test-key',
    });

    await provider.connect();

    expect(provider.isConnected()).toBe(true);
  });

  test('should return health status with scaffold mode', () => {
    const status = provider.getHealthStatus();

    expect(status.provider).toBe('ably');
    expect(status.details?.mode).toBe('scaffold');
  });

  test('should manage subscriptions in scaffold mode', async () => {
    provider.initialize({ apiKey: 'test-key' });
    await provider.connect();

    const callback = vi.fn();
    await provider.subscribe('test-channel', callback);

    // Publish should trigger local callback
    const testMessage = {
      id: 'msg-1',
      type: 'test',
      channel: 'test-channel',
      data: { test: true },
      timestamp: new Date(),
      priority: 'normal' as const,
    };

    await provider.publish('test-channel', testMessage);

    expect(callback).toHaveBeenCalledWith(testMessage);
  });
});
