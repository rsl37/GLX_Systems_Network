---
title: "Vercel Domain & SSL Configuration Guide"
description: ""
lastUpdated: "2025-08-03"
nextReview: "2025-09-03"
contentType: "documentation"
maintainer: "GLX Development Team"
version: "1.0.0"
tags: []
relatedDocs: []
---

# Vercel Domain & SSL Configuration Guide

## Overview

This guide explains how to properly configure a custom domain with SSL on Vercel to avoid `ERR_SSL_PROTOCOL_ERROR` issues.

## Issue Description

<<<<<<< HEAD:GLX_App_files/docs/VERCEL_DOMAIN_SETUP.md
When accessing the custom domain `glxcivicnetwork.me`, users encounter:
=======
When accessing the custom domain `galaxcivicnetwork.me`, users encounter:

>>>>>>> origin/all-merged:GALAX_App_files/docs/VERCEL_DOMAIN_SETUP.md
```
This site can't provide a secure connection
glxcivicnetwork.me sent an invalid response.
ERR_SSL_PROTOCOL_ERROR
```

This error occurs when the SSL certificate is not properly configured or the domain verification is incomplete.

## Solution Steps

### 1. Domain Configuration in Vercel Dashboard

1. **Access Project Settings**
   - Navigate to your project in the Vercel dashboard
   - Go to Settings → Domains

2. **Add Custom Domain**
   - Click "Add Domain"
   - Enter your domain: `glxcivicnetwork.me`
   - Choose "Add domain"

3. **DNS Configuration**
   - Configure your domain's DNS records as instructed by Vercel
   - For root domain, add A record: `76.76.19.61`
   - For www subdomain, add CNAME: `cname.vercel-dns.com`

### 2. Domain Verification

1. **Wait for DNS Propagation**
   - DNS changes can take 24-48 hours to propagate globally
   - Use tools like `dig` or online DNS checkers to verify

2. **SSL Certificate Issuance**
   - Vercel automatically issues Let's Encrypt SSL certificates
   - This process starts after DNS verification
   - Can take several minutes to complete

### 3. Common Issues & Solutions

#### DNS Not Propagated

```bash
# Check DNS resolution
dig glxcivicnetwork.me A
# Should return Vercel's IP addresses
```

#### SSL Certificate Pending

- Wait for automatic certificate issuance
- Check domain status in Vercel dashboard
- May take 5-10 minutes after DNS verification

#### Mixed HTTP/HTTPS Content

- Ensure all resources load over HTTPS
- Check for mixed content warnings in browser console

### 4. Vercel Configuration (Already Implemented)

The project's `vercel.json` includes:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains; preload"
        }
      ]
    }
  ],
  "redirects": [
    {
      "source": "/",
      "has": [
        {
          "type": "header",
          "key": "x-forwarded-proto",
          "value": "http"
        }
      ],
      "destination": "https://glxcivicnetwork.me/",
      "permanent": true
    }
  ]
}
```

These configurations:

- Force HTTPS with HSTS headers
- Redirect HTTP traffic to HTTPS
- Add security headers for better SSL/TLS behavior

### 5. Verification Steps

1. **Check Domain Status**

   ```bash
   curl -I https://glxcivicnetwork.me
   ```

2. **Verify SSL Certificate**

   ```bash
   openssl s_client -connect glxcivicnetwork.me:443 -servername glxcivicnetwork.me
   ```

3. **Test in Browser**
   - Visit `https://glxcivicnetwork.me`
   - Check for secure lock icon
   - Verify no mixed content warnings

### 6. Troubleshooting

#### Still Getting SSL Errors?

1. **Clear Browser Cache**
   - Hard refresh (Ctrl+F5 or Cmd+Shift+R)
   - Clear SSL state in browser settings

2. **Check Vercel Dashboard**
   - Verify domain shows as "Ready"
   - Check for any error messages

3. **Re-verify Domain**
   - Remove domain from Vercel
   - Re-add and wait for verification

4. **Contact Support**
   - If issues persist, contact Vercel support
   - Provide domain name and error details

### 7. Expected Timeline

- **DNS Configuration**: Immediate
- **DNS Propagation**: 1-48 hours
- **SSL Certificate Issuance**: 5-30 minutes after DNS verification
- **Full Resolution**: Up to 48 hours for global propagation

## Testing

After configuration, test both:
<<<<<<< HEAD:GLX_App_files/docs/VERCEL_DOMAIN_SETUP.md
- Direct Vercel URL: `https://glx-civic-networking-app.vercel.app`
- Custom domain: `https://glxcivicnetwork.me`
=======

- Direct Vercel URL: `https://galax-civic-networking-app.vercel.app`
- Custom domain: `https://galaxcivicnetwork.me`
>>>>>>> origin/all-merged:GALAX_App_files/docs/VERCEL_DOMAIN_SETUP.md

Both should work without SSL errors.

## Additional Resources

- [Vercel Domain Configuration Docs](https://vercel.com/docs/concepts/projects/domains)
- [Vercel SSL Certificate Docs](https://vercel.com/docs/concepts/edge-network/ssl)
- [DNS Propagation Checker](https://www.whatsmydns.net/)
