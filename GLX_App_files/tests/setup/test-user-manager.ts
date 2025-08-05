/*
 * Copyright © 2025 GLX Civic Networking.
 * Licensed under the PolyForm Shield License 1.0.0.
 * "GLX" and related concepts are inspired by Gatchaman Crowds © Tatsunoko Production.
 * This project is unaffiliated with Tatsunoko Production or the original anime.
 */


/*
 * Test User Management for CI/CD Authentication Testing
 *
 * This utility provides automated test user creation and cleanup
 * for authentication testing in CI/CD pipelines.
 */

import { randomBytes } from 'crypto';

export interface TestUser {
  id: string;
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  walletAddress?: string;
  created_at: string;
  session_id: string;
}

export class TestUserManager {
  private testUsers: Map<string, TestUser> = new Map();
  private sessionId: string;

  constructor() {
    // Create unique session ID for this test run
    this.sessionId = `test_${Date.now()}_${randomBytes(4).toString('hex')}`;
  }

  /**
   * Create a unique test user for the current session
   */
  createTestUser(overrides: Partial<TestUser> = {}): TestUser {
    const uniqueId = randomBytes(4).toString('hex');
    const baseEmail = process.env.TEST_EMAIL_BASE || 'test';
    const baseDomain = process.env.TEST_EMAIL_DOMAIN || 'example.com';

    const testUser: TestUser = {
      id: `test_user_${uniqueId}`,
      // Use email aliasing for unique test emails
      email: `${baseEmail}+${this.sessionId}_${uniqueId}@${baseDomain}`,
      username: `testuser_${uniqueId}`,
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: `User${uniqueId}`,
      phone: `+1555000${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      walletAddress: `0x${randomBytes(20).toString('hex')}`,
      created_at: new Date().toISOString(),
      session_id: this.sessionId,
      ...overrides
    };

    this.testUsers.set(testUser.id, testUser);
    return testUser;
  }

  /**
   * Create multiple test users
   */
  createTestUsers(count: number, overrides: Partial<TestUser> = {}): TestUser[] {
    const users: TestUser[] = [];
    for (let i = 0; i < count; i++) {
      users.push(this.createTestUser(overrides));
    }
    return users;
  }

  /**
   * Get a test user by ID
   */
  getTestUser(id: string): TestUser | undefined {
    return this.testUsers.get(id);
  }

  /**
   * Get all test users for this session
   */
  getAllTestUsers(): TestUser[] {
    return Array.from(this.testUsers.values());
  }

  /**
   * Create test users with specific scenarios
   */
  createScenarioUsers() {
    return {
      // Regular user
      regularUser: this.createTestUser({
        firstName: 'Regular',
        lastName: 'User'
      }),

      // User with verified email
      verifiedUser: this.createTestUser({
        firstName: 'Verified',
        lastName: 'User'
      }),

      // User with phone number
      phoneUser: this.createTestUser({
        firstName: 'Phone',
        lastName: 'User',
        phone: '+15551234567'
      }),

      // User with wallet address only
      walletUser: this.createTestUser({
        firstName: 'Wallet',
        lastName: 'User',
        email: '', // No email for wallet-only user
        walletAddress: `0x${randomBytes(20).toString('hex')}`
      }),

      // Admin user
      adminUser: this.createTestUser({
        firstName: 'Admin',
        lastName: 'User',
        username: `admin_${randomBytes(4).toString('hex')}`
      }),

      // User for security testing
      securityUser: this.createTestUser({
        firstName: 'Security',
        lastName: 'Test',
        password: 'VerySecurePassword123!'
      })
    };
  }

  /**
   * Create test data for authentication flows
   */
  createAuthTestData() {
    const users = this.createScenarioUsers();

    return {
      users,

      // Valid registration data
      validRegistration: {
        email: users.regularUser.email,
        username: users.regularUser.username,
        password: users.regularUser.password,
        firstName: users.regularUser.firstName,
        lastName: users.regularUser.lastName
      },

      // Valid login data
      validLogin: {
        email: users.regularUser.email,
        password: users.regularUser.password
      },

      // Invalid login data for testing
      invalidLogin: [
        {
          email: users.regularUser.email,
          password: 'wrongpassword',
          expectedError: 'Invalid credentials'
        },
        {
          email: 'nonexistent@example.com',
          password: 'anypassword',
          expectedError: 'Invalid credentials'
        },
        {
          email: '',
          password: users.regularUser.password,
          expectedError: 'Email and password are required'
        }
      ],

      // Password reset test data
      passwordReset: {
        validEmail: users.regularUser.email,
        invalidEmail: 'nonexistent@example.com',
        newPassword: 'NewSecurePassword123!'
      },

      // Security test data
      securityTests: {
        weakPasswords: ['123', 'password', '12345678'],
        invalidEmails: ['invalid', 'test@', '@example.com', 'test@.com'],
        sqlInjection: ["'; DROP TABLE users; --", "' OR '1'='1"],
        xssAttempts: ['<script>alert("xss")</script>', '<img src="x" onerror="alert(1)">'],
        oversizedInputs: {
          longEmail: 'a'.repeat(300) + '@example.com',
          longUsername: 'u'.repeat(300),
          longName: 'n'.repeat(300)
        }
      }
    };
  }

  /**
   * Clean up test users (for use in CI/CD cleanup)
   */
  cleanup(): void {
    console.log(`Cleaning up ${this.testUsers.size} test users for session ${this.sessionId}`);
    this.testUsers.clear();
  }

  /**
   * Generate test environment configuration
   */
  getTestConfig() {
    return {
      sessionId: this.sessionId,
      testEmailDomain: process.env.TEST_EMAIL_DOMAIN || 'example.com',
      testEmailBase: process.env.TEST_EMAIL_BASE || 'test',
      userCount: this.testUsers.size,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Export test users for external tools
   */
  exportUsers(): string {
    const exportData = {
      sessionId: this.sessionId,
      users: this.getAllTestUsers(),
      config: this.getTestConfig()
    };
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import test users from external data
   */
  importUsers(data: string): void {
    try {
      const importData = JSON.parse(data);
      if (importData.users && Array.isArray(importData.users)) {
        this.testUsers.clear();
        importData.users.forEach((user: TestUser) => {
          this.testUsers.set(user.id, user);
        });
        this.sessionId = importData.sessionId || this.sessionId;
      }
    } catch (error) {
      console.error('Failed to import test users:', error);
    }
  }
}

// Global instance for test runs
export const testUserManager = new TestUserManager();

// Helper functions for common test scenarios
export function createTestUserForRegistration(): TestUser {
  return testUserManager.createTestUser();
}

export function createTestUserForLogin(): TestUser {
  return testUserManager.createTestUser();
}

export function createTestUserForSecurity(): TestUser {
  return testUserManager.createTestUser({
    password: 'VerySecureTestPassword123!',
    firstName: 'Security',
    lastName: 'Test'
  });
}

export function getAuthTestData() {
  return testUserManager.createAuthTestData();
}

export function cleanupTestUsers(): void {
  testUserManager.cleanup();
}

// Environment-specific configuration
export const testConfig = {
  // Test database settings
  testDatabase: process.env.TEST_DATABASE_URL || 'sqlite::memory:',

  // API endpoints for testing
  apiBaseUrl: process.env.TEST_API_URL || 'http://localhost:3001',

  // Test timeouts
  requestTimeout: parseInt(process.env.TEST_REQUEST_TIMEOUT || '5000'),

  // Rate limiting settings for testing
  rateLimitWindow: parseInt(process.env.TEST_RATE_LIMIT_WINDOW || '60000'),
  rateLimitMax: parseInt(process.env.TEST_RATE_LIMIT_MAX || '100'),

  // Security test settings
  maxPasswordAttempts: parseInt(process.env.TEST_MAX_PASSWORD_ATTEMPTS || '5'),
  accountLockoutDuration: parseInt(process.env.TEST_LOCKOUT_DURATION || '300000'), // 5 minutes

  // JWT settings for testing
  jwtSecret: process.env.TEST_JWT_SECRET || 'test-secret-key',
  jwtExpiry: process.env.TEST_JWT_EXPIRY || '1h',

  // Email testing settings
  testEmailProvider: process.env.TEST_EMAIL_PROVIDER || 'mock',
  testEmailApiKey: process.env.TEST_EMAIL_API_KEY || '',

  // Phone testing settings
  testPhoneProvider: process.env.TEST_PHONE_PROVIDER || 'mock',
  testPhoneApiKey: process.env.TEST_PHONE_API_KEY || '',

  // Cleanup settings
  cleanupAfterTests: process.env.TEST_CLEANUP === 'true',
  keepTestDataOnFailure: process.env.TEST_KEEP_DATA_ON_FAILURE === 'true'
};

export default testUserManager;