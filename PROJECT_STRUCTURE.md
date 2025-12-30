---
title: "GLX Repository Structure"
description: "Portfolio Case Study and Systems Monitoring Platform"
lastUpdated: "2025-12-30"
nextReview: "2026-01-30"
contentType: "documentation"
maintainer: "rsl37"
version: "2.0.0"
tags: ["structure", "portfolio", "monitoring", "architecture"]
relatedDocs: ["PORTFOLIO_CASE_STUDY.md", "README.md", "ABOUT_GLX.md"]
---

# GLX Repository Structure

## Overview

This repository contains both the original GLX civic networking platform (serving as a portfolio case study) and the new Systems Network Monitoring Platform for supply chain, ATC, and logistics operations.

## High-Level Structure

```
GLX_Civic_Networking_App/
├── PORTFOLIO_CASE_STUDY.md         # Comprehensive case study analysis
├── README.md                        # Main project overview
├── ABOUT_GLX.md                     # Project history and evolution
├── whitepaper.md                    # Technical whitepaper
├── GLX_App_files/                   # Original civic networking platform
├── priority-matrix-app/             # Systems Network Monitoring Platform
├── docs/                            # Documentation files
├── scripts/                         # Build and utility scripts
├── mcp-servers/                     # MCP integration servers
└── external/                        # External dependencies
```

---

## Portfolio Case Study (GLX_App_files/)

The original Web3 civic networking platform demonstrating blockchain efficiency and security gains.

### Key Metrics Demonstrated
- **50-80% latency reduction** (<100ms response time)
- **99.9% uptime** through distributed architecture
- **130/100 security score** with post-quantum cryptography
- **40% infrastructure cost savings**

📘 **[Full Case Study](PORTFOLIO_CASE_STUDY.md)**


### GLX_App_files/ Structure

```
GLX_App_files/
├── components.json
├── IMPLEMENTATION_STATUS.md
├── package.json
├── package-lock.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.server.json
├── vite.config.js
├── client/
│   ├── index.html
│   ├── public/
│   │   ├── android-chrome-192x192.png
│   │   ├── android-chrome-512x512.png
│   │   ├── apple-touch-icon.png
│   │   ├── favicon.ico
│   │   ├── favicon.svg
│   │   ├── manifest.json
│   │   ├── site.webmanifest
│   │   └── sw.js             # Service worker for PWA
│   └── src/
│       ├── App.tsx
│       ├── index.css
│       ├── main.tsx
│       ├── global.d.ts       # Global type definitions
│       ├── components/
│       │   ├── AccountSettings.tsx
│       │   ├── AnimatedBackground.tsx
│       │   ├── BottomNavigation.tsx
│       │   ├── ChatInterface.tsx
│       │   ├── CountryCodeSelector.tsx
│       │   ├── EmailVerificationBanner.tsx
│       │   ├── ErrorBoundary.tsx
│       │   ├── LazyMap.tsx
│       │   ├── MediaUpload.tsx
│       │   ├── OpenStreetMap.tsx
│       │   ├── PerformanceMonitor.tsx
│       │   ├── PrivacySettings.tsx
│       │   ├── StablecoinDashboard.tsx
│       │   ├── UserBadges.tsx
│       │   ├── VirtualizedList.tsx
│       │   └── ui/
│       │       ├── alert.tsx
│       │       ├── avatar.tsx
│       │       ├── badge.tsx
│       │       ├── button.tsx
│       │       ├── calendar.tsx
│       │       ├── card.tsx
│       │       ├── checkbox.tsx
│       │       ├── command.tsx
│       │       ├── dialog.tsx
│       │       ├── input.tsx
│       │       ├── label.tsx
│       │       ├── popover.tsx
│       │       ├── progress.tsx
│       │       ├── select.tsx
│       │       ├── slider.tsx
│       │       ├── switch.tsx
│       │       ├── table.tsx
│       │       ├── textarea.tsx
│       │       ├── toggle.tsx
│       │       └── tooltip.tsx
│       ├── contexts/
│       │   └── AuthContext.tsx
│       ├── hooks/
│       │   └── useSocket.ts
│       ├── lib/
│       │   └── utils.ts
│       └── pages/
│           ├── CrisisPage.tsx
│           ├── DashboardPage.tsx
│           ├── EmailVerificationPage.tsx
│           ├── ForgotPasswordPage.tsx
│           ├── GovernancePage.tsx
│           ├── HelpRequestsPage.tsx
│           ├── LoginPage.tsx
│           ├── ProfilePage.tsx
│           ├── RegisterPage.tsx
│           └── ResetPasswordPage.tsx
├── data/
│   ├── uploads/
│   ├── database.sqlite
│   ├── database.sqlite-shm
│   ├── database.sqlite-wal
│   └── database.sqlite.backup.*
├── docs/
│   ├── ADDITIONAL_BUGS_ANALYSIS.md
│   ├── ADVANCED_FEATURES_ASSESSMENT.md
│   ├── BETA_DEPLOYMENT_GUIDE.md
│   ├── COMPREHENSIVE_DEBUG_ANALYSIS.md
│   ├── COMPREHENSIVE_STATUS_ANALYSIS.md
│   ├── DEMOCRATIC_PARTICIPATION_SAFETY_ASSESSMENT.md
│   ├── FEATURE_COMPLETION_STATUS.md
│   ├── GAMIFIED_SOCIAL_NETWORK_ASSESSMENT.md
│   ├── PRE_BETA_CHECKLIST.md
│   ├── SOCIAL_IMPACT_INTEGRATION_ASSESSMENT.md
│   └── TECHNICAL_INTERFACE_DESIGN_ASSESSMENT.md
├── scripts/
│   └── dev.ts
└── server/
    ├── auth.ts
    ├── database-diagnostics.ts
    ├── database.ts
    ├── debug.ts
    ├── email.ts
    ├── index.ts
    ├── missing-endpoints.ts
    ├── socketManager.ts
    ├── startup-check.ts
    ├── static-serve.ts
    └── middleware/
        ├── errorHandler.ts
        ├── rateLimiter.ts
        ├── security.ts
        └── validation.ts
```

