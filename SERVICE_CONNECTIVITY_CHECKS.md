# Service Connectivity Checks

This document describes the service connectivity checks implemented for the GLX Civic Networking App. These checks validate the configuration and connectivity of essential services required for the application to function properly.

## Overview

The service connectivity checks validate essential services:

- 📧 **SMTP** - Email functionality (password reset, notifications)
- 📱 **Vonage** - SMS/Voice communications
- 🔄 **Socket.io/Ably** - Real-time messaging and notifications
- 🌐 **MetaMask/Web3** - Blockchain connectivity and post-quantum cryptography
- 🚨 **Resgrid** - Emergency dispatch communications

## Files Added

### Scripts
- `GLX_App_files/scripts/test-service-connectivity.ts` - Main service testing script
- `GLX_App_files/tests/setup/service-connectivity.test.ts` - Unit tests for service checks

### Workflows
- `.github/workflows/service-connectivity-checks.yml` - GitHub Actions workflow for automated testing

### Configuration
- `GLX_App_files/.env.test.services` - Example environment configuration with proper service values

## Usage

### Command Line

Run service connectivity checks locally:

```bash
# From the root directory
npm run test:services

# From the GLX_App_files directory
npm run test:services
```

### GitHub Actions

The workflow runs automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` branch
<!-- - Daily at 12 AM GMT-6 (scheduled check) - Currently disabled, PR scans only -->
- Manual dispatch (workflow_dispatch)

## Environment Variables Required

### SMTP Configuration
```bash
SMTP_HOST=smtp.gmail.com          # SMTP server hostname
SMTP_PORT=587                     # SMTP server port (usually 587 or 465)
SMTP_USER=your-email@gmail.com    # SMTP username/email
SMTP_PASS=your-app-password       # SMTP password (use app passwords for Gmail)
SMTP_FROM=noreply@yourapp.com     # From email address
```

### Vonage Configuration
```bash
VONAGE_API_KEY=your-api-key       # Vonage API Key
VONAGE_API_SECRET=your-secret     # Vonage API Secret
```

### Ably Configuration (Optional)
```bash
ABLY_API_KEY=your-ably-api-key    # Ably API Key
```

### Socket.io Configuration (Optional)
```bash
SOCKET_IO_URL=http://localhost:3000  # Socket.io server URL
```

### Web3/MetaMask
No additional environment variables required - checks for:
- Web3 libraries in package.json
- Network connectivity to Web3 providers
- Post-quantum cryptography implementations

## Test Results

The script provides detailed feedback on each service:

### Status Indicators
- ✅ **PASS** - Service is properly configured and reachable
- ⚠️ **WARNING** - Service has configuration issues but may still work
- ❌ **FAIL** - Service has critical configuration problems

### Example Output
```
🔧 GLX Service Connectivity Tests
=====================================

📧 Testing SMTP Configuration...
📱 Testing Vonage Configuration...
🔄 Testing Ably Configuration...
🔌 Testing Socket.io Configuration...
🌐 Testing MetaMask/Web3 Configuration...

📊 Test Results Summary:
========================

✅ PASS SMTP: SMTP configuration valid and host reachable
✅ PASS Vonage: Vonage configuration valid and API reachable
✅ PASS Ably: Ably configuration valid and API reachable
✅ PASS Socket.io: Socket.io libraries detected: socket.io, socket.io-client
✅ PASS Web3/MetaMask: Web3 libraries detected: @noble/post-quantum, crystals-kyber, dilithium-js
✅ PASS Web3 Providers: Web3 providers reachable: 3/3

🏁 Overall Status:
✅ PASSED - All services are properly configured
```

## Validation Checks

### SMTP Validation
- Checks for all required environment variables
- Validates port number format
- Detects placeholder values
- Tests host connectivity

### Vonage Validation
- Checks for API Key and Secret
- Tests Vonage API connectivity
- Detects placeholder values

### Ably Validation
- Validates API key format
- Tests Ably REST API connectivity
- Checks for placeholder values

### Socket.io Validation
- Checks for Socket.io libraries in dependencies
- Tests server connectivity if URL is configured

### Web3/MetaMask Validation
- Checks for Web3 libraries in dependencies
- Tests connectivity to major Web3 providers
- Validates post-quantum cryptography libraries
- Ensures blockchain functionality is available

## Security Features

The checks include security validations:

- **Placeholder Detection** - Identifies common placeholder values that need to be replaced
- **Credential Scanning** - Checks for hardcoded credentials in source code
- **Format Validation** - Ensures credentials follow expected formats
- **Network Security** - Prefers HTTPS connections where applicable

## Integration with CI/CD

The GitHub Actions workflow:

1. **Installs Dependencies** - Sets up Node.js and installs packages
2. **Creates Test Environment** - Sets up test configuration
3. **Runs Individual Service Tests** - Tests each service separately
4. **Validates Dependencies** - Checks package.json for required libraries
5. **Tests Network Connectivity** - Verifies service provider reachability
6. **Security Checks** - Scans for hardcoded credentials
7. **Provides Summary** - Reports overall status and recommendations

## Troubleshooting

### Common Issues

1. **Missing Environment Variables**
   - Copy `.env.example` to `.env` and configure with real values
   - Check that all required variables are set

2. **Placeholder Values**
   - Replace any values containing "example", "your-", "test-", etc. with real credentials

3. **Network Connectivity Issues**
   - May be normal in CI environments with restricted network access
   - Check firewall settings for outbound connections

4. **Invalid Credential Formats**
   - Email addresses must be valid format
   - API keys should not contain placeholder values

### Getting Service Credentials

#### SMTP (Gmail)
1. Enable 2-factor authentication
2. Generate an App Password
3. Use the App Password as SMTP_PASS

#### Vonage
1. Sign up at https://vonage.com
2. Get API Key and Secret from dashboard

#### Ably
1. Sign up at https://ably.com
2. Create a new app
3. Copy API Key from app settings

## Support

For issues with service connectivity checks:

1. Check the GitHub Actions logs for detailed error messages
2. Run the tests locally for faster debugging
3. Verify service credentials are properly configured
4. Check network connectivity to service providers

The checks are designed to provide clear feedback on what needs to be fixed for each service to work properly.