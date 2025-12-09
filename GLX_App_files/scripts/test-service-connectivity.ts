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
 * Service Connectivity Test Script
 *
 * This script tests the connectivity and configuration of essential services:
 * - SMTP (Email)
 * - Vonage (SMS/Voice - replaces Twilio)
 * - Ably (Real-time messaging - replaces Pusher)
 * - Socket.io (Real-time messaging - replaces Pusher)
 * - MetaMask/Web3 (Blockchain connectivity)
 * - Resgrid (Emergency dispatch)
 */

import dotenv from "dotenv";
import https from "https";
import http from "http";

// Load environment variables
dotenv.config();

// Detect CI environment - missing credentials in CI should be warnings, not failures
const isCI = process.env.CI === 'true' || 
             process.env.GITHUB_ACTIONS === 'true' ||
             process.env.NODE_ENV === 'test';

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
// In CI environments, missing credentials are warnings instead of failures
function addResult(service: string, status: ServiceTestResult["status"], message: string, details?: string) {
  // In CI, downgrade "FAIL" to "WARNING" for missing credentials
  let finalStatus = status;
  if (isCI && status === "❌ FAIL" && message.includes("Missing required environment variables")) {
    finalStatus = "⚠️ WARNING";
  }
  
  results.push({ service, status: finalStatus, message, details });
  if (finalStatus === "❌ FAIL") hasFailures = true;
  if (finalStatus === "⚠️ WARNING") hasWarnings = true;
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

// Test Vonage Configuration (replaces Twilio for SMS/Voice)
async function testVonageConfig(): Promise<void> {
  console.log("📱 Testing Vonage Configuration...");

  const vonageApiKey = process.env.VONAGE_API_KEY;
  const vonageApiSecret = process.env.VONAGE_API_SECRET;

  // Check if required Vonage variables are set
  if (!vonageApiKey || !vonageApiSecret) {
    const missing = [];
    if (!vonageApiKey) missing.push("VONAGE_API_KEY");
    if (!vonageApiSecret) missing.push("VONAGE_API_SECRET");
    
    addResult("Vonage", "❌ FAIL", "Missing required environment variables", 
      `Missing: ${missing.join(", ")}`);
    return;
  }

  // Check for placeholder values
  const placeholders = ["your-", "example", "placeholder", "change-this"];
  const hasPlaceholders = placeholders.some(p => 
    vonageApiKey.toLowerCase().includes(p) || 
    vonageApiSecret.toLowerCase().includes(p)
  );

  if (hasPlaceholders) {
    addResult("Vonage", "⚠️ WARNING", "Vonage configuration appears to use placeholder values",
      "Please configure with real Vonage credentials");
    return;
  }

  // Test Vonage API connectivity
  try {
    const isReachable = await testHttpsConnectivity("api.nexmo.com");
    if (isReachable) {
      addResult("Vonage", "✅ PASS", "Vonage configuration valid and API reachable");
    } else {
      addResult("Vonage", "⚠️ WARNING", "Vonage configuration valid but API connectivity test failed");
    }
  } catch (error) {
    addResult("Vonage", "⚠️ WARNING", "Vonage configuration valid but connectivity test failed");
  }
}

// Test Ably Configuration (replaces Pusher for real-time messaging)
async function testAblyConfig(): Promise<void> {
  console.log("🔄 Testing Ably Configuration...");

  const ablyApiKey = process.env.ABLY_API_KEY;

  // Check if Ably API key is set
  if (!ablyApiKey) {
    addResult("Ably", "❌ FAIL", "Missing required environment variables", 
      "Missing: ABLY_API_KEY");
    return;
  }

  // Validate Ably API key format (should contain a colon separating key name and secret)
  if (!ablyApiKey.includes(":") && !ablyApiKey.includes(".")) {
    addResult("Ably", "⚠️ WARNING", "Ably API key format may be invalid",
      "Ably API keys typically contain ':' or '.' separator");
  }

  // Check for placeholder values
  const placeholders = ["your-", "example", "placeholder", "change-this"];
  const hasPlaceholders = placeholders.some(p => 
    ablyApiKey.toLowerCase().includes(p)
  );

  if (hasPlaceholders) {
    addResult("Ably", "⚠️ WARNING", "Ably configuration appears to use placeholder values",
      "Please configure with real Ably credentials");
    return;
  }

  // Test Ably API connectivity
  try {
    const isReachable = await testHttpsConnectivity("rest.ably.io");
    if (isReachable) {
      addResult("Ably", "✅ PASS", "Ably configuration valid and API reachable");
    } else {
      addResult("Ably", "⚠️ WARNING", "Ably configuration valid but API connectivity test failed");
    }
  } catch (error) {
    addResult("Ably", "⚠️ WARNING", "Ably configuration valid but connectivity test failed");
  }
}

// Test Socket.io Configuration (replaces Pusher for real-time messaging)
async function testSocketIoConfig(): Promise<void> {
  console.log("🔌 Testing Socket.io Configuration...");

  const socketIoUrl = process.env.SOCKET_IO_URL;

  // Check for Web3/Socket.io dependencies in package.json
  try {
    const packageJsonPath = new URL("../package.json", import.meta.url);
    const packageJson = await import(packageJsonPath.href);
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    const socketIoLibs = ["socket.io", "socket.io-client"];
    const foundLibs = socketIoLibs.filter(lib => 
      Object.keys(deps).some(dep => dep.includes(lib))
    );

    if (foundLibs.length === 0) {
      addResult("Socket.io", "⚠️ WARNING", "No Socket.io libraries detected in dependencies",
        "Consider adding socket.io and socket.io-client for real-time functionality");
      return;
    }

    // If SOCKET_IO_URL is configured, test connectivity
    if (socketIoUrl) {
      // Check for placeholder values
      const placeholders = ["your-", "example", "placeholder", "change-this"];
      const hasPlaceholders = placeholders.some(p => 
        socketIoUrl.toLowerCase().includes(p)
      );

      if (hasPlaceholders) {
        addResult("Socket.io", "⚠️ WARNING", "Socket.io configuration appears to use placeholder values",
          "Please configure with real Socket.io server URL");
        return;
      }

      try {
        const socketHostname = new URL(socketIoUrl).hostname;
        const isReachable = await testHttpsConnectivity(socketHostname);
        if (isReachable) {
          addResult("Socket.io", "✅ PASS", `Socket.io configuration valid with libraries: ${foundLibs.join(", ")}`,
            `Server URL: ${socketIoUrl}`);
        } else {
          addResult("Socket.io", "⚠️ WARNING", "Socket.io libraries found but server connectivity test failed");
        }
      } catch (error) {
        addResult("Socket.io", "⚠️ WARNING", "Socket.io libraries found but URL parsing or connectivity test failed");
      }
    } else {
      addResult("Socket.io", "✅ PASS", `Socket.io libraries detected: ${foundLibs.join(", ")}`,
        "SOCKET_IO_URL not configured - using default local configuration");
    }

  } catch (error) {
    addResult("Socket.io", "⚠️ WARNING", "Could not analyze Socket.io dependencies");
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

// Test Resgrid Configuration (essential for emergency dispatch)
async function testResgridConfig(): Promise<void> {
  console.log("🚨 Testing Resgrid Configuration (Emergency Dispatch)...");

  const resgridApiKey = process.env.RESGRID_API_KEY;
  const resgridApiUrl = process.env.RESGRID_API_URL || "https://api.resgrid.com";

  // Check if Resgrid API key is set
  if (!resgridApiKey) {
    addResult("Resgrid", "❌ FAIL", "Missing required environment variables", 
      "Missing: RESGRID_API_KEY (essential for emergency dispatch)");
    return;
  }

  // Check for placeholder values
  const placeholders = ["your-", "example", "placeholder", "change-this"];
  const hasPlaceholders = placeholders.some(p => 
    resgridApiKey.toLowerCase().includes(p)
  );

  if (hasPlaceholders) {
    addResult("Resgrid", "⚠️ WARNING", "Resgrid configuration appears to use placeholder values",
      "Please configure with real Resgrid API credentials");
    return;
  }

  // Test Resgrid API connectivity
  try {
    const apiHostname = new URL(resgridApiUrl).hostname;
    const isReachable = await testHttpsConnectivity(apiHostname);
    if (isReachable) {
      addResult("Resgrid", "✅ PASS", "Resgrid configuration valid and API reachable",
        "Emergency dispatch communication ready");
    } else {
      addResult("Resgrid", "⚠️ WARNING", "Resgrid configuration valid but API connectivity test failed",
        "Emergency dispatch may be affected");
    }
  } catch (error) {
    addResult("Resgrid", "⚠️ WARNING", "Resgrid configuration valid but connectivity test failed");
  }
}

// Main test function
async function runServiceTests(): Promise<void> {
  console.log("🔧 GLX Service Connectivity Tests");
  console.log("=====================================");
  if (isCI) {
    console.log("ℹ️  Running in CI mode - missing credentials treated as warnings");
  }
  console.log("");

  try {
    await testSMTPConfig();
    await testResgridConfig();  // Essential for emergency dispatch
    await testVonageConfig();   // Replaces Twilio
    await testAblyConfig();     // Replaces Pusher for real-time messaging
    await testSocketIoConfig(); // Replaces Pusher for real-time messaging
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
      if (isCI) {
        console.log("   Note: Warnings in CI are expected when credentials are not configured");
      }
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

export { 
  runServiceTests, 
  testSMTPConfig, 
  testResgridConfig,
  testVonageConfig,
  testAblyConfig,
  testSocketIoConfig,
  testWeb3Config 
};
