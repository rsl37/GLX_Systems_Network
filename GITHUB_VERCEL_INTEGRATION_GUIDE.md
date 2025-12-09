---
title: "GLX Civic Networking App - Complete Vercel Integration Guide"
description: ""
lastUpdated: "2025-12-09"
nextReview: "2026-01-09"
contentType: "guide"
maintainer: "GLX Development Team"
version: "1.0.0"
tags: []
relatedDocs: []
---

# GLX Civic Networking App - Complete Vercel Integration Guide

## 🎯 Overview

This guide provides comprehensive instructions for setting up a secure, reliable GitHub-to-Vercel deployment pipeline for the GLX Civic Networking App. It covers security best practices, environment configuration, monitoring, and troubleshooting.

## 🔐 Security-First GitHub-Vercel Integration

### 1. Repository Security Configuration

#### Branch Protection Rules
Configure these settings in GitHub Repository Settings > Branches:

```yaml
Branch protection for 'main':
  - Require a pull request before merging
  - Require approvals: 1
  - Dismiss stale PR approvals when new commits are pushed
  - Require status checks to pass before merging
  - Require branches to be up to date before merging
  - Include administrators
  - Restrict pushes that create files larger than 100MB
```

#### Required Status Checks
Ensure these workflows must pass before merging:
- `Comprehensive CI/CD Pipeline`
- `Security Scan`
- `Vercel Integration Check`

### 2. Vercel Project Security Setup

#### Environment Variables (Required)
Configure these in Vercel Dashboard → Project Settings → Environment Variables:

```bash
# Core Security (REQUIRED)
NODE_ENV=production
JWT_SECRET=YOUR_SECURE_64_CHARACTER_RANDOM_STRING_HERE
JWT_REFRESH_SECRET=YOUR_SECURE_64_CHARACTER_REFRESH_STRING_HERE

# CORS Configuration (CRITICAL)
CLIENT_ORIGIN=https://your-app.vercel.app
FRONTEND_URL=https://your-app.vercel.app
TRUSTED_ORIGINS=https://your-app.vercel.app,https://your-custom-domain.com

# Database (Recommended: PostgreSQL)
DATABASE_URL=postgres://username:password@host:5432/glx_db

# Real-time Communication (REQUIRED)
PUSHER_APP_ID=your_pusher_app_id
PUSHER_KEY=your_pusher_key
PUSHER_SECRET=your_pusher_secret
PUSHER_CLUSTER=us2

# Email Services (Optional but Recommended)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
SMTP_FROM=noreply@yourdomain.com

# Phone Verification (Optional)
TWILIO_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

#### GitHub Secrets (Required for Auto-Deployment)
Configure these in GitHub Repository Settings → Secrets and Variables → Actions:

```bash
VERCEL_TOKEN=your_vercel_token_here
VERCEL_ORG_ID=your_vercel_org_id_here
VERCEL_PROJECT_ID=your_vercel_project_id_here
```

**To get Vercel secrets:**
1. Go to [Vercel Settings → Tokens](https://vercel.com/account/tokens)
2. Create a new token with deployment permissions
3. In your Vercel project dashboard, find the Project ID in Settings → General
4. Find your Org ID in your account settings

## 🚀 Deployment Workflows

### Automatic Deployments

#### Pull Request Previews
- **Trigger**: Every PR to `main` branch
- **Workflow**: `.github/workflows/preview-deploy.yml`
- **Features**:
  - Environment validation
  - Automatic Vercel preview deployment
  - Health check validation
  - PR comment with preview URL
  - Lighthouse performance audit

#### Production Releases
- **Trigger**: Manual workflow dispatch or version tags
- **Workflow**: `.github/workflows/release.yml`
- **Features**:
  - Automated version bumping
  - Production Vercel deployment
  - Health check validation
  - Release notes generation

#### Security Monitoring
- **Trigger**: All PRs and daily schedule
- **Workflow**: `.github/workflows/security-streamlined.yml`
- **Features**:
  - Dependency vulnerability scanning
  - Secret detection
  - CodeQL security analysis
  - License compliance checking

## 🛠 Development Workflow

### Pre-Deployment Validation

Before deploying, run these commands locally:

```bash
# Validate environment configuration
npm run vercel:validate

# Run full test suite
npm run test:all

# Check deployment readiness
npm run deployment:check

# Validate build for Vercel
npm run build
```

### Environment Setup

1. **Copy environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Configure required variables:**
   - Generate JWT secrets: `openssl rand -hex 32`
   - Set up Pusher account and get credentials
   - Configure database URL (PostgreSQL recommended)
   - Set CLIENT_ORIGIN to your domain

3. **Validate configuration:**
   ```bash
   npm run vercel:validate
   ```

### Local Testing with Vercel Environment

```bash
# Install Vercel CLI
npm install -g vercel

# Link to your Vercel project
vercel link

# Pull environment variables
vercel env pull .env.local

# Run local development
npm start
```

## 🏥 Health Monitoring & Validation

### Automated Health Checks

The deployment pipeline includes comprehensive health checks:

- **Main page loading**
- **API endpoint availability**
- **Security headers validation**
- **Performance metrics**
- **SSL/TLS configuration**
- **CORS policy validation**

### Manual Health Check

Run health checks manually:

```bash
# Check local deployment
npm run vercel:health

# Check specific URL
node scripts/vercel-health-check.js https://your-app.vercel.app
```

### Monitoring Endpoints

Monitor these endpoints for deployment health:

- `https://your-app.vercel.app/` - Main application
- `https://your-app.vercel.app/api/health` - API health check
- `https://your-app.vercel.app/api/realtime/health` - Real-time features

