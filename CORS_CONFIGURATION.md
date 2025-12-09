---
title: "Configurable CORS Origins"
description: ""
lastUpdated: "2025-12-09"
nextReview: "2026-01-09"
contentType: "documentation"
maintainer: "rsl37"
version: "1.0.0"
tags: []
relatedDocs: []
---

# Configurable CORS Origins

This document explains the new configurable CORS (Cross-Origin Resource Sharing) system that allows deployment environments to use appropriate origins without code changes.

## Overview

Previously, CORS origins were hardcoded in the application, making it difficult to deploy to different environments. The new system allows full configuration via environment variables while maintaining backward compatibility.

## Environment Variables

### Primary Configuration (Recommended)

- **`CORS_ALLOWED_ORIGINS`** - Main configurable CORS origins (comma-separated)
  ```bash
  CORS_ALLOWED_ORIGINS=https://app.vercel.app,https://custom.domain.com,https://staging.domain.com
  ```

### Environment-Specific Configuration

- **`CORS_DEVELOPMENT_ORIGINS`** - Development-specific origins
  ```bash
  CORS_DEVELOPMENT_ORIGINS=http://localhost:3000,http://localhost:5173,http://custom-dev.local
  ```

- **`CORS_PRODUCTION_ORIGINS`** - Production-specific origins
  ```bash
  CORS_PRODUCTION_ORIGINS=https://glxcivicnetwork.me,https://www.glxcivicnetwork.me
  ```

- **`CORS_TEST_ORIGINS`** - Test environment origins
  ```bash
  CORS_TEST_ORIGINS=https://test.domain.com,https://ci.domain.com
  ```

### Pattern Matching for Dynamic Deployments

- **`CORS_PATTERN_DOMAINS`** - Domain patterns for dynamic Vercel deployments
  ```bash
  CORS_PATTERN_DOMAINS=glx-civic-networking,myapp
  ```
  This allows origins like `https://glx-civic-networking-feature-branch.vercel.app`

### Control Flags

- **`CORS_ALLOW_DEVELOPMENT`** - Enable development origins in non-dev environments
  ```bash
  CORS_ALLOW_DEVELOPMENT=true
  ```

### Legacy Configuration (Backward Compatibility)

These are maintained for backward compatibility:

- **`CLIENT_ORIGIN`** - Primary CORS origin (legacy)
- **`FRONTEND_URL`** - Alternative frontend URL (legacy)
- **`TRUSTED_ORIGINS`** - Additional trusted origins (comma-separated)
- **`PRODUCTION_FRONTEND_URL`** - Production frontend URL
- **`STAGING_FRONTEND_URL`** - Staging frontend URL

## Configuration Examples

### New Deployment (Recommended)

```bash
# Use primary configuration for all origins
CORS_ALLOWED_ORIGINS=https://myapp.vercel.app,https://custom.domain.com

# Optional: Set pattern domains for branch deployments
CORS_PATTERN_DOMAINS=myapp

# Optional: Environment-specific overrides
CORS_PRODUCTION_ORIGINS=https://custom.domain.com,https://www.custom.domain.com
```

### Migration from Legacy

```bash
# Keep existing configuration working
CLIENT_ORIGIN=https://legacy.domain.com
TRUSTED_ORIGINS=https://staging.domain.com

# Add new configuration gradually
CORS_ALLOWED_ORIGINS=https://new.domain.com

# Eventually migrate to only new configuration
CORS_ALLOWED_ORIGINS=https://legacy.domain.com,https://staging.domain.com,https://new.domain.com
```

### Development Setup

```bash
# Default localhost origins are included automatically in development
NODE_ENV=development

# Or override with custom development origins
CORS_DEVELOPMENT_ORIGINS=http://localhost:3000,http://custom-dev:5173
```

### Production Setup

```bash
NODE_ENV=production
CORS_ALLOWED_ORIGINS=https://glxcivicnetwork.me,https://glx-civic-networking.vercel.app
CORS_PATTERN_DOMAINS=glx-civic-networking
```

## Validation and Debugging

The system includes comprehensive validation:

1. **Format validation** - Ensures URLs start with `http://` or `https://`
2. **Production security** - Warns about HTTP origins in production
3. **Configuration recommendations** - Suggests optimizations
4. **Debug endpoints** - `/api/debug/cors` for troubleshooting

### Debug Information

Access `/api/debug/cors` to see:
- Current request origin
- Configured CORS variables
- Allowed origins resolution
- Environment information

## Migration Guide

### Step 1: Add New Configuration
Add `CORS_ALLOWED_ORIGINS` alongside existing configuration:
```bash
CLIENT_ORIGIN=https://existing.domain.com
CORS_ALLOWED_ORIGINS=https://existing.domain.com,https://new.domain.com
```

### Step 2: Test
Verify both old and new origins work correctly.

### Step 3: Migrate Completely
Remove legacy variables and use only new configuration:
```bash
CORS_ALLOWED_ORIGINS=https://existing.domain.com,https://new.domain.com,https://staging.domain.com
```

## Benefits

1. **Environment Independence** - No code changes needed for different deployments
2. **Flexibility** - Support multiple domains and dynamic deployments
3. **Security** - Proper validation and environment-specific controls
4. **Backward Compatibility** - Existing deployments continue working
5. **Pattern Matching** - Automatic support for branch-based Vercel deployments

## Files Modified

- `/GLX_App_files/server/middleware/security.ts` - Main CORS configuration
- `/api/index.ts` - Vercel serverless function CORS handling
- `/GLX_App_files/server/config/security.ts` - WebSocket CORS configuration
- `/GLX_App_files/server/envValidation.ts` - Environment validation
- `/GLX_App_files/.env.example` - Updated example configuration
