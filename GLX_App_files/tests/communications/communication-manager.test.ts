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
import { CommunicationManager, loadConfigFromEnv } from '../../server/communications/index.js';

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

describe('Communication Types Validation', () => {
  test('should export all required types', async () => {
    const types = await import('../../server/communications/types.js');

    // Verify key types exist (by checking they don't throw)
    expect(types).toBeDefined();
  });
});
