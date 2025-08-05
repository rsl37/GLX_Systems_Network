---
title: "GLX: Web3 Civic Networking Platform"
description: ""
lastUpdated: "2025-08-03"
nextReview: "2025-09-03"
contentType: "archive"
maintainer: "GLX Development Team"
version: "1.0.0"
tags: []
relatedDocs: []
---

# GLX: Web3 Civic Networking Platform

[![CI/CD Pipeline](https://github.com/rsl37/GLX_Civic_Networking_App/workflows/CI%2FCD%20Pipeline/badge.svg)](https://github.com/rsl37/GLX_Civic_Networking_App/actions/workflows/main.yml)
[![Security Checks](https://github.com/rsl37/GLX_Civic_Networking_App/workflows/Security%20Checks/badge.svg)](https://github.com/rsl37/GLX_Civic_Networking_App/actions/workflows/security-streamlined.yml)
[![Code Quality](https://github.com/rsl37/GLX_Civic_Networking_App/workflows/Code%20Quality/badge.svg)](https://github.com/rsl37/GLX_Civic_Networking_App/actions/workflows/quality.yml)

**GLX** is a next-generation web3-enabled civic networking platform that empowers communities to connect, organize, and collaborate for social good through real-time help requests, skill-based matching, and democratic governance.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20.x or later
- npm or yarn package manager

### Installation
```bash
# Clone the repository
git clone https://github.com/rsl37/GLX_Civic_Networking_App.git
cd GLX_Civic_Networking_App/GLX_App_files

# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

### Testing
```bash
# Run all tests
npm test

# Run E2E tests
npm run test:e2e

# Run with coverage
npm run test:coverage
```

---

## 🏗️ Project Structure

```
GLX_App_files/
├── client/                    # React frontend application
│   ├── src/                   # Source code
│   │   ├── components/        # React components
│   │   ├── pages/            # Page components
│   │   ├── hooks/            # Custom React hooks
│   │   └── utils/            # Utility functions
│   └── public/               # Static assets
├── server/                   # Express.js backend
│   ├── api/                  # API routes
│   ├── middleware/           # Express middleware
│   ├── models/              # Database models
│   └── utils/               # Server utilities
├── docs/                    # Technical documentation
├── tests/                   # Test suites
└── scripts/                 # Build and utility scripts
```

---

## ✨ Key Features

- **🌐 Real-time Communication**: WebSocket-based chat and notifications
- **🗺️ Location Services**: Google Maps integration for local connections
- **🔐 Secure Authentication**: JWT-based auth with optional 2FA
- **📱 Responsive Design**: Mobile-first UI with Tailwind CSS
- **⚡ Fast Performance**: Vite build system and optimized bundles
- **🧪 Comprehensive Testing**: Unit, integration, and E2E tests
- **🚀 CI/CD Ready**: Automated workflows and Vercel deployment

---

## 📖 Documentation

- [About GLX](ABOUT_GLX.md) - Project overview and mission
- [Project Structure](PROJECT_STRUCTURE.md) - Detailed directory structure
- [Security Information](SECURITY.md) - Security policies and reporting
- [Privacy & Badges](PRIVACY_AND_BADGES_IMPLEMENTATION.md) - Implementation details
- [Workspace Guide](GLX_Project_Workspace.md) - Development workspace setup

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the PolyForm Shield License 1.0.0 - see the [LICENSE](LICENSE) file for details.

---

## 🔗 Links

- **Live Demo**: [glxcivicnetwork.me](https://glxcivicnetwork.me)
- **Documentation**: [Project Docs](docs/)
- **Issues**: [GitHub Issues](https://github.com/rsl37/GLX_Civic_Networking_App/issues)

---

*Building stronger communities through technology* 🌟
│       │   ├── MediaUpload.tsx
│       │   ├── OpenStreetMap.tsx
│       │   └── ui/
│       ├── contexts/
│       ├── hooks/
│       ├── lib/
│       └── pages/
├── data/                         # Database and uploads
│   ├── uploads/
│   ├── database.sqlite
│   └── ...
├── docs/                         # Detailed documentation and assessments
│   ├── SOCIAL_IMPACT_INTEGRATION_ASSESSMENT.md
│   ├── TECHNICAL_INTERFACE_DESIGN_ASSESSMENT.md
│   └── (other .md docs)
├── scripts/
│   └── dev.ts
└── server/                       # Backend API, WebSockets, DB
    ├── auth.ts
    ├── database.ts
    ├── index.ts
    ├── (other .ts files)
    └── middleware/
```

---

## 📑 Key Documentation

- [`PROJECT_STRUCTURE.md`](PROJECT_STRUCTURE.md)  
  *Complete directory tree and file/folder explanations.*

- [`SOCIAL_IMPACT_INTEGRATION_ASSESSMENT.md`](GLX_App_files/docs/SOCIAL_IMPACT_INTEGRATION_ASSESSMENT.md)  
  *Analysis of social features, feedback systems, reputation, and gamification.*

- [`TECHNICAL_INTERFACE_DESIGN_ASSESSMENT.md`](GLX_App_files/docs/TECHNICAL_INTERFACE_DESIGN_ASSESSMENT.md)  
  *Technical UI/UX, real-time architecture, accessibility, and recommendations.*

- [`IMPLEMENTATION_STATUS.md`](GLX_App_files/IMPLEMENTATION_STATUS.md)  
  *Progress report, missing features, and action priorities.*

---

## 🚀 How To Use This Workspace

1. **Install dependencies:**  
   ```bash
   npm install
   ```

2. **Run the development server:**  
   ```bash
   npm run start
   ```

3. **Open the app:**  
   Navigate to [http://localhost:3000](http://localhost:3000)

4. **Explore the codebase:**  
   - Frontend: `client/src/`
   - Backend/API: `server/`
   - Database: `data/`
   - Docs: `docs/`

---

## 🛠️ Features & Roadmap

- **Mobile-first, responsive UI**
- **Real-time help requests and chat** (Socket.IO)
- **Skill & interest-based matching**
- **Reputation and badge system**
- **Trust and rating networks**
- **Event and group organization**
- **Democratic governance mechanisms**
- **Web3/crypto identity integration (planned)**
- **Accessibility and internationalization (in progress)**

See [`IMPLEMENTATION_STATUS.md`](GLX_App_files/IMPLEMENTATION_STATUS.md) for priorities and remaining tasks.

---

## 🧑‍💻 Contributing

1. Fork this repo and create a new branch.
2. Add your changes or new features.
3. Submit a pull request with a detailed description.

### 🔍 Merge Conflict Detection

Use our conflict detection script to check for unmerged files:

```bash
./scripts/check-conflicts.sh
```

This script will:
- ✅ Check for unmerged files (`git ls-files -u`)
- ✅ Scan for conflict markers in source code  
- ✅ Verify build system functionality
- ✅ Provide summary of repository health

For detailed analysis, see [`MERGE_CONFLICT_STATUS_REPORT.md`](MERGE_CONFLICT_STATUS_REPORT.md).

---

## 📜 License

This project is licensed under the **PolyForm Shield License 1.0.0**.  
See the [LICENSE](LICENSE) file for complete terms and conditions.

The PolyForm Shield license allows for broad usage while protecting against direct competition with the software.

---

## 👩‍🚀 Authors & Contact

- **Product Owner:** rsl37
- **Copilot Assistant:** GitHub Copilot

---

## 🚀 Deployment & Hosting

### Production Hosting Transition
The GLX Civic Networking App has transitioned from its prototype hosting environment to production:

- **Prototype Phase**: Initially developed and tested using instance.so/build
- **Production Phase**: Now hosted on **Vercel** for optimal performance, scalability, and reliability

This transition enables enhanced features including:
- Improved SSL/TLS security
- Global CDN distribution
- Automatic deployments from GitHub
- Enhanced performance monitoring

### Custom Domain SSL Setup
If you're experiencing SSL errors with the custom domain, refer to our comprehensive guide:

- **[Vercel Domain Setup Guide](GLX_App_files/docs/VERCEL_DOMAIN_SETUP.md)** - Complete SSL and domain configuration for Vercel

### Common SSL Issues
The `ERR_SSL_PROTOCOL_ERROR` on custom domains is typically caused by:
- Incomplete domain verification in Vercel
- DNS records not properly configured
- SSL certificate still being issued

See the domain setup guide for step-by-step resolution.

## 🔒 Network & Firewall Configuration

This repository requires access to various external services for proper operation. If you are experiencing connectivity issues behind a corporate firewall or restrictive network, please refer to our comprehensive firewall documentation:

- **[FIREWALL_CONFIGURATION.md](FIREWALL_CONFIGURATION.md)** - Complete firewall allowlist and network requirements
- **[GITHUB_SERVICES_FIREWALL.md](GITHUB_SERVICES_FIREWALL.md)** - Detailed GitHub services and endpoints

### Quick Firewall Fix
For immediate access, ensure these domains are allowlisted:
```
github.com, *.github.com, *.githubusercontent.com
registry.npmjs.org, *.npmjs.org
*.tile.openstreetmap.org
cdnjs.cloudflare.com
```

---

## 🔗 Notes

- This workspace was generated by GitHub Copilot using a series of detailed design, assessment, and planning chats.
- For the full history and design rationale, see the chat logs and included documentation.

---
