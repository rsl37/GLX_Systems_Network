<<<<<<< HEAD
/*
 * Copyright (c) 2025 GLX Civic Networking App
 *
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

=======
>>>>>>> origin/copilot/fix-44b85367-7d0a-4ac9-b500-2003ed4cfaed
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
<<<<<<< HEAD
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/playwright-results.json' }],
  ],
=======
  reporter: 'list',
>>>>>>> origin/copilot/fix-44b85367-7d0a-4ac9-b500-2003ed4cfaed
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Use system chromium if available
        channel: process.env.CI ? 'chromium' : undefined,
      },
    },
  ],
<<<<<<< HEAD
<<<<<<< HEAD
  webServer: process.env.CI ? undefined : {
    command: 'npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
=======
  webServer: {
    command: 'npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
>>>>>>> origin/copilot/fix-44b85367-7d0a-4ac9-b500-2003ed4cfaed
  },
});
=======
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm start',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      },
});
>>>>>>> origin/copilot/fix-488
