# Quick Deployment Guide - GLX & CMPLX

## Overview
Deploy both GLX (Civic App) and CMPLX (Enterprise Monitor) from the same repo to separate Vercel projects.

## Prerequisites
- Vercel account (free tier works)
- GitHub account connected to Vercel
- This branch pushed to GitHub

---

## Option 1: Deploy via Vercel Dashboard (Easiest - 15 min total)

### Deploy GLX (Civic App)

1. **Go to Vercel Dashboard**: https://vercel.com/new
2. **Import Git Repository**: Select `GLX_Systems_Network`
3. **Configure Project**:
   - **Project Name**: `glx-civic-app`
   - **Framework Preset**: Other
   - **Root Directory**: `./`
   - **Build Command**: `cd GLX_App_files && npm install && npm run build`
   - **Output Directory**: `GLX_App_files/dist/public`
   - **Install Command**: `cd GLX_App_files && npm install --include=dev`

4. **Environment Variables** (Add these):
   ```
   NODE_ENV=production
   DATABASE_URL=your_database_url (if needed)
   JWT_SECRET=your_jwt_secret
   ```

5. **Deploy** - Click "Deploy" button

### Deploy CMPLX (Enterprise Monitor)

1. **Go to Vercel Dashboard**: https://vercel.com/new
2. **Import Same Repository**: Select `GLX_Systems_Network` again
3. **Configure Project**:
   - **Project Name**: `cmplx-systems-monitor`
   - **Framework Preset**: Other
   - **Root Directory**: `./`
   - **Build Command**: `cd CMPLX_App && npm install && npm run build`
   - **Output Directory**: `CMPLX_App/dist/public`
   - **Install Command**: `cd CMPLX_App && npm install --include=dev`

4. **Environment Variables**:
   ```
   NODE_ENV=production
   VITE_APP_MODE=cmplx
   ```

5. **Deploy** - Click "Deploy" button

---

## Option 2: Deploy via Vercel CLI (Fastest - 5 min)

### Install Vercel CLI
```bash
npm i -g vercel
vercel login
```

### Deploy GLX
```bash
cd GLX_App_files
vercel --prod
# Follow prompts:
# - Set up and deploy? Y
# - Link to existing project? N
# - Project name: glx-civic-app
# - Directory: ./ (current directory)
```

### Deploy CMPLX
```bash
cd ../CMPLX_App
vercel --prod
# Follow prompts:
# - Project name: cmplx-systems-monitor
```

---

## What I'm Creating Now

I'm setting up:
1. ✅ Separate `CMPLX_App` directory with standalone build
2. ✅ Dedicated `vercel-cmplx.json` configuration
3. ✅ CMPLX-specific package.json
4. ✅ Updated GLX to be purely civic-focused

---

## After Deployment

### Testing GLX
- Visit: `https://glx-civic-app.vercel.app` (or your custom domain)
- Test: User registration, login, civic networking features

### Testing CMPLX
- Visit: `https://cmplx-systems-monitor.vercel.app` (or your custom domain)
- Test: Supply Chain view, ATC view, COFM visualization

---

## Optional: Separate Repos (Later)

Once both are deployed and tested, we can:
1. Create new repo: `CMPLX_Systems_Monitor`
2. Move CMPLX_App files there
3. Update deployment to point to new repo
4. Keep GLX in current repo

---

## Need Help?

- **Vercel Issues**: Check Vercel logs in dashboard
- **Build Errors**: Run `npm run build` locally first
- **Environment Variables**: Double-check all required vars are set

**Estimated Total Time**: 15-30 minutes for both deployments
