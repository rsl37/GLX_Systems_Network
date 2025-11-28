#!/usr/bin/env node

/*
 * Copyright (c) 2025 GLX Civic Networking App
 *
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

/**
 * Environment Variables Test Script
 *
 * This script tests the environment variable configuration
 * for the GLX Civic Networking App
 */

import dotenv from 'dotenv';

// Load environment variables from .env file if it exists
dotenv.config();

console.log('🧪 Testing Environment Variables Configuration\n');

const requiredVars = ['NODE_ENV', 'PORT', 'JWT_SECRET'];

const essentialVars = [
  'ABLY_API_KEY', // Real-time features (Socket.io with Ably)
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM', // Email features
  'VONAGE_API_KEY',
  'VONAGE_API_SECRET',
  'VONAGE_PHONE_NUMBER', // SMS/Phone features
];

const recommendedVars = ['CLIENT_ORIGIN', 'DATABASE_URL', 'SOCKET_PATH'];

const optionalVars: string[] = [];

console.log('📋 Required Environment Variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '❌';
  const displayValue =
    varName === 'JWT_SECRET' ? (value ? '[HIDDEN]' : 'NOT SET') : value || 'NOT SET';
  console.log(`   ${status} ${varName}: ${displayValue}`);
});

console.log('\n📋 Essential Environment Variables (Required for Core Features):');
essentialVars.forEach(varName => {
  const value = process.env[varName];
  const placeholderValues = ['dev-', 'your-', 'example', 'localhost', 'test-'];
  const isPlaceholder = value && placeholderValues.some(placeholder => value.toLowerCase().includes(placeholder));

  let status = '❌';
  let displayValue = 'NOT SET';

  if (value) {
    if (isPlaceholder) {
      status = '⚠️';
      displayValue = '[PLACEHOLDER - NEEDS REAL VALUE]';
    } else {
      status = '✅';
      displayValue = varName.includes('SECRET') || varName.includes('TOKEN') || varName.includes('PASS')
        ? '[HIDDEN]'
        : value;
    }
  }

  console.log(`   ${status} ${varName}: ${displayValue}`);
});

console.log('\n📋 Recommended Environment Variables:');
recommendedVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '⚠️';
  const displayValue = value || 'NOT SET';
  console.log(`   ${status} ${varName}: ${displayValue}`);
});

console.log('\n📋 Optional Environment Variables:');
if (optionalVars.length === 0) {
  console.log('   ℹ️ No optional variables defined');
} else {
  optionalVars.forEach(varName => {
    const value = process.env[varName];
    const status = value ? '✅' : '➖';
    const displayValue = value || 'NOT SET';
    console.log(`   ${status} ${varName}: ${displayValue}`);
  });
}

// Test specific validations
console.log('\n🔍 Environment Variable Validations:');

// NODE_ENV validation
const nodeEnv = process.env.NODE_ENV;
if (nodeEnv && ['development', 'production', 'staging', 'test'].includes(nodeEnv)) {
  console.log(`   ✅ NODE_ENV: Valid value "${nodeEnv}"`);
} else {
  console.log(`   ❌ NODE_ENV: Invalid or missing (current: "${nodeEnv || 'NOT SET'}")`);
}

// JWT_SECRET validation - never log the actual secret
const jwtSecret = process.env.JWT_SECRET;
if (jwtSecret) {
  if (jwtSecret.length >= 32) {
    console.log(`   ✅ JWT_SECRET: Valid length (${jwtSecret.length} characters)`);
  } else {
    console.log(
      `   ❌ JWT_SECRET: Too short (${jwtSecret.length} characters, minimum 32 required)`
    );
  }
} else {
  console.log(`   ❌ JWT_SECRET: Not set`);
}

// CLIENT_ORIGIN validation
const clientOrigin = process.env.CLIENT_ORIGIN;
if (clientOrigin) {
  try {
    const url = new URL(clientOrigin);
    const isSecure =
      url.protocol === 'https:' || (nodeEnv !== 'production' && url.protocol === 'http:');
    if (isSecure) {
      console.log(`   ✅ CLIENT_ORIGIN: Valid URL with ${url.protocol} protocol`);
    } else {
      console.log(`   ⚠️ CLIENT_ORIGIN: Should use HTTPS in production (current: ${url.protocol})`);
    }
  } catch (error) {
    console.log(`   ❌ CLIENT_ORIGIN: Invalid URL format`);
  }
} else {
  console.log(`   ⚠️ CLIENT_ORIGIN: Not set`);
}

console.log('\n📋 Summary:');
const totalRequired = requiredVars.length;
const setRequired = requiredVars.filter(v => process.env[v]).length;
const totalEssential = essentialVars.length;
const setEssential = essentialVars.filter(v => process.env[v]).length;
const totalRecommended = recommendedVars.length;
const setRecommended = recommendedVars.filter(v => process.env[v]).length;

console.log(`   Required Variables: ${setRequired}/${totalRequired} set`);
console.log(`   Essential Variables: ${setEssential}/${totalEssential} set`);
console.log(`   Recommended Variables: ${setRecommended}/${totalRecommended} set`);

if (setRequired === totalRequired) {
  console.log('\n✅ All required environment variables are configured!');
} else {
  console.log('\n❌ Some required environment variables are missing.');
}

if (setEssential === totalEssential) {
  console.log('✅ All essential environment variables are configured!');
} else {
  console.log('\n❌ Some essential environment variables are missing.');
  console.log('⚠️  Missing essential variables will cause core features to fail:');
  console.log('   • ABLY_API_KEY: Real-time communication features (Socket.io with Ably)');
  console.log('   • SMTP_* variables: Email verification and password reset');
  console.log('   • VONAGE_* variables: Phone verification and SMS');
}

if (setRecommended === totalRecommended) {
  console.log('✅ All recommended environment variables are configured!');
} else {
  console.log(
    `⚠️ ${totalRecommended - setRecommended} recommended environment variables are missing.`
  );
}

console.log('\n💡 To configure missing variables:');
console.log('   1. Copy .env.example to .env');
console.log('   2. Edit .env with your values');
console.log('   3. Restart the application');
console.log('\n🔧 Essential services setup required:');
console.log('   • Ably: Create account at https://ably.com for real-time features');
console.log('   • SMTP: Configure email service (Gmail, Outlook, etc.) for email verification');
console.log('   • Vonage: Create account at https://vonage.com for phone verification');
