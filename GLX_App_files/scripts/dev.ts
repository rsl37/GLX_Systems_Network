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

import { startServer } from '../server/index.js';
import { performStartupCheck } from '../server/startup-check.js';
import { createServer } from 'vite';

let viteServer;

async function startDev() {
  console.log('🚀 Starting development environment...');

  // Perform startup check
  const checkPassed = await performStartupCheck();
  if (!checkPassed) {
    console.error('❌ Startup check failed, exiting...');
    process.exit(1);
  }

  // Start the Express API server first
  console.log('🌐 Starting Express API server...');
  await startServer(3001);

  // Then start Vite in dev mode
  console.log('⚡ Starting Vite dev server...');
  try {
    viteServer = await createServer({
      configFile: './vite.config.js',
    });

    const x = await viteServer.listen();
    console.log(`✅ Vite dev server running on port ${viteServer.config.server.port}`);
    console.log(`🌍 Frontend: http://localhost:${viteServer.config.server.port}`);
    console.log(`🔧 API: http://localhost:3001/api`);
  } catch (error) {
    console.error('❌ Failed to start Vite dev server:', error);
    process.exit(1);
  }
}

// Handle nodemon restarts - only needed if we're running under nodemon
if (process.env.npm_lifecycle_event && process.env.npm_lifecycle_event.includes('watch')) {
  let isRestarting = false;

  process.once('SIGUSR2', async () => {
    if (isRestarting) return;
    isRestarting = true;

    console.log('🔄 Nodemon restart detected, closing Vite server...');
    if (viteServer) {
      try {
        await viteServer.close();
        console.log('✅ Vite server closed successfully');
      } catch (err) {
        console.error('❌ Error closing Vite server:', err);
      }
    }

    // Allow nodemon to restart the process
    process.kill(process.pid, 'SIGUSR2');
  });
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  if (viteServer) {
    await viteServer.close();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  if (viteServer) {
    await viteServer.close();
  }
  process.exit(0);
});

// Start the development environment
startDev().catch(error => {
  console.error('❌ Failed to start development environment:', error);
  process.exit(1);
});
