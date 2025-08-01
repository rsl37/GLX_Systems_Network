#!/usr/bin/env node
/*
 * Copyright © 2025 GALAX Civic Networking.
 * Licensed under the PolyForm Shield License 1.0.0.
 * "GALAX" and related concepts are inspired by Gatchaman Crowds © Tatsunoko Production.
 * This project is unaffiliated with Tatsunoko Production or the original anime.
 */

/**
 * GALAX Production Setup Script
 * Helps set up the application for production deployment
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { randomBytes } from 'crypto';
import { join } from 'path';

console.log('🚀 GALAX Production Setup Script');
console.log('================================\n');

// Generate secure random strings
function generateSecureKey(length = 32) {
  return randomBytes(length).toString('hex');
}

// Check if we're in the right directory
const packageJsonPath = join(process.cwd(), 'package.json');
if (!existsSync(packageJsonPath)) {
  console.error('❌ Error: package.json not found. Please run this script from the GALAX_App_files directory.');
  process.exit(1);
}

const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
if (packageJson.name !== 'galax-civic-platform') {
  console.error('❌ Error: This script must be run from the GALAX_App_files directory.');
  process.exit(1);
}

console.log('✅ Found GALAX project directory');

// Check if production env file exists
const prodEnvPath = join(process.cwd(), '.env.production');
const envPath = join(process.cwd(), '.env');

if (!existsSync(prodEnvPath)) {
  console.error('❌ Error: .env.production file not found in the current directory (' + process.cwd() + '). Please create it by copying .env.example to .env.production in this directory and updating the values for production. Refer to the documentation for more details.');
  process.exit(1);
}

console.log('✅ Found .env.production template');

// Read the production template
let envContent = readFileSync(prodEnvPath, 'utf8');

// Generate secure keys
console.log('🔑 Generating secure keys...');
const jwtSecret = generateSecureKey(32);
const jwtRefreshSecret = generateSecureKey(32);
const encryptionMasterKey = generateSecureKey(32);

console.log('✅ Generated JWT_SECRET (64 characters)');
console.log('✅ Generated JWT_REFRESH_SECRET (64 characters)');
console.log('✅ Generated ENCRYPTION_MASTER_KEY (64 characters)');

// Replace placeholders with secure values
envContent = envContent.replace(
  'CHANGE_THIS_TO_SECURE_64_CHARACTER_HEX_STRING_FOR_PRODUCTION_USE',
  jwtSecret
);
envContent = envContent.replace(
  'CHANGE_THIS_TO_SECURE_64_CHARACTER_REFRESH_TOKEN_SECRET',
  jwtRefreshSecret
);
envContent = envContent.replace(
  'CHANGE_THIS_TO_SECURE_64_CHARACTER_ENCRYPTION_MASTER_KEY',
  encryptionMasterKey
);

// Ask user if they want to overwrite existing .env
if (existsSync(envPath)) {
  console.log('\n⚠️  WARNING: .env file already exists.');
  console.log('This script will overwrite your current .env file with production settings.');
  console.log('Make sure to backup any custom settings you want to keep.\n');

  // In a real interactive script, you'd prompt the user here
  // For automation purposes, we'll create a backup
  const backupPath = join(process.cwd(), '.env.backup');
  try {
    const existingEnv = readFileSync(envPath, 'utf8');
    writeFileSync(backupPath, existingEnv);
    console.log(`📋 Backed up existing .env to ${backupPath}`);
  } catch (error) {
    console.log('⚠️  Could not create backup of existing .env file');
  }
}

// Write the production environment file
try {
  writeFileSync(envPath, envContent);
  console.log('✅ Created production .env file with secure keys');
} catch (error) {
  console.error('❌ Error writing .env file:', error.message);
  process.exit(1);
}

// Run deployment check
console.log('\n🔍 Running deployment readiness check...');

// Verify if the deployment:check:production script exists in package.json
if (!packageJson.scripts || !packageJson.scripts['deployment:check:production']) {
  console.error('❌ Error: The "deployment:check:production" script is missing in package.json.');
  console.error('Please add the script to your package.json and try again.');
  process.exit(1);
}

try {
  execSync('npm run deployment:check:production', { stdio: 'inherit' });
  console.log('\n✅ Production setup completed successfully!');
} catch (error) {
  console.error('\n❌ Error: Deployment readiness check failed.');
  console.error('Details:', error.message);
  console.error('Please review the output above and address any issues before proceeding.');
  process.exit(1);
}

console.log('\n📋 Next Steps:');
console.log('1. Review and update the .env file with your specific settings:');
console.log('   - Update SMTP settings for email functionality');
console.log('   - Update Twilio settings for SMS functionality');
console.log('   - Update domain URLs to match your deployment');
console.log('   - Configure DATABASE_URL for PostgreSQL (recommended)');
console.log('2. Test your production build: npm run build:production');
console.log('3. Deploy to your hosting platform');
console.log('4. Monitor your application logs after deployment');

console.log('\n🔐 Security Reminder:');
console.log('- Never commit the .env file to version control');
console.log('- Store secrets securely in your deployment environment');
console.log('- Regularly rotate your JWT and encryption keys');
console.log('- Monitor your application for security issues');

console.log('\n🎉 GALAX is ready for production deployment!');