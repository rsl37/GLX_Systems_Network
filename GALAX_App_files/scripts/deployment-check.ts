#!/usr/bin/env tsx

/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

/**
 * Deployment Check Script
 * 
 * This script validates the environment configuration and generates
 * a deployment checklist specifically for fixing Vercel authentication issues.
 */

import dotenv from 'dotenv';
import { performDeploymentReadinessCheck } from '../server/deployment-validation.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

/**
 * Get emoji for overall status
 */
function getStatusEmoji(status: string) {
  switch (status) {
    case 'ready': return '✅';
    case 'warning': return '⚠️';
    case 'not_ready': return '❌';
    default: return '❓';
  }
}

async function runDeploymentCheck() {
  console.log('🔍 GALAX Civic Networking App - Deployment Check');
  console.log('='.repeat(60));
  console.log('');

  try {
    const report = await performDeploymentReadinessCheck();
    
    // Print summary in expected format
    console.log(`\n📊 DEPLOYMENT READINESS SUMMARY`);
    console.log(`==============================`);
    console.log(`Overall Status: ${getStatusEmoji(report.overall_status)} ${report.overall_status.toUpperCase()}`);
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