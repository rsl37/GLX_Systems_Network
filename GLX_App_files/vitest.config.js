/*
 * Copyright (c) 2025 GLX Civic Networking App
 *
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
<<<<<<< HEAD
    environment: 'node',
    include: [
      'tests/**/*.{test,spec}.{js,ts}',
      'src/**/*.{test,spec}.{js,ts}',
      'server/**/*.{test,spec}.{js,ts}',
      'client/**/*.{test,spec}.{js,ts}',
    ],
    exclude: ['server/stablecoin/tests/**/*'],
    testTimeout: 30000,
    hookTimeout: 30000,
    setupFiles: ['./src/__tests__/setup.ts'],
    outputFile: {
      json: './test-results/results.json',
      junit: './test-results/junit.xml',
    },
    coverage: {
      enabled: true,
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
<<<<<<< HEAD
=======
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: [
      'src/**/*.{test,spec}.{js,ts}', 
      'server/**/*.{test,spec}.{js,ts}', 
      'client/**/*.{test,spec}.{js,ts}'
    ],
    coverage: {
      reporter: ['text', 'json', 'html'],
>>>>>>> origin/copilot/fix-44b85367-7d0a-4ac9-b500-2003ed4cfaed
      exclude: [
        'node_modules/',
        'src/__tests__/setup.ts',
        'dist/',
        'coverage/',
        '**/*.d.ts'
      ]
    }
  }
})
=======
      exclude: ['node_modules/', 'src/__tests__/setup.ts', 'dist/', 'coverage/', '**/*.d.ts'],
    },
  },
});
>>>>>>> origin/copilot/fix-488
