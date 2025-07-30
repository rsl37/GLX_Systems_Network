#!/usr/bin/env node

// Test script to demonstrate TRUSTED_ORIGINS security validation
import { validateEnvironmentVariables } from '../server/deployment-validation.js';

console.log('🔒 Testing Enhanced TRUSTED_ORIGINS Security Validation\n');

// Test Case 1: Secure production configuration
console.log('📋 Test Case 1: Secure Production Configuration');
process.env.NODE_ENV = 'production';
process.env.TRUSTED_ORIGINS = 'https://secure-app.example.com,https://api.example.com,https://secure.partner.com';

let results = validateEnvironmentVariables();
let trustedOriginsResult = results.find(r => r.check === 'TRUSTED_ORIGINS Security');
console.log(`Status: ${trustedOriginsResult?.status || 'N/A'}`);
console.log(`Message: ${trustedOriginsResult?.message || 'N/A'}`);
if (trustedOriginsResult?.details?.security_warnings) {
  console.log(`Security Warnings: ${trustedOriginsResult.details.security_warnings.length}`);
}
console.log('');

// Test Case 2: Security risks detected
console.log('📋 Test Case 2: Security Risks in Production');
process.env.NODE_ENV = 'production';
process.env.TRUSTED_ORIGINS = 'https://secure-app.example.com,http://localhost:3000,https://192.168.1.100:8080';

results = validateEnvironmentVariables();
trustedOriginsResult = results.find(r => r.check === 'TRUSTED_ORIGINS Security');
console.log(`Status: ${trustedOriginsResult?.status || 'N/A'}`);
console.log(`Message: ${trustedOriginsResult?.message || 'N/A'}`);
if (trustedOriginsResult?.details?.security_warnings) {
  console.log(`Security Warnings: ${trustedOriginsResult.details.security_warnings.length}`);
  console.log('Warnings:');
  trustedOriginsResult.details.security_warnings.forEach((warning, index) => {
    console.log(`  ${index + 1}. ${warning}`);
  });
}
console.log('');

// Test Case 3: Development environment (more permissive)
console.log('📋 Test Case 3: Development Environment');
process.env.NODE_ENV = 'development';
process.env.TRUSTED_ORIGINS = 'http://localhost:3000,https://staging.example.com';

results = validateEnvironmentVariables();
trustedOriginsResult = results.find(r => r.check === 'TRUSTED_ORIGINS Security');
console.log(`Status: ${trustedOriginsResult?.status || 'N/A'}`);
console.log(`Message: ${trustedOriginsResult?.message || 'N/A'}`);
if (trustedOriginsResult?.details?.security_warnings) {
  console.log(`Security Warnings: ${trustedOriginsResult.details.security_warnings.length}`);
}
console.log('');

console.log('🛡️ Security Features Implemented:');
console.log('   ✅ HTTPS enforcement in production environments');
console.log('   ✅ Development origin detection and blocking in production');
console.log('   ✅ IP address detection with security warnings');
console.log('   ✅ Individual origin validation and security scoring');
console.log('   ✅ Detailed security warnings with remediation advice');
console.log('   ✅ Attack surface minimization through strict validation');
console.log('');
console.log('🔒 Attack Surface Reduction:');
console.log('   • No wildcard origins allowed');
console.log('   • No overly broad patterns');
console.log('   • Explicit validation of each trusted origin');
console.log('   • Production security enforcement');
console.log('   • Clear security warnings for administrators');