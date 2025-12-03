#!/usr/bin/env tsx
/**
 * GLX: Connect the World - Civic Networking Platform
 * 
 * Copyright (c) 2025 [Your Name/Company]
 * Licensed under PolyForm Shield License 1.0.0
 * 
 * ⚠️  TERMS:
 * - Commercial use strictly prohibited without written permission from copyright holder
 * - Forking/derivative works prohibited without written permission
 * - Violations subject to legal action and damages
 * 
 * See LICENSE file in repository root for full terms.
 * Contact: [your-email@example.com] for licensing inquiries
 */

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

// Simple health check function
async function healthCheck(url: string, maxAttempts = 30): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log(`✅ Health check passed: ${url}`);
        return true;
      }
    } catch (error) {
      // Ignore and retry
    }

    console.log(`⏳ Waiting for server... (${i + 1}/${maxAttempts})`);
    await setTimeout(2000);
  }

  console.log(`❌ Health check failed: ${url}`);
  return false;
}

// Start the application for testing
async function startAppForTesting() {
  console.log('🚀 Starting application for CI testing...');

  const appProcess = spawn('npm', ['start'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      NODE_ENV: 'test',
      PORT: '3001',
    },
  });

  // Set up output handling
  appProcess.stdout?.on('data', data => {
    const output = data.toString();
    if (output.includes('API Server with Socket.IO running')) {
      console.log('✅ Server startup detected');
    }
  });

  appProcess.stderr?.on('data', data => {
    console.error('Server error:', data.toString());
  });

  // Wait for server to start
  await setTimeout(10000);

  // Test health endpoints
  const healthOk = await healthCheck('http://localhost:3001/api/health');

  if (healthOk) {
    console.log('✅ Application health check passed');
  } else {
    console.log('❌ Application health check failed');
  }

  // Clean up
  appProcess.kill('SIGTERM');
  await setTimeout(2000);

  return healthOk;
}

// Only run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startAppForTesting()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

export { startAppForTesting, healthCheck };
