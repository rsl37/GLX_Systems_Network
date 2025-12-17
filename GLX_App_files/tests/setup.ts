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

/**
 * Vitest global setup file
 *
 * This file is executed before running tests and can be used to:
 * - Set up global test configuration
 * - Configure global mocks
 * - Set up test environment variables
 */

// Set default test environment variables if not already set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

// Set test timeout defaults
if (!process.env.TEST_TIMEOUT) {
  process.env.TEST_TIMEOUT = '30000';
}

// Export empty object for ES module compatibility
export {};
