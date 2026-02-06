# Deploy CMPLX Systems Monitor

## What's Included

### CMPLX (Systems Monitor)
- **Type**: Enterprise systems monitoring app
- **Frontend**: `frontend/`
- **Backend**: `backend/`
- **Features**: Supply chain monitoring, ATC management, COFM visualization

---

## Vercel Dashboard Deployment (Frontend)

1. **Go to Vercel**: https://vercel.com/new

2. **Import Repository**: Select `Systems-Network-Monitor`

3. **Configure CMPLX Project**:
   - **Project Name**: `cmplx-systems-monitor`
   - **Framework Preset**: Other
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist/public`
   - **Install Command**: `npm install`

4. **Environment Variables** (Optional):
   ```
   NODE_ENV=production
   VITE_APP_MODE=cmplx
   ```

5. **Click "Deploy"**

6. **Visit your live CMPLX app**:
   - `https://cmplx-systems-monitor.vercel.app`

---

## Vercel CLI (Alternative)

```bash
npm i -g vercel
vercel login

cd frontend
vercel --prod
# When prompted:
# - Link to existing project? N
# - Project name: cmplx-systems-monitor
# - Directory: ./ (just press Enter)
```

---

## Backend Deployment (Docker)

```bash
cd backend
cp .env.example .env
# Edit .env with your configuration

docker-compose up -d
```

Or without Docker:
```bash
cd backend
npm install
npm run build
npm start
```

---

## Testing Your Deployment

1. Visit your CMPLX URL
2. View Supply Chain network (default)
3. Switch to ATC network
4. Click "View COFM Graph" to see the project visualization
5. Click on nodes to see details

---

## Troubleshooting

### Build Fails
```bash
# Test build locally:
cd frontend
npm install
npm run build
```

### Can't Access Deployed App
- Wait 3-5 minutes for DNS propagation
- Check Vercel deployment logs for errors
- Verify your project built successfully (green checkmark)

---

## What's Next

- [ ] Add real data sources (APIs for supply chain/ATC data)
- [ ] Integrate authentication if needed
- [ ] Connect to enterprise databases
- [ ] Add custom branding/theming
- [ ] Set up production database (PostgreSQL)
- [ ] Configure monitoring alerts

---

## Need Help?

- **Vercel Docs**: https://vercel.com/docs
- **Frontend Guide**: See `frontend/README.md`
- **Backend Guide**: See `backend/README.md`
- **Deployment Logs**: Check Vercel Dashboard > Deployments > View Function Logs
