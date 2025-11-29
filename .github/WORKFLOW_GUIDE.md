# GLX GitHub Actions Workflow Guide 🚀

## Overview

This repository uses a comprehensive GitHub Actions workflow system designed for enterprise-grade CI/CD, security, and quality assurance. The workflow system has been **refactored and optimized** for efficiency while maintaining comprehensive coverage of all critical development processes.

## Recent Refactoring

The workflow system was recently refactored to:
- Remove 27 disabled duplicate workflow files
- Fix syntax issues (duplicate triggers, steps, and formatting)
- Standardize YAML formatting across all workflows
- Improve documentation and maintainability

## Core Workflows

### 1. 🏗️ CI/CD Pipeline (`main.yml`)
**Triggers:** Push to main, PRs to main, manual dispatch
**Duration:** ~15-20 minutes

**Jobs:**
- **Build and Test**: TypeScript compilation, unit tests, artifact generation
- **Code Quality**: ESLint, Prettier, code formatting checks
- **Security Check**: npm audit, secret detection
- **Deployment Readiness**: Startup tests, bundle size analysis

**Key Features:**
- Intelligent caching for faster builds
- Comprehensive artifact management
- Parallel job execution
- Detailed reporting

### 2. 🔒 Security Scans (Multi-Workflow System)

#### CodeQL Analysis (`codeql.yml`)
**Triggers:** Push to main/develop, PRs to main <!-- , weekly schedule (Tuesdays 1:30 AM) - Currently disabled, PR scans only -->
**Duration:** ~10-15 minutes

**Features:**
- **Dedicated Code Scanning**: GitHub Code Scanning integration
- **JavaScript/TypeScript Analysis**: Comprehensive static analysis
- **SARIF Integration**: Results appear in Security tab
- **Quantum-Safe Configuration**: Custom CodeQL config for advanced security

#### Security Streamlined (`security-streamlined.yml`)
**Triggers:** Push/PR to main/develop <!-- , daily schedule (8 PM GMT-6) - Currently disabled, PR scans only -->
**Duration:** ~15-20 minutes

**Jobs:**
- **Dependency Review**: License compliance, vulnerability scanning (PR only)
- **Static Analysis**: ESLint and code quality checks
- **Dependency Security**: npm audit with detailed reporting
- **Secret Detection**: TruffleHog for secret scanning

**Key Features:**
- Automated security reporting
- License compliance checking
<!-- - Daily automated scans - Currently disabled, PR scans only -->
- Intelligent change detection

### 3. 📊 Quality & Performance (`quality.yml`)
**Triggers:** Push/PR to main/develop
**Duration:** ~20-30 minutes

**Jobs:**
- **Code Coverage**: Vitest coverage with Codecov integration
- **Accessibility Testing**: axe-core automated accessibility audits
- **Performance Check**: Bundle analysis, startup time testing
- **E2E Tests**: Playwright end-to-end testing

**Key Features:**
- Comprehensive test coverage reporting
- Accessibility compliance (WCAG 2.1)
- Performance monitoring
- Visual regression testing capability

### 4. 🚀 Preview Deployment (`preview-deploy.yml`)
**Triggers:** PRs to main (non-draft)
**Duration:** ~10-15 minutes

**Jobs:**
- **Deploy Preview**: Vercel preview deployment with custom domains
- **Lighthouse Audit**: Performance, accessibility, SEO scoring

**Key Features:**
- Automatic PR preview environments
- Performance benchmarking
- Real-time deployment status updates
- Cleanup on PR close

### 5. 📦 Release Management (`release.yml`)
**Triggers:** Push to main, manual dispatch
**Duration:** ~15-25 minutes

**Jobs:**
- **Automated Release**: Semantic versioning, changelog generation
- **Production Deployment**: Vercel production deployment

**Key Features:**
- Semantic versioning (patch/minor/major)
- Automated changelog generation
- GitHub release creation
- Production deployment automation
- Health checks and rollback capability

### 6. 🔍 Workflow Health Monitor (`workflow-monitor.yml`)
**Triggers:** Workflow completions <!-- , Daily schedule (12 AM GMT-6) - Currently disabled, PR scans only -->
**Duration:** ~5 minutes

**Jobs:**
- **Monitor Workflows**: Success rate tracking, failure analysis
- **Notify Failures**: Automatic issue creation for critical failures

**Key Features:**
- Workflow success rate monitoring
- Automated alerting for failures
- Health dashboard in GitHub Issues
- Proactive maintenance notifications

