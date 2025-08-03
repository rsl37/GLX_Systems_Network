---
title: "GALAX App - Firewall Configuration Guide"
description: ""
lastUpdated: "2025-08-03"
nextReview: "2025-09-03"
contentType: "archive"
maintainer: "GALAX Development Team"
version: "1.0.0"
tags: []
relatedDocs: []
---

# GALAX App - Firewall Configuration Guide

## Overview

This document provides a comprehensive list of URLs, domains, and network requirements for the GALAX civic networking platform to operate correctly behind corporate firewalls and security restrictions. The application requires access to various external services for authentication, API services, development tools, and real-time functionality.

## Quick Reference - Essential Domains

For immediate firewall configuration, ensure these critical domains are allowlisted:

```
# Core GitHub Services
github.com
*.github.com
*.githubusercontent.com
api.github.com

# Package Management
registry.npmjs.org
*.npmjs.org

# Development & Runtime
localhost (for development)
cdnjs.cloudflare.com
```

## Detailed Service Categories

### 1. GitHub Services (Critical)

#### GitHub Authentication & API
- `github.com` - Main GitHub platform
- `api.github.com` - GitHub REST API
- `*.github.com` - GitHub subdomains
- `*.githubusercontent.com` - GitHub user content and raw files

#### GitHub Actions & CI/CD
- `objects.githubusercontent.com` - Action artifacts and cache
- `*.actions.githubusercontent.com` - GitHub Actions services
- `pipelines.actions.githubusercontent.com` - Workflow execution

#### GitHub Copilot Services
- `copilot-proxy.githubusercontent.com` - Copilot API proxy
- `api.githubcopilot.com` - Copilot completion service
- `*.githubcopilot.com` - Copilot related services

#### GitHub Security & Code Scanning
- `*.codeql.github.com` - CodeQL analysis services
- `uploads.github.com` - Security scanning uploads

### 2. Package Management & Dependencies

#### npm Registry
- `registry.npmjs.org` - Main npm package registry
- `*.npmjs.org` - npm CDN and mirror services
- `*.npmjs.com` - npm website and services

#### CDN Services for Dependencies
- `cdnjs.cloudflare.com` - JavaScript library CDN (Leaflet icons)
- `unpkg.com` - npm package CDN
- `jsdelivr.net` - Open source CDN

### 3. Map & Geolocation Services

#### OpenStreetMap
- `*.tile.openstreetmap.org` - Map tile servers
- `tile.openstreetmap.org` - Primary tile server
- `a.tile.openstreetmap.org` - Tile server A
- `b.tile.openstreetmap.org` - Tile server B
- `c.tile.openstreetmap.org` - Tile server C

#### Alternative Map Providers (Optional)
- `api.mapbox.com` - Mapbox services (if used)
- `*.googleapis.com` - Google Maps API (if used)

### 4. Email & Communication Services

#### SMTP Services
- `smtp.gmail.com:587` - Gmail SMTP (default configuration)
- `smtp.outlook.com:587` - Outlook SMTP
- `smtp.sendgrid.net:587` - SendGrid SMTP
- Custom SMTP servers as configured in environment variables

#### Email Verification Services
- Provider-specific domains based on chosen email service

### 5. Real-time Communication

#### Socket.IO
- WebSocket connections to application server
- `localhost:3001` (development)
- Production server domain (as configured)

### 6. Security & Monitoring Services

#### Vulnerability Scanning
- `audit-api.npmjs.org` - npm security audits
- `*.snyk.io` - Snyk security scanning (if used)

#### Error Tracking & Monitoring
- `*.sentry.io` - Error tracking (if configured)
- `*.rollbar.com` - Error monitoring (if configured)

### 7. Development Tools & Utilities

#### TypeScript & Build Tools
- `registry.yarnpkg.com` - Yarn package registry (if used)
- `typescript.azureedge.net` - TypeScript services

#### Testing & Quality Assurance
- `*.codecov.io` - Code coverage reporting (if used)
- `sonarcloud.io` - Code quality analysis (if used)

## Port Requirements

### Standard HTTP/HTTPS Ports
- `80` - HTTP
- `443` - HTTPS (primary)

