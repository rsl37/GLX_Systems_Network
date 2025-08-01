# GALAX: Web3 Civic Networking Platform

[![CI/CD Pipeline](https://github.com/rsl37/GALAX_Civic_Networking_App/workflows/CI%2FCD%20Pipeline/badge.svg)](https://github.com/rsl37/GALAX_Civic_Networking_App/actions/workflows/main.yml)
[![Security Checks](https://github.com/rsl37/GALAX_Civic_Networking_App/workflows/Security%20Scan/badge.svg)](https://github.com/rsl37/GALAX_Civic_Networking_App/actions/workflows/security-streamlined.yml)
[![Code Quality](https://github.com/rsl37/GALAX_Civic_Networking_App/workflows/Quality%20%26%20Performance/badge.svg)](https://github.com/rsl37/GALAX_Civic_Networking_App/actions/workflows/quality.yml)
[![Workflow Health](https://github.com/rsl37/GALAX_Civic_Networking_App/workflows/Workflow%20Health%20Monitor/badge.svg)](https://github.com/rsl37/GALAX_Civic_Networking_App/actions/workflows/workflow-monitor.yml)
[![Codecov](https://codecov.io/gh/rsl37/GALAX_Civic_Networking_App/branch/main/graph/badge.svg)](https://codecov.io/gh/rsl37/GALAX_Civic_Networking_App)

**GALAX** is a next-generation web3-enabled civic networking platform that empowers communities to connect, organize, and collaborate for social good through real-time help requests, skill-based matching, and democratic governance.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20.x or later
- npm or yarn package manager

### Installation
```bash
# Clone the repository
git clone https://github.com/rsl37/GALAX_Civic_Networking_App.git
cd GALAX_Civic_Networking_App

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
cd GALAX_App_files
npm install

# Development setup
npm start

# Production setup
npm run production:setup

# Build for production
npm run build:production
```

### Testing
```bash
# Run all tests
npm test

# Run security tests
npm run test:security

# Run E2E tests
npm run test:e2e

# Run with coverage
npm run test:coverage

# Run security audit
npm run security:audit

# Full security scan
npm run security:scan
```

---

## 🔒 Security

GALAX implements comprehensive security measures to protect against current and emerging threats, including zero-day vulnerabilities.

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

Report security vulnerabilities through [GitHub Security Advisories](https://github.com/rsl37/GALAX_Civic_Networking_App/security/advisories/new).

**Please do not report security vulnerabilities in public issues.**

---

## 🏗️ Project Structure

```
GALAX_App_files/
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
- **🤖 MCP Integration**: GitHub Copilot integration with custom civic networking tools

---

## 📖 Documentation

- [About GALAX](ABOUT_GALAX.md) - Project overview and mission
- [Project Structure](PROJECT_STRUCTURE.md) - Detailed directory structure
- [Production Mode Guide](GALAX_App_files/PRODUCTION_MODE_GUIDE.md) - Production deployment setup
- [Deployment Configuration](DEPLOYMENT.md) - Deployment troubleshooting
- [Security Information](SECURITY.md) - Security policies and reporting
- [Privacy & Badges](PRIVACY_AND_BADGES_IMPLEMENTATION.md) - Implementation details
- [Workspace Guide](GALAX_Project_Workspace.md) - Development workspace setup
- [MCP Setup Guide](MCP_SETUP_GUIDE.md) - GitHub Copilot MCP configuration

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

- **Live Demo**: [galaxcivicnetwork.me](https://galaxcivicnetwork.me)
- **Documentation**: [Project Docs](docs/)
- **Production Guide**: [Production Setup](GALAX_App_files/PRODUCTION_MODE_GUIDE.md)
- **Issues**: [GitHub Issues](https://github.com/rsl37/GALAX_Civic_Networking_App/issues)

---

*Building stronger communities through technology* 🌟