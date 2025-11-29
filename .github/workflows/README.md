# GitHub Actions Workflows Documentation - STREAMLINED

This repository implements a **12-workflow architecture** designed using Ashby's Law of Requisite Variety to balance complexity with maintainability while ensuring 100% code integrity.

## 🚀 Streamlining Summary

**BEFORE**: 25 overlapping workflows with redundant checks  
**AFTER**: 12 purpose-driven workflows organized in 3 tiers  
**PRINCIPLE**: Right-sized variety that matches repository complexity without fragmentation

## Workflow Architecture (3 Tiers)

### Tier 1: Core Pipeline Workflows (4 workflows)

These are essential workflows that maintain code and deployment integrity.

#### 1. **CI/CD Pipeline** - `ci-pipeline.yml`
**Purpose**: Unified build, test, quality, and deployment readiness  
**Jobs**: Build & Test, Code Quality, Security Quick Scan, Deployment Check  
**Triggers**: Push to main/develop, Pull Requests, Manual dispatch

#### 2. **Security Scan** - `security-scan.yml`
**Purpose**: Comprehensive security vulnerability detection  
**Jobs**: CodeQL Analysis, Dependency Scan, Secret Detection, njsscan  
**Triggers**: Push to main/develop, Pull Requests <!-- , Daily schedule (8 PM GMT-6) - Currently disabled, PR scans only -->

#### 3. **Deploy** - `deploy.yml`
**Purpose**: Preview and production deployments  
**Jobs**: Build, Preview Deploy (PRs), Production Deploy (manual)  
**Triggers**: Pull Requests, Manual dispatch for production

#### 4. **Quality Gate** - `quality-gate.yml`
**Purpose**: Quality metrics, performance, accessibility, E2E testing  
**Jobs**: Code Coverage, Accessibility, Performance, E2E Tests  
**Triggers**: Push to main, Pull Requests <!-- , Weekly schedule - Currently disabled, PR scans only -->

### Tier 2: Specialized Workflows (4 workflows)

Domain-specific workflows for specialized concerns.

#### 5. **Web3 Validation** - `web3-checks.yml`
**Purpose**: Web3/blockchain functionality and security validation  
**Triggers**: Changes to web3/crypto/blockchain files

#### 6. **License Compliance** - `license-compliance.yml`
**Purpose**: Ensure license compatibility  
**Triggers**: Pull Requests, dependency changes <!-- , Weekly schedule - Currently disabled, PR scans only -->

#### 7. **Service Connectivity** - `service-connectivity-checks.yml`
**Purpose**: External service integration health  
**Triggers**: Pull Requests, service config changes <!-- , Daily schedule - Currently disabled, PR scans only -->

#### 8. **PAT Security** - `pat-security.yml`
**Purpose**: PAT token security and validation  
**Triggers**: Pull Requests, PAT workflow changes <!-- , Every 6 hours - Currently disabled, PR scans only -->

### Tier 3: Utility & Maintenance Workflows (4 workflows)

Lightweight workflows for repository housekeeping.

#### 9. **Documentation** - `documentation-validation.yml`
**Purpose**: Documentation freshness and quality  
**Triggers**: Pull Requests, markdown changes <!-- , Monthly schedule - Currently disabled, PR scans only -->

#### 10. **Stale Issues** - `stale.yml`
**Purpose**: Issue and PR lifecycle management  
**Triggers**: Manual dispatch <!-- , Daily schedule - Currently disabled -->

#### 11. **Submodule Access** - `secure-submodule-access.yml`
**Purpose**: Secure submodule operations  
**Triggers**: Changes to .gitmodules, Core/

#### 12. **Copilot Setup** - `copilot-setup.yml`
**Purpose**: MCP configuration for Copilot  
**Triggers**: Manual dispatch only

---

## Deprecated Workflows (To Be Removed)

The following workflows are superseded by the consolidated architecture:

| Deprecated Workflow | Replaced By |
|---------------------|-------------|
| `main.yml` | `ci-pipeline.yml` |
| `comprehensive-checks.yml` | `ci-pipeline.yml` |
| `quality.yml` | `quality-gate.yml` |
| `codeql.yml` | `security-scan.yml` |
| `njsscan.yml` | `security-scan.yml` |
| `security-streamlined.yml` | `security-scan.yml` |
| `release.yml` | `deploy.yml` |
| `preview-deploy.yml` | `deploy.yml` |
| `vercel-integration-check.yml` | `deploy.yml` |
| `pat-security-monitoring.yml` | `pat-security.yml` |
| `pat-implementation-validation.yml` | `pat-security.yml` |
| `secure-pat-checkout.yml` | `pat-security.yml` |
| `cross-repo-pat-operations.yml` | `secure-submodule-access.yml` |
| `workflow-dispatcher.yml` | Path filters in workflows |
| `workflow-monitor.yml` | GitHub built-in monitoring |
| `status-monitor.yml` | GitHub built-in monitoring |
| `health-location-status.yml` | `ci-pipeline.yml` |
| `summary.yml` | Removed (was disabled) |