## 🔧 Troubleshooting Common Issues

### 1. "Request Failed" Errors

**Cause**: CORS misconfiguration
**Solution**:
```bash
# Verify CLIENT_ORIGIN matches your Vercel URL exactly
CLIENT_ORIGIN=https://your-exact-vercel-url.vercel.app

# Check for typos in domain names
# Ensure HTTPS is used
# Redeploy after changing environment variables
```

### 2. Build Failures

**Cause**: Missing dependencies or environment variables
**Solution**:
```bash
# Run build validation
npm run vercel:validate

# Check build output directory
ls -la dist/public/

# Verify vercel.json configuration
npm run build
```

### 3. API Endpoints Not Working

**Cause**: Incorrect function configuration
**Solution**:
```bash
# Verify vercel.json functions section
# Check that API files are in correct directory structure
# Ensure serverless function timeout is adequate
```

### 4. Environment Variables Not Applied

**Cause**: Variables not set in Vercel dashboard
**Solution**:
1. Check Vercel Dashboard → Project → Settings → Environment Variables
2. Ensure variables are set for Production, Preview, and Development
3. Redeploy after adding variables
4. Check function logs in Vercel dashboard

### 5. Performance Issues

**Cause**: Large bundle sizes or inefficient queries
**Solution**:
```bash
# Analyze bundle sizes
npm run build
find dist/public/assets -name "*.js" -exec ls -lh {} \;

# Run Lighthouse audit
npm install -g @lhci/cli
lhci autorun
```

## 📊 Performance Optimization

### Bundle Size Management

- Target: Keep individual JS bundles under 500KB
- Monitor: Check bundle sizes in CI/CD pipeline
- Optimize: Use code splitting and dynamic imports

### Vercel-Specific Optimizations

```json
// vercel.json optimizations
{
  "regions": ["iad1"],
  "functions": {
    "GLX_App_files/api/**/*": {
      "runtime": "@vercel/node",
      "maxDuration": 10
    }
  },
  "cleanUrls": true,
  "trailingSlash": false
}
```

### Caching Strategy

- Static assets: 1 year cache with immutable header
- API responses: Appropriate cache headers based on content
- Database queries: Connection pooling and query optimization

## 🔐 Security Best Practices

### Environment Security

1. **Never commit secrets** to version control
2. **Use strong JWT secrets** (minimum 64 characters)
3. **Validate all environment variables** before deployment
4. **Use HTTPS everywhere** - no HTTP endpoints
5. **Configure CSP headers** to prevent XSS attacks

### Deployment Security

1. **Require PR reviews** for all changes
2. **Run security scans** on every PR
3. **Monitor dependencies** for vulnerabilities
4. **Use branch protection** rules
5. **Audit deployment logs** regularly

### Runtime Security

1. **Input validation** on all API endpoints
2. **Rate limiting** to prevent abuse
3. **SQL injection protection** via ORM
4. **CORS configuration** for specific origins only
5. **Security headers** configured in vercel.json

## 📈 Monitoring & Analytics

### Built-in Monitoring

- **Vercel Analytics**: Automatic performance monitoring
- **Function Logs**: Error tracking and debugging
- **Real User Monitoring**: Core Web Vitals tracking

### Custom Monitoring

```bash
# Health check logging
npm run health:log

# Performance monitoring
npm run monitor:full

# Deployment validation
npm run deployment:check
```

### Alerting

Set up alerts for:
- Deployment failures
- API response time > 3 seconds
- Error rate > 1%
- Security scan failures

## 🎯 Success Checklist

Before going live, ensure:

- [ ] All environment variables configured in Vercel
- [ ] GitHub secrets added for auto-deployment
- [ ] Branch protection rules enabled
- [ ] Security scans passing
- [ ] Performance metrics acceptable
- [ ] Health checks passing
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active
- [ ] Database connection tested
- [ ] Email functionality verified
- [ ] Real-time features working
- [ ] Monitoring configured
- [ ] Error handling tested
- [ ] Backup procedures documented

## 🆘 Support & Maintenance

### Regular Maintenance Tasks

**Weekly:**
- Review security scan results
- Check performance metrics
- Update dependencies (automated via Dependabot)

**Monthly:**
- Audit environment variables
- Review access logs
- Test backup/restore procedures
- Performance optimization review

**Quarterly:**
- Security audit
- Infrastructure cost review
- Dependency major version updates
- Documentation updates

### Getting Help

1. **Check Vercel function logs** first for deployment issues
2. **Review GitHub Actions logs** for CI/CD problems
3. **Run local validation scripts** to isolate issues
4. **Check environment variable configuration** in Vercel dashboard
5. **Review security scan results** for vulnerabilities

### Emergency Procedures

**Deployment Rollback:**
```bash
# Via Vercel CLI
vercel rollback

# Via Vercel Dashboard
# Go to Deployments → Previous deployment → Promote to Production
```

**Security Incident:**
1. Immediately rotate all secrets
2. Review access logs
3. Update environment variables
4. Force redeploy
5. Monitor for continued issues

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Security Best Practices](./SECURITY.md)
- [Performance Optimization Guide](./docs/PERFORMANCE.md)
- [Troubleshooting Guide](./docs/TROUBLESHOOTING.md)

---

This integration provides enterprise-grade security, monitoring, and reliability for your GitHub-to-Vercel deployment pipeline. Follow this guide for a robust, secure deployment setup that scales with your application's needs.
