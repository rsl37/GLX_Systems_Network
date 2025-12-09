---
title: "GitHub Services - Detailed Firewall Requirements"
description: ""
lastUpdated: "2025-12-09"
nextReview: "2026-01-09"
contentType: "archive"
maintainer: "rsl37"
version: "1.0.0"
tags: []
relatedDocs: []
---

# GitHub Services - Detailed Firewall Requirements

## Overview

This document provides comprehensive details for configuring firewalls to support GitHub services used by the GLX application. It covers all GitHub-specific endpoints and services required for development, CI/CD, security scanning, and collaboration features.

## Core GitHub Domains

### Primary GitHub Services
```
github.com                          # Main GitHub platform
*.github.com                        # All GitHub subdomains
api.github.com                      # GitHub REST API v3 & v4 (GraphQL)
uploads.github.com                  # File uploads and attachments
avatars.githubusercontent.com       # User and organization avatars
raw.githubusercontent.com           # Raw file content
gist.githubusercontent.com          # Gist content
camo.githubusercontent.com          # Image proxying service
```

### GitHub Content Delivery
```
*.githubusercontent.com             # All user content domains
objects.githubusercontent.com       # Git objects and LFS
media.githubusercontent.com         # Media files
user-images.githubusercontent.com   # User uploaded images
repository-images.githubusercontent.com  # Repository images
```

## GitHub Actions & CI/CD

### Actions Infrastructure
```
pipelines.actions.githubusercontent.com    # Workflow execution
results-receiver.actions.githubusercontent.com  # Results collection
*.actions.githubusercontent.com            # Actions services
vstoken.actions.githubusercontent.com      # Token services
```

### Actions Marketplace & Downloads
```
github-releases.githubusercontent.com      # Release downloads
github-registry-files.githubusercontent.com # Package registry files
npm.pkg.github.com                         # GitHub npm packages
maven.pkg.github.com                       # GitHub Maven packages
rubygems.pkg.github.com                    # GitHub Ruby gems
nuget.pkg.github.com                       # GitHub NuGet packages
```

### Actions Cache & Artifacts
```
artifactcache.actions.githubusercontent.com  # Actions cache
*.blob.core.windows.net                      # Azure blob storage (artifacts)
github-production-repository-file-5c1aeb.s3.amazonaws.com  # S3 storage
github-production-upload-manifest-file-7fdce7.s3.amazonaws.com  # Manifest uploads
```

## GitHub Security Services

### Code Scanning & Security
```
*.codeql.github.com                 # CodeQL analysis
codeql.github.com                   # CodeQL downloads
github.githubassets.com             # GitHub assets
*.githubassets.com                  # Additional GitHub assets
```

### Secret Scanning
```
api.github.com/repos/*/secret-scanning  # Secret scanning API
```

### Dependabot
```
api.github.com/repos/*/dependabot        # Dependabot API
```

## GitHub Copilot Services

### Copilot API Services
```
api.githubcopilot.com               # Main Copilot API
copilot-proxy.githubusercontent.com  # Copilot proxy service
default.exp-tas.com                 # Copilot telemetry
```

### Copilot Telemetry & Analytics
```
*.githubcopilot.com                 # Copilot related services
vscode.github.com                   # VS Code GitHub integration
```

## GitHub Authentication

### OAuth & Authentication
```
github.com/login/oauth              # OAuth authentication
github.com/login/device             # Device flow authentication
api.github.com/user                 # User information
api.github.com/authorizations       # Token management
```

### SSH Services
```
ssh.github.com:22                   # SSH Git operations
```

## GitHub Packages & Registry

### Package Registries
```
npm.pkg.github.com                  # npm packages
maven.pkg.github.com                # Maven packages
docker.pkg.github.com               # Docker packages
rubygems.pkg.github.com             # Ruby gems
nuget.pkg.github.com                # NuGet packages
```

## GitHub Pages & Documentation

### Pages Services
```
*.github.io                         # GitHub Pages sites
pages.github.com                    # GitHub Pages service
```

## Webhooks & Integrations

### Webhook Endpoints
```
api.github.com/repos/*/hooks        # Repository webhooks
api.github.com/orgs/*/hooks         # Organization webhooks
```

### GitHub Apps & Integrations
```
api.github.com/app                  # GitHub Apps API
api.github.com/installation         # App installation API
```

## Development Tools

### GitHub CLI
```
cli.github.com                      # GitHub CLI updates
api.github.com/repos/cli/cli        # CLI repository
```

### GitHub Desktop
```
desktop.githubusercontent.com       # GitHub Desktop updates
api.github.com/repos/desktop/desktop # Desktop repository
```

## Enterprise & Organization Services

### Enterprise Features
```
*.ghe.com                           # GitHub Enterprise cloud
*.githubenterprise.com              # Enterprise services
```

