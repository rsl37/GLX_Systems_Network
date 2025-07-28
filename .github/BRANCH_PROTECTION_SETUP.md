# Branch Protection Rules Setup Guide

This document provides step-by-step instructions for configuring branch protection rules to enforce the GitHub Actions status checks, specifically including the new **Authentication Status Checks**.

## Quick Setup Checklist

- [ ] Navigate to repository Settings
- [ ] Go to Branches section
- [ ] Add protection rule for `main` branch
- [ ] Configure required status checks (including Authentication checks)
- [ ] Add protection rule for `develop` branch
- [ ] Test protection rules with a test PR

## Authentication Status Checks Added

The following new authentication-focused status checks are now available:

- ✅ **Account Creation Validation** - Validates user registration without errors
- ✅ **Login Validation** - Validates user login functionality  
- ✅ **Account Management** - Validates account management features
- ✅ **Authentication Security Testing** - Validates security measures
- ✅ **E2E Authentication Testing** - Validates end-to-end authentication flows

## Detailed Configuration Steps

### Step 1: Access Branch Protection Settings

1. Navigate to your repository on GitHub
2. Click **Settings** tab
3. Click **Branches** in the left sidebar
4. Click **Add rule** button

### Step 2: Configure Main Branch Protection

#### Branch Name Pattern
```
main
```

#### Protection Settings

**✅ Require a pull request before merging**
- Require approvals: `1`
- ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ Require review from code owners
- ✅ Restrict pushes that create files larger than 100MB

**✅ Require status checks to pass before merging**
- ✅ Require branches to be up to date before merging

**Required Status Checks** (select all that apply):

```
Continuous Integration / Build Application (ubuntu-latest, 18.x)
Continuous Integration / Build Application (ubuntu-latest, 20.x)
Continuous Integration / TypeScript Type Check

Code Quality / Lint and Format Check
Code Quality / Code Coverage

Security Checks / Dependency Vulnerability Scan
Security Checks / CodeQL Security Analysis / javascript
Security Checks / Secret Scanning

Testing / Unit Tests (ubuntu-latest, 18.x)
Testing / Unit Tests (ubuntu-latest, 20.x)  
Testing / Integration Tests
Testing / End-to-End Tests

Performance Checks / Performance Benchmarks
Performance Checks / Memory Performance Tests

Application-Specific Checks / Database Migration Tests
Application-Specific Checks / API Contract Tests
Application-Specific Checks / Socket.IO Tests
Application-Specific Checks / Web3 Integration Tests

Deployment Readiness / Staging Deployment Verification
Deployment Readiness / Deployment Health Checks
Deployment Readiness / Environment Compatibility (ubuntu-latest, 18.x)
Deployment Readiness / Environment Compatibility (ubuntu-latest, 20.x)
Deployment Readiness / Environment Compatibility (ubuntu-latest, 22.x)
```

**✅ Require conversation resolution before merging**

**✅ Require signed commits** (recommended)

**✅ Require linear history** (optional, for cleaner git history)

**✅ Include administrators** (apply rules to repository administrators)

**❌ Allow force pushes** (disabled for main branch)

**❌ Allow deletions** (disabled for main branch)

### Step 3: Configure Develop Branch Protection

Create a second rule for the `develop` branch with slightly relaxed settings:

#### Branch Name Pattern
```
develop
```

#### Protection Settings

**✅ Require a pull request before merging**
- Require approvals: `1` (can be reduced to 0 for development)
- ✅ Dismiss stale pull request approvals when new commits are pushed
- ❌ Require review from code owners (optional for develop)

**✅ Require status checks to pass before merging**
- ✅ Require branches to be up to date before merging

**Required Status Checks** (same as main branch)

**✅ Require conversation resolution before merging**

**❌ Require signed commits** (optional for develop)

**❌ Require linear history** (optional)

**✅ Include administrators**

**✅ Allow force pushes** (enabled for develop branch)
- Specify who can force push: `Repository maintainers`

**❌ Allow deletions**

### Step 4: Feature Branch Protection (Optional)

For enhanced security, create a rule for feature branches:

#### Branch Name Pattern
```
feature/*
```

