# 🚀 Deploy GLX & CMPLX - Quick Start Guide

**Time to Deploy: 10-15 minutes total**

Both apps are ready to deploy from this repository to separate Vercel projects!

---

## ✅ What's Ready

### GLX (Global Liquid Exchange)
- **Type**: Civic networking + monetary rail infrastructure app
- **Location**: `GLX_App_files/`
- **Status**: ✅ Build tested, production-ready
- **Features**: User auth, civic networking, governance, stablecoin (CROWDS design)

### CMPLX (Systems Monitor)
- **Type**: Enterprise systems monitoring app
- **Location**: `CMPLX_App/`
- **Status**: ✅ Build tested, standalone app
- **Features**: Supply chain monitoring, ATC management, COFM visualization

---

## 🎯 Fastest Deployment Method (Vercel Dashboard)

### Step 1: Deploy GLX (5 minutes)

1. **Push to GitHub first**:
   ```bash
   git add .
   git commit -m "Separate GLX and CMPLX into deployable apps"
   git push -u origin claude/crowds-design-docs-R7eOb
   ```

2. **Go to Vercel**: https://vercel.com/new

3. **Import Repository**: Select `GLX_Systems_Network`

4. **Configure GLX Project**:
   - **Project Name**: `glx-civic-network`
   - **Framework Preset**: Other
   - **Root Directory**: Leave as `./`
   - **Build Command**: `cd GLX_App_files && npm install && npm run build`
   - **Output Directory**: `GLX_App_files/dist/public`
   - **Install Command**: `cd GLX_App_files && npm install --include=dev`

5. **Environment Variables** (Click "Add"):
   ```
   NODE_ENV=production
   JWT_SECRET=your-super-secret-jwt-key-change-this
   DATABASE_URL=your-database-url-or-leave-blank
   ```
   *Note: For testing, you can skip environment variables initially*

6. **Click "Deploy"** 🚀

7. **Wait ~2-3 minutes** for deployment to complete

8. **Visit your live GLX app!** You'll get a URL like:
   - `https://glx-civic-network.vercel.app`
   - Or custom domain if configured

---

### Step 2: Deploy CMPLX (5 minutes)

1. **Go to Vercel again**: https://vercel.com/new

2. **Import SAME Repository**: Select `GLX_Systems_Network` again
   - ✅ You can deploy multiple projects from one repo!

3. **Configure CMPLX Project**:
   - **Project Name**: `cmplx-systems-monitor`
   - **Framework Preset**: Other
   - **Root Directory**: `CMPLX_App`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist/public`
   - **Install Command**: `npm install`

4. **Environment Variables** (Optional):
   ```
   NODE_ENV=production
   VITE_APP_MODE=cmplx
   ```

5. **Click "Deploy"** 🚀

6. **Wait ~2-3 minutes** for deployment

7. **Visit your live CMPLX app!** You'll get:
   - `https://cmplx-systems-monitor.vercel.app`

---

## ⚡ Alternative: Vercel CLI (Faster if you're comfortable with CLI)

### Install Vercel CLI
```bash
npm i -g vercel
vercel login
```

### Deploy Both Apps

```bash
# Deploy GLX
cd GLX_App_files
vercel --prod
# When prompted:
# - Link to existing project? N
# - Project name: glx-civic-network
# - Directory: ./ (just press Enter)

# Deploy CMPLX
cd ../CMPLX_App
vercel --prod
# When prompted:
# - Link to existing project? N
# - Project name: cmplx-systems-monitor
# - Directory: ./ (just press Enter)
```

**Done! Both deployed in 5 minutes!** ✨

---

## 🧪 Testing Your Deployments

### Test GLX
1. Visit your GLX URL
2. Click "Register"
3. Create a test account
4. Explore dashboard, help requests, governance features

### Test CMPLX
1. Visit your CMPLX URL
2. View Supply Chain network (default)
3. Switch to ATC network
4. Click "View COFM Graph" to see the project visualization
5. Click on nodes to see details

---

## 🔄 Future Updates

After deploying, any push to your branch will auto-deploy:

```bash
# Make changes to GLX
cd GLX_App_files/client/src
# Edit files...

# Commit and push
git add .
git commit -m "Update GLX features"
git push

# Vercel auto-deploys GLX within 2-3 minutes!
```

Same process for CMPLX!

---

## 🎨 Custom Domains (Optional)

Once deployed, you can add custom domains:

1. **In Vercel Dashboard**:
   - Go to your project
   - Settings → Domains
   - Add domain (e.g., `glx.yourdomain.com`)

2. **Update DNS** at your domain provider:
   - Add CNAME record pointing to Vercel

---

## 📊 Monitoring & Analytics

Both apps have Vercel Analytics built-in:

- **GLX**: Track user sign-ups, page views, engagement
- **CMPLX**: Monitor system monitoring usage, COFM views

Access in Vercel Dashboard → Analytics tab

---

## 🚨 Troubleshooting

### Build Fails for GLX
```bash
# Test build locally first:
cd GLX_App_files
npm install
npm run build

# If successful locally, check Vercel environment variables
```

### Build Fails for CMPLX
```bash
# Test build locally:
cd CMPLX_App
npm install
npm run build

# If successful, double-check Vercel root directory is set to "CMPLX_App"
```

### Can't Access Deployed App
- Wait 3-5 minutes for DNS propagation
- Check Vercel deployment logs for errors
- Verify your project built successfully (green checkmark)

---

## 📦 What's Next?

### For GLX:
- [ ] Set up production database (PostgreSQL on Railway/Supabase)
- [ ] Configure email service (SendGrid/Resend)
- [ ] Add Google Maps API key for location features
- [ ] Set up OAuth providers (Google, GitHub)

### For CMPLX:
- [ ] Add real data sources (APIs for supply chain/ATC data)
- [ ] Integrate authentication if needed
- [ ] Connect to enterprise databases
- [ ] Add custom branding/theming

### Optional: Separate Repos

Once deployed and tested, you can split into separate repositories:

```bash
# 1. Create new repo: CMPLX_Systems_Monitor
# 2. Move CMPLX_App files to new repo
# 3. Update Vercel to point to new repo
# 4. Keep GLX in current repo
```

---

## ✨ You're Done!

You now have:
- ✅ **GLX** deployed and user-testable
- ✅ **CMPLX** deployed and user-testable
- ✅ Auto-deployment on git push
- ✅ Separate apps, separate URLs
- ✅ Production-ready hosting

**Share your deployment URLs and start testing!** 🎉

---

## 🆘 Need Help?

- **Vercel Docs**: https://vercel.com/docs
- **GLX Issues**: See `GLX_App_files/docs/` for detailed documentation
- **CMPLX Guide**: See `CMPLX_App/README.md`
- **Deployment Logs**: Check Vercel Dashboard → Deployments → View Function Logs

---

**Estimated Total Time**: 10-15 minutes for both deployments ⚡