> ✅ **All deprecated workflows have been removed in this PR.**

---

## 🔧 Key Improvements

### Variety Engineering (Ashby's Law Applied)

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Total Workflows | 25 | 12 | 52% reduction |
| Redundant CI Paths | 4+ | 1 | Single source of truth |
| Security Checks | 5+ overlapping | 1 comprehensive | Consolidated |
| Deployment Paths | 3 overlapping | 1 unified | Clear process |
| Maintenance Burden | High | Low | Easy to maintain |

### Reliability Enhancements

- 🛡️ **Timeout Protection**: Job-level (10-20min), Step-level (3-8min)
- 🛡️ **Fail-fast: false**: Prevents early matrix cancellation
- 🛡️ **Path Filtering**: Workflows only run on relevant changes
- 🛡️ **Graceful Fallbacks**: PAT_TOKEN → GITHUB_TOKEN fallback

### Performance Optimizations

- 📈 **Reduced workflow count**: 25 → 12 (52% reduction)
- 📈 **Efficient caching**: npm cache with version keys
- 📈 **Shallow clones**: `fetch-depth: 1` for speed
- 📈 **Conditional execution**: Skip docs-only changes

## 📊 Required Status Checks

### For `main` Branch Protection

Configure these status checks in **Settings → Branches → Branch Protection Rules**:

**Required (Core Pipeline):**
1. `CI/CD Pipeline / Build and Test`
2. `CI/CD Pipeline / Code Quality`
3. `CI/CD Pipeline / Security Quick Scan`
4. `Security Scan / Dependency Security`

**Recommended:**
5. `Quality Gate / E2E Tests`
6. `Deploy / Preview Deployment`
7. `Security Scan / CodeQL Analysis`

### Status Check Mapping

| Old Check Name | New Check Name |
|----------------|----------------|
| Build and Test | CI/CD Pipeline / Build and Test |
| Code Quality | CI/CD Pipeline / Code Quality |
| Security Check | CI/CD Pipeline / Security Quick Scan |
| Deployment Readiness | CI/CD Pipeline / Deployment Readiness |
| Security Analysis | Security Scan / Security Summary |
| Code Coverage | Quality Gate / Code Coverage |
| E2E Tests | Quality Gate / E2E Tests |

## 🔧 Troubleshooting

**If workflows fail or stall:**
1. Check Node.js version compatibility (must be 20.x+)
2. Verify timeout values are appropriate for your system
3. Check for network connectivity issues in health checks
4. Review the workflow logs for specific error messages

**Common fixes:**
- All workflows have job-level and step-level timeouts
- Dependency installation uses `--prefer-offline --no-audit --no-fund`
- Path filtering prevents unnecessary workflow runs

## Security Configuration

### Dependabot - `.github/dependabot.yml`
<!-- - Weekly dependency updates (Sundays at 10 PM GMT-6) - Currently disabled, PR scans only -->
- Grouped updates for production vs development dependencies
- Security updates for all dependency types
- GitHub Actions updates to keep workflows current

### CodeQL Configuration - `.github/codeql-config.yml`
- Security and quality queries enabled
- Path filtering to focus on source code
- Exclusions for build artifacts and test files

## Required Secrets

Configure these secrets in **Settings → Secrets and variables → Actions**:

| Secret | Purpose | Required |
|--------|---------|----------|
| `VERCEL_TOKEN` | Vercel deployments | For deploy.yml |
| `VERCEL_ORG_ID` | Vercel organization | For deploy.yml |
| `VERCEL_PROJECT_ID` | Vercel project | For deploy.yml |
| `PAT_TOKEN` | Cross-repo operations | For pat-security.yml |
| `CODECOV_TOKEN` | Coverage reporting | Optional |

## Test Framework Support

Workflows auto-detect and support:
- **Vitest** (preferred for Vite projects)
- **Jest** (fallback)
- **Playwright** (E2E testing)
- **Axe-core** (Accessibility testing)

## Debug Commands

```bash
# Local testing commands
npm run build
npm run test
npm run test:coverage
npm audit
```

## Contributing

When modifying workflows:
1. Follow existing naming conventions
2. Include proper timeout protection
3. Add path filtering for efficiency
4. Update this README
5. Test locally before committing

---

*Last Updated: November 2024*  
*Architecture: 12 workflows in 3 tiers*  
*Principle: Ashby's Law of Requisite Variety*