### SAML & SSO
```
github.com/saml                     # SAML authentication
api.github.com/orgs/*/saml          # SAML configuration
```

## Content Security Policy (CSP) Requirements

For web applications embedding GitHub content:

```
Content-Security-Policy:
  connect-src 'self' 
    https://api.github.com 
    https://*.githubusercontent.com 
    https://github.com;
  img-src 'self' 
    https://*.githubusercontent.com 
    https://github.githubassets.com 
    https://avatars.githubusercontent.com;
  script-src 'self' 
    https://github.githubassets.com;
```

## Port Requirements

### Standard Ports
- `443` - HTTPS (primary)
- `80` - HTTP (redirects to HTTPS)
- `22` - SSH (for Git operations)
- `9418` - Git protocol (deprecated, use HTTPS)

### Custom Ports (Enterprise)
- Custom ports as configured for GitHub Enterprise Server

## Rate Limiting Considerations

### API Rate Limits
- Unauthenticated: 60 requests per hour per IP
- Authenticated: 5,000 requests per hour per user
- GitHub Actions: 1,000 requests per hour per repository

### Best Practices
- Use authentication tokens for API requests
- Implement exponential backoff for retries
- Cache responses when possible
- Use conditional requests (ETags)

## Testing GitHub Connectivity

### Basic Connectivity Tests
```bash
# Test main API
curl -I https://api.github.com

# Test authentication
curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/user

# Test file downloads
curl -I https://raw.githubusercontent.com/user/repo/main/README.md

# Test Actions connectivity
curl -I https://pipelines.actions.githubusercontent.com
```

### Comprehensive Test Script
```bash
#!/bin/bash
# GitHub connectivity test script

GITHUB_DOMAINS=(
    "github.com"
    "api.github.com"
    "raw.githubusercontent.com"
    "avatars.githubusercontent.com"
    "objects.githubusercontent.com"
    "pipelines.actions.githubusercontent.com"
    "copilot-proxy.githubusercontent.com"
)

for domain in "${GITHUB_DOMAINS[@]}"; do
    echo "Testing $domain..."
    if curl -s --max-time 10 -I "https://$domain" > /dev/null; then
        echo "✅ $domain - OK"
    else
        echo "❌ $domain - FAILED"
    fi
done
```

## Common Firewall Issues

### Issue 1: Git Clone/Push Failures
```bash
# Solution: Allow github.com and SSH port 22
git config --global url."https://github.com/".insteadOf git@github.com:
```

### Issue 2: Actions Workflow Failures
```bash
# Solution: Allow all githubusercontent.com subdomains
# Check workflow logs for specific blocked URLs
```

### Issue 3: Package Installation from GitHub
```bash
# Solution: Allow npm.pkg.github.com
npm config set @OWNER:registry https://npm.pkg.github.com
```

### Issue 4: Copilot Connection Issues
```bash
# Solution: Allow api.githubcopilot.com and copilot-proxy.githubusercontent.com
# Verify authentication token has Copilot access
```

## Security Recommendations

### 1. Use Token Authentication
- Create fine-grained personal access tokens
- Use organization-level tokens for team projects
- Regularly rotate authentication tokens

### 2. Implement Certificate Pinning
- Pin GitHub's SSL certificates where possible
- Monitor for certificate changes

### 3. Network Monitoring
- Log all GitHub API requests
- Monitor for unusual access patterns
- Implement rate limiting at firewall level

### 4. Least Privilege Access
- Only allow necessary GitHub services
- Restrict access to production vs. development environments
- Use environment-specific tokens

## Troubleshooting Commands

### Check GitHub Status
```bash
# Official GitHub status
curl -s https://www.githubstatus.com/api/v2/status.json | jq '.status.description'

# Check rate limits
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/rate_limit
```

### Debug Network Issues
```bash
# DNS resolution
nslookup github.com

# Trace route
traceroute github.com

# SSL certificate check
openssl s_client -connect github.com:443 -servername github.com
```

## Emergency Minimal Configuration

In case of urgent access needs, this minimal set allows basic GitHub functionality:

```
# Absolute minimum for basic GitHub access
github.com:443
api.github.com:443
raw.githubusercontent.com:443
```

## Compliance & Governance

### Data Location
- GitHub services may route through various global locations
- Consider data sovereignty requirements
- Review GitHub's data processing terms

### Audit Trail
- Enable audit logging for GitHub access
- Monitor API usage and access patterns
- Maintain records of firewall rule changes

## Contact Information

For GitHub-specific connectivity issues:
- GitHub Support: https://support.github.com
- GitHub Status: https://www.githubstatus.com
- GitHub Community: https://github.community

Last Updated: 2024-12-28
Version: 1.0
