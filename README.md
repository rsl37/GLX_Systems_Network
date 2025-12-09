---
title: "GLX: Connect the World - Web3 Civic Networking Platform"
description: ""
lastUpdated: "2025-12-09"
nextReview: "2026-01-09"
contentType: "overview"
maintainer: "rsl37"
version: "1.0.0"
tags: []
relatedDocs: []
---

# GLX: Connect the World - Web3 Civic Networking Platform

[![CI/CD Pipeline](https://github.com/rsl37/GLX_Civic_Networking_App/workflows/CI%2FCD%20Pipeline/badge.svg)](https://github.com/rsl37/GLX_Civic_Networking_App/actions/workflows/main.yml)
[![Security Checks](https://github.com/rsl37/GLX_Civic_Networking_App/workflows/Security%20Scan/badge.svg)](https://github.com/rsl37/GLX_Civic_Networking_App/actions/workflows/security-streamlined.yml)
[![Code Quality](https://github.com/rsl37/GLX_Civic_Networking_App/workflows/Quality%20%26%20Performance/badge.svg)](https://github.com/rsl37/GLX_Civic_Networking_App/actions/workflows/quality.yml)
[![Workflow Health](https://github.com/rsl37/GLX_Civic_Networking_App/workflows/Workflow%20Health%20Monitor/badge.svg)](https://github.com/rsl37/GLX_Civic_Networking_App/actions/workflows/workflow-monitor.yml)
[![Codecov](https://codecov.io/gh/rsl37/GLX_Civic_Networking_App/branch/main/graph/badge.svg)](https://codecov.io/gh/rsl37/GLX_Civic_Networking_App)

**GLX** (Global Liquid eXchange / Global Link eXchange) is a next-generation Web3-enabled civic networking platform that empowers communities to connect, organize, and collaborate for social good through real-time help requests, skill-based matching, and democratic governance. Currently in active development with production deployment capabilities.

**GLX Civic Network: Connect the World** - Building stronger communities through technology and secure civic engagement.

---

## 🚀 Quick Start

### GitHub Codespaces (Recommended)
The easiest way to get started is using GitHub Codespaces. The repository includes a pre-configured development container that automatically sets up your environment with all required tools:

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://github.com/rsl37/GLX_Civic_Networking_App/codespaces)

**What's included:**
- Node.js 20.x pre-installed
- pnpm package manager configured
- Vercel CLI ready to use
- VS Code extensions (ESLint, Prettier, GitHub Copilot)
- Automatic port forwarding for development

Once the Codespace is created, you can immediately start using:
```bash
vercel --prod    # Deploy to production
npm run build    # Build the application
npm start        # Start development server
```

### Local Development

#### Prerequisites
- Node.js 20.x or later
- npm or yarn package manager

#### Installation
```bash
# Clone the repository
git clone https://github.com/rsl37/GLX_Civic_Networking_App.git
cd GLX_Civic_Networking_App

# Option 1: Run commands from root directory (recommended)
npm run setup              # Install dependencies
npm run setup:env          # Set up environment variables (.env files)
npm run test:env           # Test environment configuration
npm run deployment:check   # Check deployment readiness
npm run build              # Build the application
npm start                  # Start development server

# Additional commands available from root:
npm run setup:env           # Set up environment variables (.env files)
npm run test               # Run all tests
npm run test:api           # Run API tests
npm run test:socket        # Run Socket.IO tests  
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Run tests with coverage
npm run test:ui            # Run tests with UI
npm run test:e2e           # Run end-to-end tests
npm run test:env           # Test environment configuration
npm run health:log         # Run health and location logging
npm run branch:analyze     # Analyze branch status
npm run logs:all           # Run all logging scripts
npm run dashboard          # Run monitoring dashboard
npm run monitor:full       # Full monitoring suite

# Option 2: Run commands from app directory
cd GLX_App_files
npm install
npm run deployment:check   # Check deployment readiness
npm run build              # Build the application
npm start                  # Start development server

# Production setup
npm run production:setup

# Build for production
npm run build:production
```

### Testing
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:api           # API endpoint tests
npm run test:security      # Security-focused tests
npm run test:socket        # WebSocket/real-time tests
npm run test:e2e           # End-to-end tests with Playwright

# Test with coverage and monitoring
npm run test:coverage      # Generate test coverage reports
npm run test:watch         # Run tests in watch mode
npm run test:ui            # Run tests with UI dashboard

# Production and deployment validation
npm run deployment:check   # Check deployment readiness
npm run production:check   # Validate production configuration
npm run test:env           # Test environment configuration
```

### Code Quality & Linting
```bash
# Code linting and formatting (from GLX_App_files directory)
cd GLX_App_files

# Lint code for quality issues
npm run lint              # Check for linting issues
npm run lint:fix          # Auto-fix linting issues where possible

# Format code consistently
npm run format            # Format all files with Prettier
npm run format:check      # Check if files are formatted correctly

# Combined quality check
npm run lint && npm run format:check
```

---

## 🔒 Security

GLX implements comprehensive security measures to protect against current and emerging threats, including zero-day vulnerabilities.

### Security Features

#### WebSocket Security
- **WSS (WebSocket Secure)** encryption for all real-time communications
- **Rate limiting** for connections and messages
- **Cross-Site WebSocket Hijacking (CSWH)** protection
- **Input validation** and sanitization for all messages
- **Authentication tokens** for WebSocket connections

#### AI/MCP Security
- **Prompt injection detection** to prevent AI manipulation
- **Model integrity verification** with cryptographic signatures
- **AI audit logging** for suspicious activity monitoring
- **Input/output sanitization** for AI interactions
- **Rate limiting** for AI requests

#### Web3 Security
- **Smart contract validation** before deployment
- **Transaction monitoring** for governance systems
- **Multi-signature wallet support** for community funds
- **Post-quantum cryptography** for future-proofing
- **Real-time blockchain monitoring**

#### Infrastructure Security
- **JWT authentication** with secure token management
- **Password hashing** with bcrypt
- **Security headers** with Helmet.js
- **CORS protection** for API endpoints
- **Dependency scanning** with automated updates

### Security Testing

Run security tests to validate implementations:

```bash
# WebSocket security tests
npm run test:security -- websocket-security

# AI security tests  
npm run test:security -- ai-security

# Full security audit
npm run security:audit
```

### Reporting Security Issues

Report security vulnerabilities through [GitHub Security Advisories](https://github.com/rsl37/GLX_Civic_Networking_App/security/advisories/new).

**Please do not report security vulnerabilities in public issues.**

---

## 🏗️ Project Structure

```
GLX_App_files/
├── client/                    # React frontend application
│   ├── src/                   # Source code
│   │   ├── components/        # React components (UI, forms, etc.)
│   │   ├── pages/            # Page components (auth, dashboard, etc.)
│   │   ├── hooks/            # Custom React hooks
│   │   ├── contexts/         # React context providers
│   │   └── lib/              # Utility functions and helpers
│   └── public/               # Static assets and PWA files
├── server/                   # Node.js/Express backend
│   ├── routes/               # API route handlers
│   ├── middleware/           # Express middleware (security, auth, etc.)
│   ├── stablecoin/          # Web3 stablecoin integration
│   └── utils/               # Server utilities and helpers
├── tests/                   # Test suites
│   ├── api/                 # API endpoint tests
│   ├── security/            # Security-focused tests
│   ├── socket/              # WebSocket tests
│   └── deployment/          # Deployment validation tests
├── scripts/                 # Build and utility scripts
├── docs/                    # Technical documentation
└── e2e/                     # End-to-end tests with Playwright
```

---

## ✨ Key Features

### Core Platform Features
- **🌐 Real-time Communication**: WebSocket-based chat and notifications with WSS encryption
- **🔐 Advanced Authentication**: JWT-based auth with optional 2FA/TOTP support
- **📱 Complete Verification System**: Email, phone, and KYC document verification
- **🗺️ Location Services**: Google Maps integration for local community connections
- **📱 Responsive Design**: Mobile-first UI with Tailwind CSS and Radix UI components
- **⚡ Fast Performance**: Vite build system with optimized bundles

### Security & Enterprise Features  
- **🛡️ Post-Quantum Security**: NIST-standard cryptography (ML-KEM, ML-DSA, SLH-DSA)
- **🔒 WebSocket Security**: Rate limiting, input validation, and CSWH protection
- **🤖 AI/MCP Security**: Prompt injection protection and secure AI integrations
- **🌐 Web3 Integration**: Blockchain governance and stablecoin transactions
- **🚀 Production Ready**: Automated deployment with comprehensive security headers

### Development & Testing
- **🧪 Comprehensive Testing**: Unit, integration, security, and E2E tests with Vitest and Playwright
- **📊 Monitoring**: Real-time performance monitoring and health checks
- **🚀 CI/CD Ready**: Automated workflows and Vercel deployment
- **🤖 MCP Integration**: GitHub Copilot integration with custom civic networking tools

---

## 📅 Project Timeline & Milestones

### 🏆 Completed Milestones

#### Phase 1: Foundation (Q2 2025)
- ✅ **Core Platform Development** - Basic app structure, authentication, and UI components
- ✅ **Real-time Communication** - WebSocket implementation with Socket.IO
- ✅ **Security Foundation** - JWT authentication, input validation, security headers
- ✅ **Testing Infrastructure** - Comprehensive test suites (unit, integration, E2E)

#### Phase 2: Security & Production (Q3 2025 - Current)
- ✅ **Advanced Authentication** - Email verification, phone verification, 2FA/TOTP
- ✅ **KYC Implementation** - Document verification system for compliance
- ✅ **Post-Quantum Security** - NIST-standard quantum-resistant cryptography
- ✅ **Production Deployment** - Automated setup, Vercel deployment, monitoring
- ✅ **WebSocket Security** - Rate limiting, CSWSH protection, message validation
- ✅ **AI/MCP Integration** - GitHub Copilot tools, prompt injection protection

### 🚧 Current Development (Q3 2025)

#### Phase 3: Platform Enhancement
- 🔄 **Frontend Security Audit** - Comprehensive client-side security review
- 🔄 **Enhanced User Experience** - UI/UX improvements and accessibility features
- 🔄 **Community Features** - Advanced civic networking and collaboration tools
- 🔄 **Performance Optimization** - Code splitting, caching, and load balancing

### 🎯 Upcoming Milestones

#### Phase 4: Advanced Features (Q3 - Q4 2025)
- 📋 **Blockchain Governance** - Community voting and decision-making systems
- 📋 **Crisis Management** - Emergency response and coordination features
- 📋 **Skill Matching** - AI-powered community skill discovery and matching
- 📋 **Mobile Applications** - Native iOS and Android app development

#### Phase 5: Scale & Innovation (2026)
- 📋 **Multi-Community Support** - Support for multiple civic communities
- 📋 **Advanced Analytics** - Community insights and impact measurement
- 📋 **Integration Ecosystem** - APIs for third-party civic tools
- 📋 **Quantum-Native Features** - Full quantum cryptography implementation

### 🎯 Key Metrics & Goals

**Current Status (August 2025):**
- 🔒 **Security Score**: 130/100 (Quantum-Safe Level)
- 🧪 **Test Coverage**: 85%+ across core modules
- ⚡ **Performance**: <2s initial load, <100ms API response
- 🚀 **Deployment**: Automated with 99.9% uptime target

**2025-2026 Goals:**
- 👥 **Community Readiness**: Support for 1,000+ active users
- 🌍 **Geographic Expansion**: Multi-region deployment
- 📱 **Mobile Adoption**: Native apps in app stores
- 🤝 **Partnership Integration**: Civic organizations and local governments

---

## 🔑 GitHub Actions Authentication

This repository uses secure PAT_TOKEN authentication for enhanced workflow capabilities:

### Security Features
- 🔒 **Fine-grained permissions** (least privilege principle)
- 🔒 **90-day token rotation** schedule with automated monitoring
- 🔒 **Environment protection rules** for sensitive operations
- 🔒 **Comprehensive audit logging** without credential exposure
- 🔒 **Zero token exposure** in logs or artifacts
- 🔒 **Graceful fallback mechanisms** to GITHUB_TOKEN when needed

### Enhanced Capabilities
- ✅ **Private repository access** during checkout operations
- ✅ **Cross-repository operations** for dependencies and integrations
- ✅ **Submodule initialization** with recursive checkout support
- ✅ **Extended API operations** requiring elevated permissions

### Implementation
- **Token Storage**: Securely stored in repository secrets
- **Environment Protection**: Multi-tier approval workflows
- **Security Monitoring**: Automated PAT usage auditing every 6 hours
- **Incident Response**: Immediate revocation procedures with fallback activation

**📚 Complete Guide**: See [PAT Security Implementation Guide](docs/PAT_SECURITY_GUIDE.md) for detailed setup and security procedures.

---

## 📖 Documentation

### Core Documentation
- [About GLX](ABOUT_GLX.md) - Project overview and mission
- [Project Structure](PROJECT_STRUCTURE.md) - Detailed directory structure
- [Production Mode Guide](GLX_App_files/PRODUCTION_MODE_GUIDE.md) - Production deployment setup
- [Deployment Configuration](DEPLOYMENT.md) - Deployment troubleshooting
- [Security Information](SECURITY.md) - Security policies and reporting
- [PAT Security Guide](docs/PAT_SECURITY_GUIDE.md) - PAT_TOKEN authentication and security
- [Privacy & Badges](PRIVACY_AND_BADGES_IMPLEMENTATION.md) - Implementation details
- [Workspace Guide](GLX_Project_Workspace.md) - Development workspace setup
- [MCP Setup Guide](MCP_SETUP_GUIDE.md) - GitHub Copilot MCP configuration

### Development History & Planning
- [Development Activity History](DEVELOPMENT_ACTIVITY_HISTORY.md) - Complete development timeline organized by month
- [Monthly Development Metrics](MONTHLY_DEVELOPMENT_METRICS.md) - Detailed monthly breakdown and performance indicators
- [Fiscal Quarter Summary](FISCAL_QUARTER_SUMMARY.md) - Executive summary for fiscal quarter planning and milestone assessment
- [Beta Launch Roadmap](docs/BETA_LAUNCH_ROADMAP.md) - 4-Week Phase 1 Beta Launch Roadmap with Phase 2 & 3 outlines

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
- **Production Guide**: [Production Setup](GLX_App_files/PRODUCTION_MODE_GUIDE.md)
- **Issues**: [GitHub Issues](https://github.com/rsl37/GLX_Civic_Networking_App/issues)

---

*Building stronger communities through technology. Connect the World.* 🌟
