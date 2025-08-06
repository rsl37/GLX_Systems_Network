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
<<<<<<< HEAD
  "PUSHER_APP_ID", "PUSHER_KEY", "PUSHER_SECRET", "PUSHER_CLUSTER",  // Real-time features
<<<<<<< HEAD
<<<<<<< HEAD
  "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM",    // Email features
=======
  "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM",    // Email features  
>>>>>>> origin/copilot/fix-190
=======
  "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM",    // Email features
>>>>>>> origin/copilot/fix-470
  "TWILIO_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER"            // SMS/Phone features
=======
  'PUSHER_APP_ID',
  'PUSHER_KEY',
  'PUSHER_SECRET',
  'PUSHER_CLUSTER', // Real-time features
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM', // Email features
  'TWILIO_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER', // SMS/Phone features
>>>>>>> origin/copilot/fix-488
];

const recommendedVars = ['CLIENT_ORIGIN', 'DATABASE_URL', 'SOCKET_PATH'];

const optionalVars = [];

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
<<<<<<< HEAD
  const isPlaceholder = value && placeholderValues.some(placeholder => value.toLowerCase().includes(placeholder));
<<<<<<< HEAD
<<<<<<< HEAD
=======
  const isPlaceholder =
    value && placeholderValues.some(placeholder => value.toLowerCase().includes(placeholder));
>>>>>>> origin/copilot/fix-488

  let status = '❌';
  let displayValue = 'NOT SET';

=======
  
  let status = "❌";
  let displayValue = "NOT SET";
  
>>>>>>> origin/copilot/fix-190
=======

  let status = "❌";
  let displayValue = "NOT SET";

>>>>>>> origin/copilot/fix-470
  if (value) {
    if (isPlaceholder) {
      status = '⚠️';
      displayValue = '[PLACEHOLDER - NEEDS REAL VALUE]';
    } else {
<<<<<<< HEAD
      status = "✅";
<<<<<<< HEAD
<<<<<<< HEAD
      displayValue = varName.includes("SECRET") || varName.includes("TOKEN") || varName.includes("PASS")
        ? "[HIDDEN]"
        : value;
=======
      status = '✅';
      displayValue =
        varName.includes('SECRET') || varName.includes('TOKEN') || varName.includes('PASS')
          ? '[HIDDEN]'
          : value;
>>>>>>> origin/copilot/fix-488
    }
  }

=======
      displayValue = varName.includes("SECRET") || varName.includes("TOKEN") || varName.includes("PASS") 
        ? "[HIDDEN]" 
        : value;
    }
  }
  
>>>>>>> origin/copilot/fix-190
=======
      displayValue = varName.includes("SECRET") || varName.includes("TOKEN") || varName.includes("PASS")
        ? "[HIDDEN]"
        : value;
    }
  }

>>>>>>> origin/copilot/fix-470
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
  console.log(`   ⚠️ CLIENT_ORIGIN: Not set (CORS may use fallback origins)`);
}

// DATABASE_URL validation
const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl) {
  try {
    const url = new URL(databaseUrl);
    if (url.protocol === 'postgres:' || url.protocol === 'postgresql:') {
      console.log(`   ✅ DATABASE_URL: Valid PostgreSQL URL`);
    } else {
      console.log(
        `   ⚠️ DATABASE_URL: Unexpected protocol ${url.protocol} (expected postgres: or postgresql:)`
      );
    }
  } catch (error) {
    console.log(`   ❌ DATABASE_URL: Invalid URL format`);
  }
} else {
  console.log(`   ➖ DATABASE_URL: Not set (will use SQLite fallback)`);
}

// REALTIME_PATH validation
const realtimePath = process.env.REALTIME_PATH;
if (realtimePath) {
  if (realtimePath.startsWith('/') && realtimePath.length > 1) {
    console.log(`   ✅ REALTIME_PATH: Valid path "${realtimePath}"`);
  } else {
    console.log(
      `   ⚠️ REALTIME_PATH: Should start with / and have additional components (current: "${realtimePath}")`
    );
  }
} else {
  console.log(`   ➖ REALTIME_PATH: Not set (will use default /api/realtime)`);
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
  console.log('   • PUSHER_* variables: Real-time communication features');
  console.log('   • SMTP_* variables: Email verification and password reset');
  console.log('   • TWILIO_* variables: Phone verification and SMS');
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
console.log('   • Pusher: Create account at https://pusher.com for real-time features');
console.log('   • SMTP: Configure email service (Gmail, Outlook, etc.) for email verification');
console.log('   • Twilio: Create account at https://twilio.com for phone verification');
