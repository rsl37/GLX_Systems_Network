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

import { test, expect } from '@playwright/test';

test.describe('GLX App Basic E2E Tests', () => {
  test('should load the main page', async ({ page }) => {
    await page.goto('/');

    // Check that the page loads and contains expected content
    await expect(page).toHaveTitle(/GLX|Mimo|Civic/i);

    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test('should handle navigation', async ({ page }) => {
    await page.goto('/');

    // Basic navigation test
    await page.waitForLoadState('networkidle');

    // Check if page responds to basic interactions
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
