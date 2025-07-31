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
import { validateEnvironment, generateDeploymentChecklist } from '../server/envValidation.js';

// Load environment variables
dotenv.config();

console.log('🔍 GALAX Civic Networking App - Deployment Check');
console.log('='.repeat(60));
console.log('');

// Run environment validation
const validation = validateEnvironment();

console.log('');
console.log('📋 DEPLOYMENT CHECKLIST');
console.log('='.repeat(60));

// Generate and display checklist
const checklist = generateDeploymentChecklist(validation);
checklist.forEach(line => console.log(line));

console.log('');
console.log('🚀 QUICK FIX FOR "REQUEST FAILED" ERRORS');
console.log('='.repeat(60));
console.log('');
console.log('1. In Vercel Dashboard → Project Settings → Environment Variables:');
console.log('   ✅ Set CLIENT_ORIGIN to your exact Vercel app URL');
console.log('   ✅ Set JWT_SECRET to a secure random string (32+ chars)');
console.log('   ✅ Set NODE_ENV to "production"');
console.log('');
console.log('2. Common CLIENT_ORIGIN values:');
console.log('   • https://galax-civic-networking.vercel.app');
console.log('   • https://your-custom-domain.com');
console.log('');
console.log('3. After setting variables, REDEPLOY your application');
console.log('');

// Display current environment status
console.log('🔧 CURRENT ENVIRONMENT STATUS');
console.log('='.repeat(60));
console.log(`NODE_ENV: ${process.env.NODE_ENV || '[NOT SET]'}`);
console.log(`CLIENT_ORIGIN: ${process.env.CLIENT_ORIGIN || '[NOT SET - THIS CAUSES REQUEST FAILED ERRORS]'}`);
console.log(`JWT_SECRET: ${process.env.JWT_SECRET ? '[SET]' : '[NOT SET - THIS CAUSES REQUEST FAILED ERRORS]'}`);
console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? '[SET]' : '[NOT SET - Using SQLite fallback]'}`);
console.log('');

if (!validation.isValid) {
  console.log('❌ DEPLOYMENT BLOCKED - Fix the issues above before deploying');
  process.exit(1);
} else {
  console.log('✅ Environment validation passed - Ready for deployment');
  process.exit(0);
}