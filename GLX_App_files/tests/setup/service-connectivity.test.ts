/*
 * Copyright © 2025 GLX Civic Networking.
 * Licensed under the PolyForm Shield License 1.0.0.
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { testSMTPConfig, testVonageConfig, testAblyConfig, testSocketIoConfig, testWeb3Config } from '../../scripts/test-service-connectivity.js';

describe('Service Connectivity Tests', () => {
  beforeAll(() => {
    // Ensure test environment is loaded
    process.env.NODE_ENV = 'test';
  });

  describe('SMTP Configuration', () => {
    test('should validate SMTP configuration', async () => {
      // This test will pass or fail based on environment configuration
      // In a real test environment, this would be configured properly
      await expect(testSMTPConfig()).resolves.not.toThrow();
    });
  });

  describe('Vonage Configuration', () => {
    test('should validate Vonage configuration', async () => {
      // Vonage replaces Twilio for SMS/Voice services
      await expect(testVonageConfig()).resolves.not.toThrow();
    });
  });

  describe('Ably Configuration', () => {
    test('should validate Ably configuration', async () => {
      // Ably replaces Pusher for real-time messaging
      await expect(testAblyConfig()).resolves.not.toThrow();
    });
  });

  describe('Socket.io Configuration', () => {
    test('should validate Socket.io configuration', async () => {
      // Socket.io replaces Pusher for real-time messaging
      await expect(testSocketIoConfig()).resolves.not.toThrow();
    });
  });

  describe('Web3/MetaMask Configuration', () => {
    test('should validate Web3 configuration', async () => {
      await expect(testWeb3Config()).resolves.not.toThrow();
    });
  });

  describe('Service Dependencies', () => {
    test('should have required service dependencies in package.json', async () => {
      const packageJsonPath = new URL('../../package.json', import.meta.url);
      const packageJson = await import(packageJsonPath.href);
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      // Check for email service
      expect(deps).toHaveProperty('nodemailer');

      // Check for real-time messaging (Socket.io replaces Pusher)
      expect(deps).toHaveProperty('socket.io');

      // Check for post-quantum cryptography (Web3 related)
      expect(deps).toHaveProperty('@noble/post-quantum');
    });
  });
});
