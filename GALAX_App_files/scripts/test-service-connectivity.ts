#!/usr/bin/env node

/*
 * Copyright (c) 2025 GALAX Civic Networking App
 *
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

/**
 * Service Connectivity Test Script
 *
 * This script tests the connectivity and configuration of essential services:
 * - SMTP (Email)
 * - Twilio (SMS)
 * - Pusher (Real-time messaging)
 * - MetaMask/Web3 (Blockchain connectivity)
 */

import dotenv from "dotenv";
import https from "https";
import http from "http";

// Load environment variables
dotenv.config();

interface ServiceTestResult {
  service: string;
  status: "✅ PASS" | "❌ FAIL" | "⚠️ WARNING";
  message: string;
  details?: string;
}

const results: ServiceTestResult[] = [];
let hasFailures = false;
let hasWarnings = false;

// Utility function to add test result
function addResult(service: string, status: ServiceTestResult["status"], message: string, details?: string) {
  results.push({ service, status, message, details });
  if (status === "❌ FAIL") hasFailures = true;
  if (status === "⚠️ WARNING") hasWarnings = true;
}

// Utility function to test HTTPS connectivity
function testHttpsConnectivity(hostname: string, path: string = "/", timeout: number = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    const options = {
      hostname,
      port: 443,
      path,
      method: "HEAD",
      timeout,
    };

    const req = https.request(options, (res) => {
      resolve(res.statusCode !== undefined && res.statusCode < 500);
    });

    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

// Test SMTP Configuration
async function testSMTPConfig(): Promise<void> {
  console.log("📧 Testing SMTP Configuration...");

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM;

  // Check if all SMTP variables are set
  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !smtpFrom) {
    const missing = [];
    if (!smtpHost) missing.push("SMTP_HOST");
    if (!smtpPort) missing.push("SMTP_PORT");
    if (!smtpUser) missing.push("SMTP_USER");
    if (!smtpPass) missing.push("SMTP_PASS");
    if (!smtpFrom) missing.push("SMTP_FROM");
    
    addResult("SMTP", "❌ FAIL", "Missing required environment variables", 
      `Missing: ${missing.join(", ")}`);
    return;
  }

  // Validate SMTP configuration
  const port = parseInt(smtpPort, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    addResult("SMTP", "❌ FAIL", "Invalid SMTP_PORT", 
      `Port ${smtpPort} is not a valid port number`);
    return;
  }

  // Check for placeholder values
  const placeholders = ["your-", "example", "placeholder", "change-this"];
  const hasPlaceholders = placeholders.some(p => 
    smtpHost.toLowerCase().includes(p) || 
    smtpUser.toLowerCase().includes(p) ||
    smtpFrom.toLowerCase().includes(p)
  );

  if (hasPlaceholders) {
    addResult("SMTP", "⚠️ WARNING", "SMTP configuration appears to use placeholder values",
      "Please configure with real SMTP credentials");
    return;
  }

  // Test SMTP host connectivity
  try {
    const isReachable = await testHttpsConnectivity(smtpHost);
    if (isReachable) {
      addResult("SMTP", "✅ PASS", "SMTP configuration valid and host reachable");
    } else {
      addResult("SMTP", "⚠️ WARNING", "SMTP configuration valid but host connectivity test failed",
        "This may be normal if SMTP host doesn't respond to HTTPS requests");
    }
  } catch (error) {
    addResult("SMTP", "⚠️ WARNING", "SMTP configuration valid but connectivity test failed",
      "Host reachability could not be verified");
  }
}

// Test Twilio Configuration
async function testTwilioConfig(): Promise<void> {
  console.log("📱 Testing Twilio Configuration...");

  const twilioSid = process.env.TWILIO_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

  // Check if all Twilio variables are set
  if (!twilioSid || !twilioAuthToken || !twilioPhoneNumber) {
    const missing = [];
    if (!twilioSid) missing.push("TWILIO_SID");
    if (!twilioAuthToken) missing.push("TWILIO_AUTH_TOKEN");
    if (!twilioPhoneNumber) missing.push("TWILIO_PHONE_NUMBER");
    
    addResult("Twilio", "❌ FAIL", "Missing required environment variables", 
      `Missing: ${missing.join(", ")}`);
    return;
  }

  // Validate Twilio SID format (should start with AC and be 34 characters)
  if (!twilioSid.startsWith("AC") || twilioSid.length !== 34) {
    addResult("Twilio", "❌ FAIL", "Invalid TWILIO_SID format",
      "Twilio Account SID should start with 'AC' and be 34 characters long");
    return;
  }

  // Validate phone number format (should start with +)
  if (!twilioPhoneNumber.startsWith("+")) {
    addResult("Twilio", "⚠️ WARNING", "Phone number format may be invalid",
      "Twilio phone numbers should include country code with + prefix");
  }

  // Check for placeholder values
  const placeholders = ["your-", "example", "placeholder", "change-this"];
  const hasPlaceholders = placeholders.some(p => 
    twilioSid.toLowerCase().includes(p) || 
    twilioAuthToken.toLowerCase().includes(p) ||
    twilioPhoneNumber.toLowerCase().includes(p)
  );

  if (hasPlaceholders) {
    addResult("Twilio", "⚠️ WARNING", "Twilio configuration appears to use placeholder values",
      "Please configure with real Twilio credentials");
    return;
  }

  // Test Twilio API connectivity
  try {
    const isReachable = await testHttpsConnectivity("api.twilio.com");
    if (isReachable) {
      addResult("Twilio", "✅ PASS", "Twilio configuration valid and API reachable");
    } else {
      addResult("Twilio", "⚠️ WARNING", "Twilio configuration valid but API connectivity test failed");
    }
  } catch (error) {
    addResult("Twilio", "⚠️ WARNING", "Twilio configuration valid but connectivity test failed");
  }
}