#### Protection Settings
- Require pull request reviews: `0`
- Required status checks: All CI and security checks
- Allow force pushes: `Yes`
- Allow deletions: `Yes`

## Status Check Name Reference

When configuring required status checks, use these exact names as they appear in the workflow runs:

### CI Workflow Names
```
build
type-check
```

### Code Quality Workflow Names
```
lint
code-coverage
```

### Security Workflow Names
```
dependency-scan
codeql-analysis (javascript)
secret-scan
```

### Testing Workflow Names
```
unit-tests (18.x)
unit-tests (20.x)
integration-tests
e2e-tests
```

### Performance Workflow Names
```
performance-benchmarks
memory-performance
```

### Application-Specific Workflow Names
```
database-tests
api-contract-tests
socket-io-tests
web3-integration-tests
```

### Deployment Workflow Names
```
staging-deployment-test
deployment-health-checks
environment-compatibility (18.x)
environment-compatibility (20.x)
environment-compatibility (22.x)
```

## Testing Your Setup

### Step 1: Create a Test Branch
```bash
git checkout -b test/branch-protection
echo "# Test file" > test-file.md
git add test-file.md
git commit -m "test: verify branch protection"
git push origin test/branch-protection
```

### Step 2: Create a Pull Request
1. Navigate to your repository
2. Create a pull request from `test/branch-protection` to `main`
3. Verify that all status checks are required
4. Confirm that merge is blocked until checks pass

### Step 3: Verify Status Checks
Monitor the Actions tab to ensure all workflows run successfully:
- ✅ All workflows should trigger automatically
- ✅ Status checks should appear in the PR
- ✅ Merge button should be disabled until all checks pass

## Common Configuration Issues

### Issue: Status Check Names Don't Match
**Problem**: Required status checks are not recognized
**Solution**: 
1. Run workflows once to see actual status check names
2. Go to branch protection settings
3. Remove and re-add status checks with correct names

### Issue: Too Many Required Checks
**Problem**: PRs blocked indefinitely due to failing checks
**Solution**:
1. Start with core checks only (build, lint, unit tests)
2. Gradually add additional checks as they stabilize
3. Use "Require branches to be up to date" carefully

### Issue: Administrator Bypass
**Problem**: Administrators can bypass protection rules
**Solution**:
1. Enable "Include administrators" in branch protection
2. Use proper code review process even for admin changes
3. Consider using separate admin accounts

## Advanced Configuration

### Conditional Required Checks
For repositories with multiple components, you can create path-based rules:

```yaml
# In workflow files, add conditions
on:
  push:
    paths:
      - 'GALAX_App_files/**'
  pull_request:
    paths:
      - 'GALAX_App_files/**'
```

### Auto-merge Configuration
For Dependabot PRs, consider setting up auto-merge:

```yaml
# .github/workflows/auto-merge.yml
name: Auto-merge
on:
  pull_request:
jobs:
  auto-merge:
    if: github.actor == 'dependabot[bot]'
    runs-on: ubuntu-latest
    steps:
      - uses: ahmadnassri/action-dependabot-auto-merge@v2
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Status Check Requirements by Environment

**Development Environment** (develop branch):
- Core CI checks
- Security scans
- Unit tests

**Staging Environment** (main branch):
- All development checks
- Integration tests
- Performance benchmarks

**Production Environment** (release tags):
- All staging checks
- E2E tests
- Deployment verification

## Monitoring and Maintenance

### Weekly Review
- Check failed status checks trends
- Review Dependabot security updates
- Monitor workflow performance

### Monthly Audit
- Review branch protection effectiveness
- Update required checks based on project evolution
- Assess security alert patterns

### Quarterly Updates
- Review and update protection rules
- Evaluate new GitHub security features
- Update documentation and procedures

## Emergency Procedures

### Bypassing Protection for Hotfixes
1. Create hotfix branch from main
2. Apply critical fix
3. Use admin override (if enabled) for emergency merge
4. Create follow-up PR to address any bypassed checks

### Temporary Rule Suspension
For major updates or migrations:
1. Document the reason for suspension
2. Temporarily disable specific required checks
3. Re-enable protection immediately after completion
4. Audit changes made during suspension period