---

## Systems Network Monitoring Platform (priority-matrix-app/)

New monitoring system for supply chain, Air Traffic Control, and logistics operations, built on proven GLX architecture.

### Platform Features
- **Real-time monitoring dashboards** for critical infrastructure
- **Supply chain tracking** with blockchain audit trails
- **ATC flight data management** with distributed architecture
- **Logistics optimization** and multi-modal tracking

📊 **[Monitoring Platform Docs](priority-matrix-app/README.md)**

### priority-matrix-app/ Structure

```
priority-matrix-app/
├── README.md                        # Platform documentation
├── Dockerfile                       # Container build instructions
├── docker-compose.yml               # Multi-container orchestration
├── package.json                     # Dependencies and scripts
├── tsconfig.json                    # TypeScript configuration
└── src/
    ├── app.ts                       # Main application with monitoring endpoints
    ├── types/
    │   └── index.ts                 # Type definitions
    ├── monitoring/                  # (Future) Monitoring modules
    │   ├── supply-chain.ts
    │   ├── atc.ts
    │   └── logistics.ts
    ├── dashboard/                   # (Future) Dashboard components
    │   ├── components/
    │   ├── layouts/
    │   └── visualizations/
    └── services/                    # (Future) Core services
        ├── websocket.ts
        ├── blockchain.ts
        └── analytics.ts
```

### API Endpoints

**Health & Status:**
- `GET /health` - System health check
- `GET /api/v1/status` - Overall platform status

**Monitoring Modules:**
- `GET /api/v1/supply-chain` - Supply chain metrics
- `GET /api/v1/atc` - Air traffic control data
- `GET /api/v1/logistics` - Logistics operations
- `GET /api/v1/analytics` - Performance analytics

---

## Documentation Files

### Portfolio & Case Study
- `PORTFOLIO_CASE_STUDY.md` - Comprehensive blockchain efficiency analysis
- `README.md` - Project overview and quick start
- `ABOUT_GLX.md` - Project evolution and current status
- `whitepaper.md` - Technical whitepaper with industry applications

### Development & History
- `DEVELOPMENT_ACTIVITY_HISTORY.md` - Complete development timeline
- `MONTHLY_DEVELOPMENT_METRICS.md` - Performance indicators
- `FISCAL_QUARTER_SUMMARY.md` - Executive summaries
- `CHANGELOG.md` - Version history

### Security & Architecture
- `SECURITY.md` - Security policies and reporting
- `SECURITY_ARCHITECTURE.md` - Architecture documentation
- `POST_QUANTUM_SECURITY_SUMMARY.md` - Cryptography specifications
- `CORS_CONFIGURATION.md` - CORS setup details

### Deployment & Operations
- `DEPLOYMENT.md` - Deployment configuration
- `VERCEL_DEPLOYMENT_COMPLETE.md` - Vercel setup guide
- `GITHUB_VERCEL_INTEGRATION_GUIDE.md` - Integration instructions
- `PRODUCTION_MODE_GUIDE.md` - Production deployment

---

## Supporting Directories

### MCP Servers (mcp-servers/)
GitHub Copilot integration servers for enhanced development:
- `civic-server.js` - Civic networking tools
- `realtime-server.js` - Real-time communication tools
- `social-good-server.js` - Social impact tools
- `database-server.js` - Database operations

### Scripts (scripts/)
Build and utility scripts:
- Environment setup scripts
- Deployment validation tools
- Health check utilities
- Monitoring dashboards

### External (external/)
Third-party dependencies and integrations:
- Resgrid emergency response system
- Additional external modules

---

## Key Technology Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Radix UI** for accessible components
- **Vite** for build optimization

### Backend
- **Node.js** with Express 5
- **Socket.IO** for real-time updates
- **Kysely ORM** for database flexibility
- **JWT** authentication

### Security
- **Post-Quantum Cryptography** (ML-KEM, ML-DSA, SLH-DSA)
- **Multi-factor authentication**
- **Rate limiting** and DDoS protection
- **Blockchain audit trails**

### Deployment
- **Vercel** for production hosting
- **Docker** containerization support
- **GitHub Actions** CI/CD
- **Global CDN** distribution

---

## Getting Started

### Quick Start - Original Platform
```bash
cd GLX_App_files
npm install
npm run build
npm start
```

### Quick Start - Monitoring Platform
```bash
cd priority-matrix-app
npm install
npm run build
npm start
```

### Docker Deployment
```bash
cd priority-matrix-app
docker-compose up -d
```

---

## Industry Applications

### Supply Chain Management
- Real-time shipment tracking
- Inventory management
- Compliance automation
- Predictive analytics

### Air Traffic Control
- Distributed flight data
- Airspace monitoring
- Conflict detection
- System redundancy

### Logistics Operations
- Multi-modal tracking
- Route optimization
- Performance analytics
- Cost management

**Industry Feedback:**
- ✅ Positive response from Delta Airlines
- ✅ Strong interest from logistics professionals
- ✅ Proven architecture for critical infrastructure

---

## Next Steps

1. **Pilot Programs**: Deploy monitoring systems with industry partners
2. **Feature Expansion**: Enhance analytics and predictive capabilities
3. **Integration**: Connect with existing enterprise systems
4. **Scaling**: Expand to additional verticals and regions

---

*GLX: Portfolio case study demonstrating blockchain efficiency for critical infrastructure*
