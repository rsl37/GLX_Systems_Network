---
title: "Environment Setup Guide"
description: ""
lastUpdated: "2025-08-03"
nextReview: "2025-09-03"
contentType: "documentation"
maintainer: "GALAX Development Team"
version: "1.0.0"
tags: []
relatedDocs: []
---

# Environment Setup Guide

This document explains how to set up the environment variables required for the GALAX Civic Networking App.

## Quick Setup

The easiest way to set up your environment is to use the automated setup script:

```bash
cd GALAX_App_files
./scripts/setup-env.sh
```

This script will:
- Create `.env` files from the `.env.example` templates
- Set appropriate development defaults
- Create all required application directories:
  - `./data/uploads` - File upload storage
  - `./data/logs` - Application logs
  - `./data/encrypted_documents` - Encrypted document storage
  - `./quarantine` - Antimalware quarantine
  - `./virus_quarantine` - Antivirus quarantine
  - `./coverage` - Test coverage reports
  - `./test-results` - Test result files
  - `./playwright-report` - End-to-end test reports
  - `/tmp/galax-sandbox-quarantine` - Sandbox quarantine (temporary)
  - `/tmp/kyc-uploads` - KYC upload processing (temporary)
- Set appropriate permissions for security-sensitive directories
- Provide guidance on configuration options

## Manual Setup

If you prefer to set up manually:

### 1. Backend Environment (GALAX_App_files/.env)

```bash
cd GALAX_App_files
cp .env.example .env
```

Then edit `.env` with your preferred values. For development, the key variables are:

```bash
NODE_ENV=development
PORT=3001
JWT_SECRET=your-secure-jwt-secret-at-least-32-characters
CLIENT_ORIGIN=http://localhost:5173
DATABASE_URL=  # Leave empty for SQLite, or set PostgreSQL URL
```

### 2. Frontend Environment (GALAX_App_files/client/.env)

```bash
cd GALAX_App_files/client
cp .env.example .env
```

Then edit `client/.env`:

```bash
REACT_APP_PUSHER_KEY=your-pusher-key
REACT_APP_PUSHER_CLUSTER=us2
REACT_APP_API_URL=http://localhost:3001/api
```

## Environment Variables Reference

### Required Variables

| Variable | Description | Development Default |
|----------|-------------|-------------------|
| `NODE_ENV` | Application environment | `development` |
| `PORT` | Server port | `3001` |
| `JWT_SECRET` | JWT signing secret | Generated dev secret |

### Recommended Variables

| Variable | Description | Development Default |
|----------|-------------|-------------------|
| `CLIENT_ORIGIN` | CORS allowed origin | `http://localhost:5173` |
| `DATABASE_URL` | Database connection | Empty (uses SQLite) |
| `SOCKET_PATH` | WebSocket path | `/socket.io` |

### Optional Variables (External Services)

| Variable | Description | Required For |
|----------|-------------|--------------|
| `PUSHER_*` | Pusher configuration | Real-time features |
| `SMTP_*` | Email configuration | Email verification, password reset |
| `TWILIO_*` | SMS configuration | Phone verification, 2FA |

## Testing Your Configuration

After setting up your environment files, test the configuration:

```bash
npm run test:env
```

This will verify that all required variables are set and properly formatted.

## Security Notes

- ⚠️ **Never commit `.env` files to version control**
- 🔐 **Use strong, randomly generated secrets for production**
- 🛡️ **Generate secure secrets using**: `openssl rand -hex 32`
- 🚫 **The development defaults are NOT secure for production use**

## Troubleshooting

### "Environment variables missing" error
- Ensure `.env` files exist in the correct locations
- Run `npm run test:env` to check configuration
- Use the setup script: `./scripts/setup-env.sh`

### CORS errors in development
- Verify `CLIENT_ORIGIN` matches your frontend URL
- Check `TRUSTED_ORIGINS` includes your development URLs

### Database connection issues
- For development: leave `DATABASE_URL` empty to use SQLite
- For production: set a valid PostgreSQL connection string

## Production Deployment

For production deployment (e.g., Vercel):

1. **Never use the development defaults**
2. **Generate secure secrets**: `openssl rand -hex 32`
3. **Set environment variables in your deployment platform**
4. **Use the `.env.vercel` file as a reference for Vercel deployment**

See `DEPLOYMENT.md` for detailed production deployment instructions.
