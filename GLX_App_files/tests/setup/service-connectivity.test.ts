/*
 * Copyright © 2025 GLX Civic Networking.
 * Licensed under the PolyForm Shield License 1.0.0.
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { testSMTPConfig, testTwilioConfig, testPusherConfig, testWeb3Config } from '../../scripts/test-service-connectivity.js';

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

  describe('Twilio Configuration', () => {
    test('should validate Twilio configuration', async () => {
      await expect(testTwilioConfig()).resolves.not.toThrow();
    });
  });

  describe('Pusher Configuration', () => {
    test('should validate Pusher configuration', async () => {
      await expect(testPusherConfig()).resolves.not.toThrow();
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

      // Check for real-time messaging
      expect(deps).toHaveProperty('pusher');

      // Check for post-quantum cryptography (Web3 related)
      expect(deps).toHaveProperty('@noble/post-quantum');
    });
  });
});