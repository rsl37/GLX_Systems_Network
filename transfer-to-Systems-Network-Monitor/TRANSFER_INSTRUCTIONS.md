# Transfer Instructions

## How to move these files to rsl37/Systems-Network-Monitor

This directory contains the complete CMPLX / Systems Network Monitor codebase,
organized as a standalone repository ready to be pushed to `rsl37/Systems-Network-Monitor`.

### Steps

1. Create the target repo on GitHub (if it doesn't exist):
   ```bash
   gh repo create rsl37/Systems-Network-Monitor --private
   ```

2. Clone the new repo:
   ```bash
   git clone https://github.com/rsl37/Systems-Network-Monitor.git
   cd Systems-Network-Monitor
   ```

3. Copy all files from this transfer directory (excluding this instructions file):
   ```bash
   # From the GLX_Systems_Network repo root:
   cp -r transfer-to-Systems-Network-Monitor/* Systems-Network-Monitor/
   cp transfer-to-Systems-Network-Monitor/.gitignore Systems-Network-Monitor/
   cp -r transfer-to-Systems-Network-Monitor/.github Systems-Network-Monitor/
   ```

4. Commit and push:
   ```bash
   cd Systems-Network-Monitor
   git add -A
   git commit -m "Initial transfer of CMPLX/SNM from GLX_Systems_Network"
   git push -u origin main
   ```

5. (Optional) Delete this transfer directory from GLX_Systems_Network:
   ```bash
   cd ../GLX_Systems_Network
   rm -rf transfer-to-Systems-Network-Monitor
   git add -A
   git commit -m "Remove transferred CMPLX/SNM files"
   git push
   ```

### What was transferred

| Source (GLX_Systems_Network) | Destination (Systems-Network-Monitor) |
|------------------------------|---------------------------------------|
| `CMPLX_App/` | `frontend/` |
| `priority-matrix-app/` | `backend/` |
| `CMPLX_FORK_STRATEGY.md` | `docs/FORK_STRATEGY.md` |
| `DEPLOY_NOW.md` | `docs/DEPLOY.md` (rewritten) |
| `DEPLOYMENT_GUIDE_QUICK.md` | `docs/DEPLOYMENT_GUIDE.md` (rewritten) |
| `vercel-cmplx.json` | `vercel.json` (updated paths) |
| (new) | `README.md` |
| (new) | `.gitignore` |

### References updated
- `package.json` URLs now point to `rsl37/Systems-Network-Monitor`
- Deployment docs rewritten for standalone repo (no GLX references)
- Vercel config paths changed from `CMPLX_App/` to `frontend/`
- Backend package renamed from `glx-systems-monitoring-platform` to `systems-network-monitor`