// Test Pusher Configuration
async function testPusherConfig(): Promise<void> {
  console.log("🔄 Testing Pusher Configuration...");

  const pusherAppId = process.env.PUSHER_APP_ID;
  const pusherKey = process.env.PUSHER_KEY;
  const pusherSecret = process.env.PUSHER_SECRET;
  const pusherCluster = process.env.PUSHER_CLUSTER;

  // Check if all Pusher variables are set
  if (!pusherAppId || !pusherKey || !pusherSecret || !pusherCluster) {
    const missing = [];
    if (!pusherAppId) missing.push("PUSHER_APP_ID");
    if (!pusherKey) missing.push("PUSHER_KEY");
    if (!pusherSecret) missing.push("PUSHER_SECRET");
    if (!pusherCluster) missing.push("PUSHER_CLUSTER");
    
    addResult("Pusher", "❌ FAIL", "Missing required environment variables", 
      `Missing: ${missing.join(", ")}`);
    return;
  }

  // Validate Pusher App ID (should be numeric)
  if (!/^\d+$/.test(pusherAppId)) {
    addResult("Pusher", "❌ FAIL", "Invalid PUSHER_APP_ID format",
      "Pusher App ID should be numeric");
    return;
  }

  // Check for placeholder values
  const placeholders = ["your-", "example", "placeholder", "change-this"];
  const hasPlaceholders = placeholders.some(p => 
    pusherAppId.toLowerCase().includes(p) || 
    pusherKey.toLowerCase().includes(p) ||
    pusherSecret.toLowerCase().includes(p) ||
    pusherCluster.toLowerCase().includes(p)
  );

  if (hasPlaceholders) {
    addResult("Pusher", "⚠️ WARNING", "Pusher configuration appears to use placeholder values",
      "Please configure with real Pusher credentials");
    return;
  }

  // Test Pusher API connectivity using cluster
  const pusherHostname = `api-${pusherCluster}.pusherapp.com`;
  
  try {
    const isReachable = await testHttpsConnectivity(pusherHostname);
    if (isReachable) {
      addResult("Pusher", "✅ PASS", "Pusher configuration valid and API reachable");
    } else {
      addResult("Pusher", "⚠️ WARNING", "Pusher configuration valid but API connectivity test failed");
    }
  } catch (error) {
    addResult("Pusher", "⚠️ WARNING", "Pusher configuration valid but connectivity test failed");
  }
}

// Test MetaMask/Web3 Configuration
async function testWeb3Config(): Promise<void> {
  console.log("🌐 Testing MetaMask/Web3 Configuration...");

  // Check for Web3 dependencies in package.json
  try {
    const packageJsonPath = new URL("../package.json", import.meta.url);
    const packageJson = await import(packageJsonPath.href);
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    const web3Libs = ["web3", "ethers", "@web3js", "viem", "@noble/post-quantum", "crystals-kyber", "dilithium-js"];
    const foundLibs = web3Libs.filter(lib => 
      Object.keys(deps).some(dep => dep.includes(lib))
    );

    if (foundLibs.length === 0) {
      addResult("Web3/MetaMask", "⚠️ WARNING", "No Web3 libraries detected in dependencies",
        "Consider adding ethers.js, web3.js, or viem for Web3 functionality");
      return;
    }

    addResult("Web3/MetaMask", "✅ PASS", `Web3 libraries detected: ${foundLibs.join(", ")}`);

  } catch (error) {
    addResult("Web3/MetaMask", "⚠️ WARNING", "Could not analyze Web3 dependencies");
  }

  // Test Web3 provider connectivity
  const providers = [
    "eth-mainnet.alchemyapi.io",
    "mainnet.infura.io", 
    "ethereum.publicnode.com"
  ];

  const reachableProviders = [];
  
  for (const provider of providers) {
    try {
      const isReachable = await testHttpsConnectivity(provider);
      if (isReachable) {
        reachableProviders.push(provider);
      }
    } catch (error) {
      // Continue with other providers
    }
  }

  if (reachableProviders.length > 0) {
    addResult("Web3 Providers", "✅ PASS", 
      `Web3 providers reachable: ${reachableProviders.length}/${providers.length}`,
      `Reachable: ${reachableProviders.join(", ")}`);
  } else {
    addResult("Web3 Providers", "⚠️ WARNING", "No Web3 providers reachable",
      "This may indicate network connectivity issues");
  }
}

// Main test function
async function runServiceTests(): Promise<void> {
  console.log("🔧 GALAX Service Connectivity Tests");
  console.log("=====================================\n");

  try {
    await testSMTPConfig();
    await testTwilioConfig();
    await testPusherConfig();
    await testWeb3Config();

    console.log("\n📊 Test Results Summary:");
    console.log("========================\n");

    results.forEach(result => {
      console.log(`${result.status} ${result.service}: ${result.message}`);
      if (result.details) {
        console.log(`   └─ ${result.details}`);
      }
    });

    console.log("\n🏁 Overall Status:");
    
    if (hasFailures) {
      console.log("❌ FAILED - Critical service configuration issues detected");
      console.log("   Please fix the failing services before deployment");
      process.exit(1);
    } else if (hasWarnings) {
      console.log("⚠️ WARNINGS - Some services have configuration warnings");
      console.log("   Consider reviewing the warnings for optimal functionality");
      process.exit(0);
    } else {
      console.log("✅ PASSED - All services are properly configured");
      process.exit(0);
    }

  } catch (error) {
    console.error("💥 Test execution failed:", error);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runServiceTests();
}

export { runServiceTests, testSMTPConfig, testTwilioConfig, testPusherConfig, testWeb3Config };