# GitHub Actions Workflows Documentation - OPTIMIZED

This repository implements **4 core CI workflows** instead of the previous 23+ redundant checks, providing comprehensive coverage with improved efficiency and reliability.

## 🚀 Optimization Summary

**BEFORE**: 23+ redundant CI checks with frequent hangs and duplications  
**AFTER**: 4 consolidated core workflows with additional utility workflows  
**IMPROVEMENTS**: Eliminated redundancies, added timeout protection, fixed Node.js compatibility

## Workflow Overview

### 1. **Main CI/CD Pipeline** - `main.yml`
**Purpose**: Comprehensive CI/CD with build, test, security check, and deployment readiness  
**Jobs**: 4 (Build & Test, Code Quality, Security Check, Deployment Readiness)  
**Optimizations**: 
- ✅ Consolidated build verification and TypeScript compilation
- ✅ Integrated linting and basic security checks
- ✅ Added proper timeouts and error handling

**Triggers**: Push to main, Pull Requests  
**Status Check**: ✅ Build and Test, ✅ Code Quality, ✅ Security Check, ✅ Deployment Readiness

### 2. **Security Analysis** - `security-streamlined.yml` 
**Purpose**: Comprehensive security vulnerability detection  
**Jobs**: 3 (CodeQL Analysis, Dependency Scan, Secret Detection)  
### 2. **Security Analysis** - `security-streamlined.yml` 
**Purpose**: Comprehensive security vulnerability detection  
**Jobs**: 3 (CodeQL Analysis, Dependency Scan, Secret Detection)  
**Optimizations**:
- ✅ Consolidated multiple security tools into unified workflow
- ✅ Added job-level timeouts (10-20 minutes)
- ✅ Enhanced secret scanning with TruffleHog

**Triggers**: Push to main, Pull Requests, Daily schedule (2 AM UTC)  
**Status Check**: ✅ Security Analysis

### 3. **Quality & Performance** - `quality.yml`
**Purpose**: Code quality, performance, and comprehensive testing  
**Jobs**: 3 (Code Coverage, Performance Check, E2E Tests)  
**Optimizations**:
- ✅ Consolidated performance and quality checks
- ✅ Added application startup timeouts (30 seconds)
- ✅ Enhanced memory usage monitoring and coverage reporting

**Triggers**: Push to main, Pull Requests  
**Status Check**: ✅ Code Coverage, ✅ Performance Check, ✅ E2E Tests

### 4. **Docker Deployment** - `docker-publish.yml`
**Purpose**: Container image building and publishing  
**Jobs**: 1 (Build and publish Docker images)  
**Optimizations**:
- ✅ Consolidated performance and quality checks
- ✅ Added application startup timeouts (30 seconds)
- ✅ Enhanced memory usage monitoring and coverage reporting

**Triggers**: Push to main/develop, Pull Requests  
**Status Check**: ✅ Code Coverage, ✅ Performance Check, ✅ E2E Tests

### 4. **Docker Deployment** - `docker-publish.yml`
**Purpose**: Container image building and publishing  
**Jobs**: 1 (Build and publish Docker images)  
**Optimizations**:
- ✅ Streamlined container deployment process
- ✅ Proper caching and multi-stage builds

**Triggers**: Push to main, Release tags  
**Status Check**: ✅ Docker Build and Publish

## Additional Utility Workflows

### Health Monitoring - `health-location-status.yml`
**Purpose**: System health and status monitoring  
**Triggers**: Push to main/develop, Pull Requests, Daily schedule  

### Repository Maintenance
- **`label.yml`** - Automated issue labeling
- **`stale.yml`** - Stale issue management  
- **`summary.yml`** - Summary reporting

## 🔧 Key Improvements

### Eliminated Major Redundancies
- 🚨 **Consolidated core functionality** into 4 main workflows (main.yml, security-streamlined.yml, quality.yml, docker-publish.yml)
- 🚨 **Unified CI/CD pipeline** (build, test, quality, deployment in main.yml)
- 🚨 **Streamlined security analysis** (CodeQL, dependency scan, secret detection in single workflow)
- 🚨 **Integrated quality checks** (coverage, performance, E2E in quality.yml)

### Enhanced Reliability  
- 🛡️ **Comprehensive timeout protection**: Job-level (10-20min), Step-level (3-8min)
- 🛡️ **Fail-fast: false** on matrix jobs to prevent early cancellation
- 🛡️ **Optimized dependency installation** with caching and flags
- 🛡️ **Proper process cleanup** with timeout handling for hanging issues

### Performance Gains
- 📈 **Reduced total workflows**: 23+ → 4 core workflows (plus utilities)
- 📈 **Faster dependency installation** with `--prefer-offline --no-audit --no-fund`
- 📈 **Streamlined git operations** with `fetch-depth: 1`
- 📈 **Efficient artifact handling** with proper retention policies

## 📊 Check Count Analysis

### Core Workflow Structure
- **Main CI/CD**: Build & Test, Code Quality, Security Check, Deployment Readiness
- **Security Analysis**: CodeQL, Dependency Scan, Secret Detection  
- **Quality & Performance**: Coverage, Performance, E2E Tests
- **Docker Deployment**: Container build and publish

**Total core checks**: 4 workflows with consolidated functionality

### Required Status Checks Mapping
The 4 core workflows map directly to GitHub's required status checks:
1. ✅ **Main CI/CD Pipeline** (Build & Test, Code Quality, Security Check, Deployment Readiness)
2. ✅ **Security Analysis** (Comprehensive security scanning)
3. ✅ **Quality & Performance** (Coverage, Performance, E2E Tests)  
4. ✅ **Docker Deployment** (Container deployment) 

