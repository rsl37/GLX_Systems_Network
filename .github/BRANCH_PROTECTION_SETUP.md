# Branch Protection Rules Setup Guide

This document provides step-by-step instructions for configuring branch protection rules optimized for **solo developer workflow with GitHub Copilot**, addressing common merge conflicts and admin bypass scenarios.

## Solo Developer Quick Setup Checklist

- [ ] Navigate to repository Settings
- [ ] Go to Branches section
- [ ] Add protection rule for `main` branch (solo-developer optimized)
- [ ] Configure status checks as **advisory** with admin bypass enabled
- [ ] Add protection rule for `develop` branch (flexible for development)
- [ ] Enable **admin bypass permissions** for emergency merges
- [ ] Test protection rules with admin bypass functionality

## Solo Developer GitHub Admin Bypass Solution

As a **solo developer working primarily with Copilot**, you have **several viable options** to handle GitHub branch protection roadblocks:

### Current Blocks Being Addressed
1. **Copilot collaboration review requirements** (requiring 2 human reviewers)
2. **CodeQL status checks** (waiting for scan completion)  
3. **Commit signature verification** (unsigned commits)

### Admin Bypass Options Available
- ✅ **Use Admin Bypass Permissions** - Repository admins can bypass branch protections by default
- ✅ **Temporarily Adjust Protection Settings** - Reduce reviewer requirements from 2 to 0 for solo development
- ✅ **Make Status Checks Advisory** - Allow admin bypass while maintaining quality checks
- ✅ **Copilot-Specific Workarounds** - Self-approve after Copilot review as admin

## Detailed Configuration Steps

### Step 1: Access Branch Protection Settings

1. Navigate to your repository on GitHub
2. Click **Settings** tab
3. Click **Branches** in the left sidebar
4. Click **Add rule** button

### Step 2: Configure Main Branch Protection (Solo Developer Optimized)

#### Branch Name Pattern
```
main
```

#### Solo Developer Protection Settings

**✅ Require a pull request before merging**
- Require approvals: `0` (Solo developer - no additional approvers needed)
- ✅ Dismiss stale pull request approvals when new commits are pushed
- ❌ Require review from code owners (Optional for solo development)
- ✅ Restrict pushes that create files larger than 100MB

**✅ Require status checks to pass before merging** 
- ❌ Require branches to be up to date before merging (Allow flexibility for solo dev)
- ✅ **Allow bypassing requirements** (Enable admin bypass for solo developer)

**Advisory Status Checks** (Quality feedback without blocking):

```
Continuous Integration / Build Application (ubuntu-latest, 20.x)
Continuous Integration / Build Application (ubuntu-latest, 22.x)
Continuous Integration / TypeScript Type Check

Code Quality / Lint and Format Check (Advisory)
Code Quality / Code Coverage (Advisory)

Security Checks / Dependency Vulnerability Scan (Advisory)
Security Checks / CodeQL Security Analysis / javascript (Non-blocking)
Security Checks / Secret Scanning (Advisory)

Testing / Unit Tests (ubuntu-latest, 20.x)
Testing / Unit Tests (ubuntu-latest, 22.x)  
Testing / Integration Tests (Advisory)
Testing / End-to-End Tests (Advisory)
```

**✅ Require conversation resolution before merging**

**❌ Require signed commits** (Disabled for solo developer workflow)

**❌ Require linear history** (Allows flexible merge strategies)

**❌ Include administrators** (Allow admin bypass for solo developer)

**✅ Allow force pushes** (Enable for repository administrators only)

**❌ Allow deletions** (Protection against accidental deletion)

### Step 3: Configure Develop Branch Protection (Solo Developer Flexible)

Create a second rule for the `develop` branch with relaxed settings for solo development:

#### Branch Name Pattern
```
develop
```

#### Solo Developer Protection Settings

**✅ Require a pull request before merging**
- Require approvals: `0` (Solo developer workflow)
- ❌ Dismiss stale pull request approvals when new commits are pushed (Flexible)
- ❌ Require review from code owners (Not needed for development)

**✅ Require status checks to pass before merging**
- ❌ Require branches to be up to date before merging (Allow flexibility)
- ✅ **Allow bypassing requirements** (Enable for rapid development)

**Advisory Status Checks** (Basic quality checks only):
```
Continuous Integration / Build Application (ubuntu-latest, 20.x)
Continuous Integration / TypeScript Type Check
Testing / Unit Tests (ubuntu-latest, 20.x)
Code Quality / Lint and Format Check (Advisory)
```

**❌ Require conversation resolution before merging** (Fast iteration)

**❌ Require signed commits** (Development flexibility)

**❌ Require linear history** (Allow merge commits)

**❌ Include administrators** (Full admin bypass enabled)

**✅ Allow force pushes** (Enabled for administrators)
- Specify who can force push: `Repository administrators`

**❌ Allow deletions** (Prevent accidental deletion)

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

## Recommended Solo Developer Configuration

### Lean Branch Protection Setup
```yaml
# Optimized settings for solo developer with Copilot
Branch Protection Rules:
- Require pull requests: ✓ (prevents accidental pushes)
- Required approvals: 0 (since you're solo)
- Dismiss stale reviews: ✓ 
- Allow force pushes: ✓ (for administrators only)
- Allow deletions: ✗
- Require status checks: ✓ (but allow admin bypass)
- Require signed commits: ✗ (unless specifically needed)
- Include administrators in restrictions: ✗ (enable bypass)
```

### Admin Bypass Implementation Steps

1. **Navigate to Repository Settings → Branches**
2. **Edit your branch protection rule**
3. **Configure bypass settings:**
   - Set required reviewers to `0` for solo development
   - **Uncheck** "Include administrators" to enable bypass
   - **Check** "Allow specified actors to bypass required pull requests" and add yourself
4. **For CodeQL**: Make status checks **advisory rather than required**, or use admin bypass when appropriate
5. **Look for** the **"Use your administrator privileges to bypass these restrictions"** checkbox when merging

### CodeQL Configuration for Solo Developer
For the **CodeQL scanning issue**:
- **Wait for scans to complete** (usually under 5 minutes) or use advisory mode
- **Configure CodeQL as non-blocking** for development branches
- **Use admin bypass** if scan results are acceptable but blocking merge
- Status checks run but don't prevent merging with admin override

### Copilot-Specific Workarounds

Since **Copilot reviews don't count toward approval requirements**:
- **Self-approve after Copilot review**: Use Copilot for code quality feedback, then approve your own PR as admin
- **Use Copilot as supplementary review**: Let Copilot review first, then use admin bypass for merge
- **Configure automatic Copilot reviews**: Set up repository rules to automatically request Copilot reviews

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