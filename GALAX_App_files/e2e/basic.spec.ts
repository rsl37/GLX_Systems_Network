/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import { test, expect } from '@playwright/test';

test.describe('GALAX App Basic E2E Tests', () => {
  test('should load the main page', async ({ page }) => {
    await page.goto('/');
    
    // Check that the page loads and contains expected content
    await expect(page).toHaveTitle(/GALAX|Mimo|Civic/i);
    
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