/**
 * GLX: Connect the World - Civic Networking Platform
 * 
 * Copyright (c) 2025 rsl37
 * Licensed under PolyForm Shield License 1.0.0
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
 * Deployment Check Script
 *
 * This script validates the environment configuration and generates
 * a deployment checklist specifically for fixing Vercel authentication issues.
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables based on NODE_ENV BEFORE importing other modules
const nodeEnv = process.env.NODE_ENV || 'development';
const envFile = nodeEnv === 'test' ? '.env.test' : '.env';
dotenv.config({ path: join(__dirname, `../${envFile}`) });

// Now import the deployment validation module after env vars are loaded
import { performDeploymentReadinessCheck } from '../server/deployment-validation.js';

/**
 * Get emoji for overall status
 */
function getStatusEmoji(status: string) {
  switch (status) {
    case 'ready':
      return '✅';
    case 'warning':
      return '⚠️';
    case 'not_ready':
      return '❌';
    default:
      return '❓';
  }
}

async function runDeploymentCheck() {
  console.log('🔍 GLX Civic Networking App - Deployment Check');
  console.log('='.repeat(60));
  console.log('');

  try {
    const report = await performDeploymentReadinessCheck();

    // Print summary in expected format
    console.log(`\n📊 DEPLOYMENT READINESS SUMMARY`);
    console.log(`==============================`);
    console.log(
      `Overall Status: ${getStatusEmoji(report.overall_status)} ${report.overall_status.toUpperCase()}`
    );
    console.log(`Environment: ${report.environment}`);
    console.log(`Timestamp: ${report.timestamp}`);

    // Exit with appropriate code based on status
    if (report.overall_status === 'not_ready') {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Deployment readiness check failed:', error);
    process.exit(1);
  }
}

// Run the check
runDeploymentCheck();
