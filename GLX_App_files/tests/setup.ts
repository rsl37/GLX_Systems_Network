/*
 * Copyright © 2025 GLX Civic Networking.
 * Licensed under the PolyForm Shield License 1.0.0.
 * "GLX" and related concepts are inspired by Gatchaman Crowds © Tatsunoko Production.
 * This project is unaffiliated with Tatsunoko Production or the original anime.
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
