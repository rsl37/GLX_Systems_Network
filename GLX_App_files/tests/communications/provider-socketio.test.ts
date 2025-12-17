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
import { SocketIOProvider } from '../../server/communications/socketio.js';

describe('SocketIOProvider', () => {
  let provider: SocketIOProvider;

  beforeEach(() => {
    provider = new SocketIOProvider();
  });

  test('should have correct name', () => {
    expect(provider.name).toBe('socketio');
  });

  test('should not be connected before initialization', () => {
    expect(provider.isConnected()).toBe(false);
  });

  test('should initialize with config', () => {
    provider.initialize({
      enabled: true,
      path: '/socket.io',
      corsOrigins: ['http://localhost:3000'],
    });

    // Should not throw
    expect(provider.isConnected()).toBe(false);
  });

  test('should return health status', () => {
    const status = provider.getHealthStatus();

    expect(status.provider).toBe('socketio');
    expect(status.connected).toBe(false);
    expect(status.lastCheck).toBeInstanceOf(Date);
  });

  test('should manage subscriptions', async () => {
    const callback = vi.fn();
    await provider.subscribe('test-channel', callback);
    await provider.unsubscribe('test-channel');
    // Should not throw
  });

  test('should return 0 connected clients when not initialized', () => {
    expect(provider.getConnectedClientsCount()).toBe(0);
  });
});