### Development Ports
- `3000` - Frontend development server
- `3001` - Backend API server
- `5173` - Vite development server
- `8080` - Alternative development port

### Email Ports
- `587` - SMTP (STARTTLS)
- `465` - SMTP (SSL)
- `25` - SMTP (standard, usually blocked)

### WebSocket Ports
- Same as HTTP/HTTPS ports (WebSocket upgrade)

## Protocol Requirements

- `HTTP/HTTPS` - Web traffic
- `WebSocket/WSS` - Real-time communication
- `SMTP` - Email delivery
- `DNS` - Domain name resolution

## Environment-Specific Configuration

### Development Environment
```
# Required for local development
localhost:3000
localhost:3001
127.0.0.1:3000
127.0.0.1:3001
```

### Production Environment
```
# Replace with actual production domains
your-production-domain.com
api.your-production-domain.com
```

## Implementation Guidelines

### 1. Basic Firewall Configuration

For most corporate firewalls, add these rules:

#### Outbound Rules (Allow)
```
# GitHub Services
ALLOW HTTPS github.com
ALLOW HTTPS *.github.com
ALLOW HTTPS *.githubusercontent.com
ALLOW HTTPS api.github.com

# Package Management
ALLOW HTTPS registry.npmjs.org
ALLOW HTTPS *.npmjs.org

# CDN Services
ALLOW HTTPS cdnjs.cloudflare.com

# Map Services
ALLOW HTTPS *.tile.openstreetmap.org
```

### 2. Proxy Configuration

If using a corporate proxy, configure:

```bash
# npm proxy configuration
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080

# Git proxy configuration
git config --global http.proxy http://proxy.company.com:8080
git config --global https.proxy http://proxy.company.com:8080
```

### 3. Environment Variables

Set these environment variables for proxy awareness:

```bash
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080
export NO_PROXY=localhost,127.0.0.1,*.local
```

## Security Considerations

### 1. SSL/TLS Requirements
- All external communications should use HTTPS/TLS
- Verify SSL certificates are properly validated
- Use secure protocols for SMTP (STARTTLS or SSL)

### 2. API Key Management
- Store API keys in environment variables
- Never commit API keys to version control
- Rotate API keys regularly

### 3. Network Monitoring
- Monitor outbound connections for suspicious activity
- Log failed connection attempts
- Implement rate limiting where appropriate

## Troubleshooting

### Common Issues and Solutions

#### 1. Package Installation Failures
```bash
# Check npm connectivity
npm ping

# Test with verbose logging
npm install --verbose

# Use alternative registry
npm install --registry https://registry.npmjs.org/
```

#### 2. GitHub API Rate Limiting
```bash
# Check rate limit status
curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/rate_limit

# Use authenticated requests
export GITHUB_TOKEN=your_token_here
```

#### 3. Socket.IO Connection Issues
- Verify WebSocket traffic is allowed
- Check if WebSocket upgrade headers are preserved
- Ensure proper CORS configuration

#### 4. Map Loading Issues
```bash
# Test OpenStreetMap connectivity
curl -I https://tile.openstreetmap.org/0/0/0.png

# Verify CDN access
curl -I https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png
```

## Testing Connectivity

Use these commands to verify network connectivity:

```bash
# Test GitHub connectivity
curl -I https://api.github.com

# Test npm registry
curl -I https://registry.npmjs.org

# Test OpenStreetMap
curl -I https://tile.openstreetmap.org/0/0/0.png

# Test CDN services
curl -I https://cdnjs.cloudflare.com
```

## Minimal Configuration

For restrictive environments, this minimal set may be sufficient:

```
# Absolute minimum
github.com
*.github.com
api.github.com
registry.npmjs.org
*.tile.openstreetmap.org
cdnjs.cloudflare.com
```

## Contact & Support

For questions about firewall configuration:

1. Review application logs for specific connection failures
2. Check network monitoring tools for blocked requests
3. Consult with network administrators for corporate-specific requirements
4. Verify environment-specific configurations

## Updates & Maintenance

This document should be reviewed and updated when:

- New external services are integrated
- API endpoints change
- Security requirements are updated
- Network infrastructure changes

Last Updated: 2024-12-28
Version: 1.0