## 🚨 Issue #93 Resolution

**All workflows now include proper timeout handling to prevent indefinite hanging**, directly addressing the core issue blocking CI completion:

- ✅ Job-level timeouts: 10-20 minutes maximum
- ✅ Step-level timeouts: 3-8 minutes for critical operations  
- ✅ Application startup timeouts: 20-30 seconds instead of indefinite waits
- ✅ Network operation timeouts: 5-30 seconds for health checks
- ✅ Process cleanup with timeout handling

## 🔗 Branch Protection Configuration

Configure these status checks as **required** in GitHub Settings → Branches:

**Core Required Checks (4 workflows):**
1. Build and Test + Code Quality + Security Check + Deployment Readiness (from main.yml)
2. Security Analysis (from security-streamlined.yml)  
3. Code Coverage + Performance Check + E2E Tests (from quality.yml)
4. Docker Build and Publish (from docker-publish.yml)

**Additional utility workflows:**
- System Health Checks (from health-location-status.yml)
- Repository maintenance workflows (label, stale, summary)

## 🔧 Troubleshooting

**If workflows still hang or stall:**
1. Check Node.js version compatibility (must be 20.x+ for dependencies)
2. Verify timeout values are appropriate for your system
3. Review process cleanup in deployment workflows
4. Check for network connectivity issues in health checks

**Common fixes applied:**
- Removed Node 18.x compatibility (package engine requirements)
- Added `fail-fast: false` to prevent early matrix cancellation
- Implemented comprehensive timeout protection
- Optimized dependency installation with offline-first approach

## Security Configuration

### Dependabot - `.github/dependabot.yml`
- **Weekly dependency updates** (Mondays at 4 AM UTC)
- **Grouped updates** for production vs development dependencies
- **Security updates** for all dependency types
- **GitHub Actions updates** to keep workflows current

### CodeQL Configuration - `.github/codeql-config.yml`
- **Security and quality queries** enabled
- **Path filtering** to focus on source code
- **Exclusions** for build artifacts and test files

## Branch Protection Configuration

To implement the full status check system, configure the following branch protection rules:

### Main Branch Protection

Navigate to **Settings → Branches → Add Rule** for the `main` branch:

#### Required Status Checks
Enable "Require status checks to pass before merging" and select:

**CI Checks:**
- Build Application (ubuntu-latest, 18.x)
- Build Application (ubuntu-latest, 20.x)
- TypeScript Type Check

**Code Quality:**
- Lint and Format Check
- Code Coverage

**Security:**
- Dependency Vulnerability Scan
- CodeQL Security Analysis / javascript
- Secret Scanning

**Testing:**
- Unit Tests (ubuntu-latest, 18.x)
- Unit Tests (ubuntu-latest, 20.x)
- Integration Tests
- End-to-End Tests

**Performance:**
- Performance Benchmarks
- Memory Performance Tests

**Application-Specific:**
- Database Migration Tests
- API Contract Tests
- Socket.IO Tests
- Web3 Integration Tests

**Deployment:**
- Staging Deployment Verification
- Deployment Health Checks
- Environment Compatibility (ubuntu-latest, 18.x)
- Environment Compatibility (ubuntu-latest, 20.x)
- Environment Compatibility (ubuntu-latest, 22.x)

#### Additional Protection Settings
- ✅ Require branches to be up to date before merging
- ✅ Require pull request reviews before merging (minimum 1)
- ✅ Dismiss stale reviews when new commits are pushed
- ✅ Require review from code owners
- ✅ Restrict pushes that create files larger than 100MB
- ✅ Require signed commits (recommended)

### Develop Branch Protection

Similar configuration with slightly relaxed requirements:
- All status checks required
- Pull request reviews optional for development
- Allow force pushes for maintainers

## Workflow Customization

### Environment Variables
Set these repository secrets for full functionality:

```bash
# Required for deployment testing
STAGING_URL=https://staging.glx.app

# Optional for enhanced reporting
CODECOV_TOKEN=your_codecov_token
LIGHTHOUSE_CI_TOKEN=your_lhci_token
```

### Performance Budgets
Current thresholds in `performance.yml`:
- JavaScript bundle: < 1MB
- CSS bundle: < 100KB
- Lighthouse scores: Performance > 70%, Accessibility > 90%

### Test Framework Support
Workflows auto-detect and support:
- **Vitest** (preferred for Vite projects)
- **Jest** (fallback)
- **Playwright** (E2E testing)
- **Supertest** (API testing)

## Maintenance

### Weekly Tasks
- Review Dependabot PRs
- Check security alert notifications
- Monitor performance trends

### Monthly Tasks
- Review and update performance budgets
- Audit workflow efficiency
- Update test coverage requirements

### Troubleshooting

**Common Issues:**

1. **Build Failures**: Check Node.js version compatibility
2. **Test Timeouts**: Increase timeout values in workflow files
3. **Permission Errors**: Verify repository permissions for GitHub Actions
4. **Large Bundle Warnings**: Implement code splitting

**Debug Commands:**
```bash
# Local testing commands
npm run build
npm run test
npm audit
npx lighthouse http://localhost:3000
```

## Contributing

When adding new workflows:
1. Follow existing naming conventions
2. Include proper error handling
3. Add documentation updates
4. Test locally before committing
5. Use semantic commit messages

## Status Badge Integration

Add these badges to your README.md:

```markdown
![CI](https://github.com/rsl37/GLX_App/workflows/Continuous%20Integration/badge.svg)
![Security](https://github.com/rsl37/GLX_App/workflows/Security%20Checks/badge.svg)
![Tests](https://github.com/rsl37/GLX_App/workflows/Testing/badge.svg)
```