/*
 * Copyright © 2025 GLX Civic Networking.
 * Licensed under the PolyForm Shield License 1.0.0.
 * "GLX" and related concepts are inspired by Gatchaman Crowds © Tatsunoko Production.
 * This project is unaffiliated with Tatsunoko Production or the original anime.
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { ResgridProvider } from '../../server/communications/resgrid.js';
import { SocketIOProvider } from '../../server/communications/socketio.js';
import { AblyProvider } from '../../server/communications/globalMessaging.js';
import { VonageProvider } from '../../server/communications/vonage.js';
import { CommunicationManager, loadConfigFromEnv } from '../../server/communications/index.js';

describe('Communication Providers Unit Tests', () => {
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

  describe('CommunicationManager', () => {
    let manager: CommunicationManager;

    beforeEach(() => {
      manager = new CommunicationManager();
    });

    test('should not be initialized by default', () => {
      expect(manager.isInitialized()).toBe(false);
    });

    test('should return null config before initialization', () => {
      expect(manager.getConfig()).toBeNull();
    });

    test('should return empty health status before initialization', () => {
      const statuses = manager.getHealthStatus();
      expect(Array.isArray(statuses)).toBe(true);
    });

    test('should load config from environment', () => {
      const config = loadConfigFromEnv();

      expect(config).toHaveProperty('defaultProvider');
      expect(config).toHaveProperty('escalation');
      expect(config.escalation).toHaveProperty('enableSMS');
      expect(config.escalation).toHaveProperty('enableVoice');
      expect(config.escalation).toHaveProperty('priorityThreshold');
    });

    test('should support event handlers', () => {
      const handler = vi.fn();
      manager.on('message:sent', handler);
      manager.off('message:sent', handler);
      // Should not throw
    });

    test('should return null providers when not initialized', () => {
      expect(manager.getRealtimeProvider()).toBeNull();
      expect(manager.getDispatchProvider()).toBeNull();
      expect(manager.getEscalationProvider()).toBeNull();
    });
  });
});

describe('Communication Types Validation', () => {
  test('should export all required types', async () => {
    const types = await import('../../server/communications/types.js');

    // Verify key types exist (by checking they don't throw)
    expect(types).toBeDefined();
  });
});