## Utility Workflows

### 🏷️ Auto Labeling (`label.yml`)
- Automatic PR/issue labeling based on file changes
- Size labeling (small/medium/large/xlarge)
- Component-based labeling

### 🗑️ Stale Issue Management (`stale.yml`)
- Automatic stale issue detection
- Community engagement automation
- Repository cleanup

### 🐳 Docker Publishing (`docker-publish.yml`)
- Container image building and publishing
- Multi-platform support
- Automated tagging

## Configuration Files

### 📋 Dependabot (`dependabot.yml`)
```yaml
# Automated dependency updates
<!-- - Weekly npm dependency updates - Currently disabled, PR scans only -->
<!-- - Weekly GitHub Actions updates - Currently disabled, PR scans only -->
- Grouped updates for related packages
- Security-focused update prioritization
```

### 🔍 CodeQL Configuration (`codeql-config.yml`)
```yaml
# Static analysis configuration
- JavaScript/TypeScript analysis
- Security vulnerability detection
- Code quality checks
- Custom query suites
```

## Workflow Integration

### Branch Protection Rules
Configure the following required status checks:

**Required Checks:**
- `Build and Test` (main.yml)
- `Code Quality` (main.yml)
- `Security Check` (main.yml)
- `Security Analysis` (security-streamlined.yml)
- `Code Coverage` (quality.yml)
- `Accessibility Testing` (quality.yml)

### Secrets Configuration
Set up the following repository secrets:

**Deployment:**
- `VERCEL_TOKEN`: Vercel deployment token
- `VERCEL_ORG_ID`: Vercel organization ID
- `VERCEL_PROJECT_ID`: Vercel project ID

**External Services:**
- `CODECOV_TOKEN`: Codecov upload token
- `LHCI_GITHUB_APP_TOKEN`: Lighthouse CI token

## Monitoring and Alerts

### 📊 Dashboard Access
- **Workflow Runs**: GitHub Actions tab
- **Security Alerts**: Security tab → Code scanning
- **Coverage Reports**: Codecov dashboard
- **Performance**: Lighthouse CI reports

### 🚨 Alert Channels
- **GitHub Issues**: Automatic issue creation for failures
- **Email Notifications**: GitHub notification settings
- **Status Badges**: README.md real-time status

## Best Practices

### 🎯 Development Workflow
1. **Feature Development**: Create PR → automatic preview deployment
2. **Code Review**: Review preview, check automated tests
3. **Merge**: Automatic production deployment and release
4. **Monitoring**: Workflow health monitoring and alerts

### 🔧 Maintenance
- **Weekly**: Review Dependabot PRs
- **Monthly**: Check workflow success rates
- **Quarterly**: Update workflow configurations
- **As Needed**: Respond to security alerts

### 📈 Performance Optimization
- **Caching**: Node modules and build artifacts
- **Parallelization**: Independent jobs run concurrently
- **Incremental Builds**: Only rebuild changed components
- **Resource Management**: Appropriate timeouts and limits

## Troubleshooting

### Common Issues
1. **Build Failures**: Check TypeScript errors, dependency conflicts
2. **Test Failures**: Review test logs, update snapshots if needed
3. **Security Alerts**: Address dependency vulnerabilities promptly
4. **Deployment Issues**: Verify Vercel configuration and secrets

### Debug Steps
1. Check workflow logs in GitHub Actions tab
2. Review artifact uploads for detailed reports
3. Use workflow re-run functionality for transient issues
4. Check repository secrets and permissions

## Migration Notes

This workflow system represents a significant upgrade from the previous setup:

### Improvements Made
- ✅ Added dependency review for PRs
- ✅ Enhanced security scanning with CodeQL
- ✅ Implemented accessibility testing
- ✅ Added preview deployments
- ✅ Automated release management
- ✅ Workflow health monitoring
- ✅ Better caching and performance
- ✅ Comprehensive documentation

### Breaking Changes
- None - all existing functionality preserved
- New workflows are additive and backwards compatible

## Contributing

When contributing to this repository:

1. 🔄 **Follow the workflow**: Let CI/CD guide your development
2. 🧪 **Write tests**: Maintain coverage above 80%
3. 🔒 **Security first**: Address security alerts promptly
4. 📝 **Document changes**: Update documentation for workflow changes
5. 🚀 **Test deployments**: Use preview environments for validation

---

For questions or issues with the workflow system, create an issue with the `workflow` label.