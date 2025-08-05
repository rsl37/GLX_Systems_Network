---
title: "Quick Firewall Configuration - GLX App"
description: ""
lastUpdated: "2025-08-03"
nextReview: "2025-09-03"
contentType: "archive"
maintainer: "GLX Development Team"
version: "1.0.0"
tags: []
relatedDocs: []
---

# Quick Firewall Configuration - GLX App

## For Network Administrators

This file provides a quick reference for configuring firewalls to allow the GLX application to function properly.

## Critical Domains (Must Allow)

```
# GitHub Services (Authentication, API, CI/CD)
github.com
*.github.com
*.githubusercontent.com
api.github.com

# Package Management (npm)
registry.npmjs.org
*.npmjs.org

# Map Services (OpenStreetMap)
*.tile.openstreetmap.org

# CDN Services (Static Assets)
cdnjs.cloudflare.com
```

## Ports Required

```
443/tcp  # HTTPS (Primary)
80/tcp   # HTTP (Redirects to HTTPS)
587/tcp  # SMTP (Email)
22/tcp   # SSH (Git operations)
```

## Development Ports (If Applicable)

```
3000/tcp # Frontend development server
3001/tcp # Backend API server
5173/tcp # Vite development server
```

## Firewall Rules (Generic Format)

### Allow Outbound HTTPS
```
ALLOW tcp/443 to github.com
ALLOW tcp/443 to *.github.com
ALLOW tcp/443 to *.githubusercontent.com
ALLOW tcp/443 to registry.npmjs.org
ALLOW tcp/443 to *.npmjs.org
ALLOW tcp/443 to *.tile.openstreetmap.org
ALLOW tcp/443 to cdnjs.cloudflare.com
```

### Allow Outbound HTTP (for redirects)
```
ALLOW tcp/80 to github.com
ALLOW tcp/80 to registry.npmjs.org
ALLOW tcp/80 to *.tile.openstreetmap.org
```

### Allow SSH (for Git operations)
```
ALLOW tcp/22 to github.com
ALLOW tcp/22 to ssh.github.com
```

## pfSense Configuration

```
# Navigate to Firewall > Rules > LAN
# Add these outbound rules:

Protocol: TCP
Source: LAN subnets
Destination: Single host or alias
  - github.com
  - *.github.com
  - *.githubusercontent.com
  - registry.npmjs.org
  - *.npmjs.org
  - *.tile.openstreetmap.org
  - cdnjs.cloudflare.com
Port: 443
Action: Pass
```

## iptables Configuration

```bash
# Allow outbound HTTPS to required domains
iptables -A OUTPUT -p tcp --dport 443 -d github.com -j ACCEPT
iptables -A OUTPUT -p tcp --dport 443 -d registry.npmjs.org -j ACCEPT

# Allow DNS resolution
iptables -A OUTPUT -p udp --dport 53 -j ACCEPT
iptables -A OUTPUT -p tcp --dport 53 -j ACCEPT

# Note: Wildcard domains require DNS resolution or IP ranges
```

## Windows Firewall Configuration

```powershell
# PowerShell commands for Windows Firewall
New-NetFirewallRule -DisplayName "GLX-GitHub" -Direction Outbound -RemoteAddress github.com -Protocol TCP -RemotePort 443 -Action Allow
New-NetFirewallRule -DisplayName "GLX-npm" -Direction Outbound -RemoteAddress registry.npmjs.org -Protocol TCP -RemotePort 443 -Action Allow
```

## Cisco ASA Configuration

```
# Access list for outbound traffic
access-list OUTBOUND permit tcp any host github.com eq 443
access-list OUTBOUND permit tcp any host api.github.com eq 443
access-list OUTBOUND permit tcp any host registry.npmjs.org eq 443

# Apply to interface
access-group OUTBOUND out interface inside
```

## Fortinet FortiGate Configuration

```
# Create address objects
config firewall address
    edit "github.com"
        set fqdn "github.com"
    next
    edit "npm-registry"
        set fqdn "registry.npmjs.org"
    next
end

# Create firewall policy
config firewall policy
    edit 0
        set name "GLX-App-Access"
        set srcintf "internal"
        set dstintf "wan1"
        set srcaddr "all"
        set dstaddr "github.com" "npm-registry"
        set action accept
        set service "HTTPS"
    next
end
```

## Palo Alto Configuration

```
# Create address objects
set address github.com fqdn github.com
set address npm-registry fqdn registry.npmjs.org

# Create security policy
set rulebase security rules GLX-App from trust to untrust
set rulebase security rules GLX-App source any
set rulebase security rules GLX-App destination [ github.com npm-registry ]
set rulebase security rules GLX-App service application-default
set rulebase security rules GLX-App action allow
```

## Proxy Configuration

If using a corporate proxy, configure these settings:

```bash
# Environment variables
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080
export NO_PROXY=localhost,127.0.0.1,*.local

# npm proxy configuration
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080

# Git proxy configuration
git config --global http.proxy http://proxy.company.com:8080
git config --global https.proxy http://proxy.company.com:8080
```

## Testing Commands

```bash
# Test basic connectivity
curl -I https://github.com
curl -I https://api.github.com
curl -I https://registry.npmjs.org

# Test with verbose output
curl -v https://github.com

# Test DNS resolution
nslookup github.com
dig github.com

# Test from application perspective
npm ping
git ls-remote https://github.com/user/repo.git
```

## Troubleshooting

### Common Issues:
1. **SSL/TLS Inspection**: Disable or configure SSL inspection for these domains
2. **DNS Resolution**: Ensure internal DNS can resolve external domains
3. **Certificate Validation**: Allow certificate chain validation
4. **WebSocket Connections**: Ensure WebSocket upgrade is allowed

### Logs to Check:
- Firewall deny logs
- Proxy access logs
- DNS query logs
- Application error logs

## Contact

For questions about this configuration:
1. Review detailed documentation: `FIREWALL_CONFIGURATION.md`
2. Check GitHub-specific requirements: `GITHUB_SERVICES_FIREWALL.md`
3. Test connectivity with provided commands
4. Consult application logs for specific blocked requests

Last Updated: 2024-12-28
