---
title: "GLX App Directory Structure"
description: ""
lastUpdated: "2025-12-09"
nextReview: "2026-01-09"
contentType: "documentation"
maintainer: "rsl37"
version: "1.0.0"
tags: []
relatedDocs: []
---

# GLX App Directory Structure

Below is an overview diagram of the GLX App folder structure and main files:

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
│   └── database.sqlite.backup.1752635157668
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

> **Note:**  
> This diagram reflects the structure based on the file/folder listing provided. Additional files/subfolders may exist or be added later.
