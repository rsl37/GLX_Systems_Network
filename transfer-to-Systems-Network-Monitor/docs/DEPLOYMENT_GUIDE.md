# Deployment Guide - CMPLX Systems Monitor

## Overview
Deploy CMPLX (Enterprise Systems Monitor) from the Systems-Network-Monitor repository.

## Prerequisites
- Vercel account (free tier works)
- GitHub account connected to Vercel
- Node.js 20.x+ (backend), Node.js 24.x (frontend)

---

## Option 1: Deploy via Vercel Dashboard (Frontend)

1. **Go to Vercel Dashboard**: https://vercel.com/new
2. **Import Git Repository**: Select `Systems-Network-Monitor`
3. **Configure Project**:
   - **Project Name**: `cmplx-systems-monitor`
   - **Framework Preset**: Other
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist/public`
   - **Install Command**: `npm install`

4. **Environment Variables**:
   ```
   NODE_ENV=production
   VITE_APP_MODE=cmplx
   ```

5. **Deploy** - Click "Deploy" button

---

## Option 2: Deploy via Vercel CLI (Frontend)

```bash
npm i -g vercel
vercel login

cd frontend
vercel --prod
# Follow prompts:
# - Project name: cmplx-systems-monitor
```

---

## Backend Deployment

### Docker
```bash
cd backend
cp .env.example .env
# Configure environment variables
docker-compose up -d
```

### Manual
```bash
cd backend
npm install
npm run build
npm start
```

---

## After Deployment

### Testing CMPLX
- Visit: `https://cmplx-systems-monitor.vercel.app` (or your custom domain)
- Test: Supply Chain view, ATC view, COFM visualization
- Click on nodes to see details and diagnostics

---

## Need Help?

- **Vercel Issues**: Check Vercel logs in dashboard
- **Build Errors**: Run `npm run build` locally in `frontend/` first
- **Environment Variables**: Double-check all required vars are set
- **Backend Issues**: Check Docker logs or `backend/logs/`
