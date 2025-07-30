# Deployment Configuration Guide

This document provides step-by-step instructions for fixing deployment issues with the GALAX Civic Networking App.

## Issue Resolution

**Problem:** Vercel deployment fails due to missing environment variables and directory structure issues.

**Root Cause:** After the post-quantum cryptography implementation, the application requires additional environment configuration and directory structure that wasn't properly set up for deployment.

## Quick Fix Steps

### 1. Required Directories
The following directories must exist for deployment:
- `data/logs` - For application logging
- `data/uploads` - For file uploads  
- `data` - For SQLite database (fallback)

These are now automatically created during the Vercel build process.

### 2. Essential Environment Variables

**REQUIRED** - Set these in your Vercel dashboard:

```bash
NODE_ENV=production
PORT=3000
DATA_DIRECTORY=./data
JWT_SECRET=your-64-character-secure-random-string
```

**RECOMMENDED** - For full functionality:

```bash
CLIENT_ORIGIN=https://your-app-name.vercel.app
FRONTEND_URL=https://your-app-name.vercel.app
TRUSTED_ORIGINS=https://your-app-name.vercel.app,https://galaxcivicnetwork.me
SOCKET_PATH=/socket.io
```

### 3. Vercel Dashboard Configuration

1. Go to your Vercel project dashboard
2. Navigate to **Settings** > **Environment Variables**
3. Add the following variables:

| Variable | Value | Environment |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Production |
| `PORT` | `3000` | All |
| `DATA_DIRECTORY` | `./data` | All |
| `JWT_SECRET` | Generate with `openssl rand -hex 32` | All |
| `CLIENT_ORIGIN` | Your Vercel app URL | Production |

### 4. Generate Secure Secrets

Generate a secure JWT secret:
```bash
openssl rand -hex 32
```

Copy the output and use it as your `JWT_SECRET` value.

### 5. Optional Features Configuration

For email functionality:
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@your-domain.com
```

For SMS/phone verification:
```bash
TWILIO_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

## Files Added/Modified

1. **`.env.example`** - Updated with comprehensive environment variable documentation
2. **`.env.vercel`** - Vercel-specific deployment guide
3. **`vercel.json`** - Updated build command to create required directories
4. **`data/logs/`** - Created required logs directory
5. **`DEPLOYMENT.md`** - This deployment guide

## Testing Your Deployment

After configuring environment variables:

1. **Local Test:**
   ```bash
   cd GALAX_App_files
   npm run deployment:check
   ```

2. **Vercel Deployment:**
   - Commit and push your changes
   - Redeploy on Vercel
   - Check deployment logs for any remaining issues

## Verification Steps

1. ✅ Environment variables are set in Vercel dashboard
2. ✅ `data/logs` directory exists
3. ✅ Build command includes directory creation
4. ✅ All required environment variables have values
5. ✅ JWT_SECRET is at least 32 characters
6. ✅ CLIENT_ORIGIN matches your deployment URL

## Common Issues & Solutions

### "Environment variable not set" errors
**Solution:** Add all required environment variables to Vercel dashboard

### "Required directory does not exist" errors  
**Solution:** The updated `vercel.json` now creates these automatically

### CORS errors after deployment
**Solution:** Ensure `CLIENT_ORIGIN` exactly matches your Vercel app URL

### Authentication errors
**Solution:** Verify `JWT_SECRET` is set and is at least 32 characters

## Support

If deployment issues persist:
1. Check Vercel deployment logs
2. Run `npm run deployment:check` locally
3. Verify all environment variables are properly set
4. Ensure domain configuration matches your actual deployment URL

The deployment should now work correctly with these configuration changes.