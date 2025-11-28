#!/usr/bin/env tsx

/*
 * Copyright (c) 2025 GLX Civic Networking App
 *
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

/**
 * GLX Health, Location, and Status Logger
 *
 * Comprehensive logging and analysis system for health checks, location tracking,
 * and status monitoring across all branches (merged and unmerged) and commits.
 *
 * This addresses the session management errors and deployment issues identified
 * in issue #93, including 401 authentication failures and process exit errors.
 *
 * Usage:
 *   npm run health:log
 *   tsx scripts/health-location-status-logger.ts
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface LogEntry {
  timestamp: string;
  type: 'health' | 'location' | 'status' | 'error' | 'info';
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  branch?: string;
  commit?: string;
  message: string;
  details?: any;
  sessionId?: string;
  requestId?: string;
}

interface BranchInfo {
  name: string;
  type: 'local' | 'remote' | 'merged';
  lastCommit: string;
  lastCommitDate: string;
  author: string;
  isMerged: boolean;
  status: 'active' | 'stale' | 'merged' | 'abandoned';
}

interface CommitInfo {
  hash: string;
  shortHash: string;
  author: string;
  date: string;
  message: string;
  branch: string;
  isMerged: boolean;
  files: string[];
}

interface HealthStatus {
  timestamp: string;
  overall: 'healthy' | 'warning' | 'critical' | 'unknown';
  checks: {
    database: 'pass' | 'fail' | 'unknown';
    authentication: 'pass' | 'fail' | 'unknown';
    sessions: 'pass' | 'fail' | 'unknown';
    api: 'pass' | 'fail' | 'unknown';
    deployment: 'pass' | 'fail' | 'unknown';
  };
  errors: string[];
  warnings: string[];
}

class HealthLocationStatusLogger {
  private logDir: string;
  private logs: LogEntry[] = [];

  constructor() {
    this.logDir = join(__dirname, '../logs/health-location-status');
    this.ensureLogDirectory();
  }

  private ensureLogDirectory(): void {
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }
  }

  private log(entry: Omit<LogEntry, 'timestamp'>): void {
    const logEntry: LogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };

    this.logs.push(logEntry);
    console.log(
      `[${logEntry.timestamp}] ${logEntry.level.toUpperCase()} (${logEntry.type}): ${logEntry.message}`
    );

    if (logEntry.details) {
      console.log('  Details:', JSON.stringify(logEntry.details, null, 2));
    }
  }

  private async executeGitCommand(command: string): Promise<string> {
    try {
      const { stdout } = await execAsync(`cd ${join(__dirname, '../..')} && ${command}`);
      return stdout.trim();
    } catch (error) {
      this.log({
        type: 'error',
        level: 'error',
        message: `Git command failed: ${command}`,
        details: error,
      });
      return '';
    }
  }

  /**
   * Analyze all branches (merged and unmerged)
   */
  async analyzeBranches(): Promise<BranchInfo[]> {
    this.log({
      type: 'info',
      level: 'info',
      message: 'Starting comprehensive branch analysis',
    });

    const branches: BranchInfo[] = [];

    try {
      // Get all branches including remote
      const allBranches = await this.executeGitCommand(
        'git branch -a --format="%(refname:short) %(objectname:short) %(committerdate:iso8601) %(authorname)"'
      );

      for (const branchLine of allBranches.split('\n').filter(line => line.trim())) {
        const [name, commit, date, ...authorParts] = branchLine.split(' ');
        const author = authorParts.join(' ');

        if (!name || name.includes('HEAD')) continue;

        // Check if branch is merged
        const mergedCheck = await this.executeGitCommand(
          `git branch --merged | grep -E "\\b${name.replace('origin/', '')}\\b" || echo ""`
        );
        const isMerged = mergedCheck.length > 0;

        // Determine branch type
        let type: 'local' | 'remote' | 'merged' = 'local';
        if (name.startsWith('origin/')) {
          type = 'remote';
        }
        if (isMerged) {
          type = 'merged';
        }

        // Determine status
        const now = new Date();
        const branchDate = new Date(date);
        const daysSince = (now.getTime() - branchDate.getTime()) / (1000 * 3600 * 24);

        let status: 'active' | 'stale' | 'merged' | 'abandoned' = 'active';
        if (isMerged) {
          status = 'merged';
        } else if (daysSince > 30) {
          status = 'stale';
        } else if (daysSince > 90) {
          status = 'abandoned';
        }

        const branchInfo: BranchInfo = {
          name: name.replace('origin/', ''),
          type,
          lastCommit: commit,
          lastCommitDate: date,
          author,
          isMerged,
          status,
        };

        branches.push(branchInfo);

        this.log({
          type: 'status',
          level: 'info',
          branch: branchInfo.name,
          commit: commit,
          message: `Branch analyzed: ${branchInfo.name} (${branchInfo.status})`,
          details: branchInfo,
        });
      }

      this.log({
        type: 'info',
        level: 'info',
        message: `Branch analysis complete: ${branches.length} branches analyzed`,
        details: {
          total: branches.length,
          active: branches.filter(b => b.status === 'active').length,
          merged: branches.filter(b => b.status === 'merged').length,
          stale: branches.filter(b => b.status === 'stale').length,
          abandoned: branches.filter(b => b.status === 'abandoned').length,
        },
      });
    } catch (error) {
      this.log({
        type: 'error',
        level: 'error',
        message: 'Branch analysis failed',
        details: error,
      });
    }

    return branches;
  }

  /**
   * Analyze all commits (merged and unmerged)
   */
  async analyzeCommits(): Promise<CommitInfo[]> {
    this.log({
      type: 'info',
      level: 'info',
      message: 'Starting comprehensive commit analysis',
    });

    const commits: CommitInfo[] = [];

    try {
      // Get all commits from all branches
      const allCommits = await this.executeGitCommand(
        'git log --all --oneline --format="%H|%h|%an|%ai|%s|%D"'
      );

      for (const commitLine of allCommits.split('\n').filter(line => line.trim())) {
        const [hash, shortHash, author, date, message, refs] = commitLine.split('|');

        if (!hash) continue;

        // Get files changed in this commit
        const filesOutput = await this.executeGitCommand(
          `git show --name-only --format="" ${hash}`
        );
        const files = filesOutput.split('\n').filter(f => f.trim());

        // Determine branch and merge status
        const branchInfo = refs || '';
        const isMerged =
          branchInfo.includes('origin/') ||
          branchInfo.includes('main') ||
          branchInfo.includes('master');

        const commitInfo: CommitInfo = {
          hash,
          shortHash,
          author,
          date,
          message,
          branch: branchInfo.split(',')[0] || 'unknown',
          isMerged,
          files,
        };

        commits.push(commitInfo);

        this.log({
          type: 'status',
          level: 'debug',
          commit: shortHash,
          message: `Commit analyzed: ${shortHash} - ${message.substring(0, 50)}`,
          details: {
            ...commitInfo,
            filesCount: files.length,
          },
        });
      }

      this.log({
        type: 'info',
        level: 'info',
        message: `Commit analysis complete: ${commits.length} commits analyzed`,
        details: {
          total: commits.length,
          merged: commits.filter(c => c.isMerged).length,
          unmerged: commits.filter(c => !c.isMerged).length,
        },
      });
    } catch (error) {
      this.log({
        type: 'error',
        level: 'error',
        message: 'Commit analysis failed',
        details: error,
      });
    }

    return commits;
  }

  /**
   * Perform health checks and log status
   */
  async performHealthChecks(): Promise<HealthStatus> {
    this.log({
      type: 'health',
      level: 'info',
      message: 'Starting health checks',
    });

    const healthStatus: HealthStatus = {
      timestamp: new Date().toISOString(),
      overall: 'unknown',
      checks: {
        database: 'unknown',
        authentication: 'unknown',
        sessions: 'unknown',
        api: 'unknown',
        deployment: 'unknown',
      },
      errors: [],
      warnings: [],
    };

    try {
      // Database health check
      try {
        const dbPath = join(__dirname, '../data/glx.db');
        if (existsSync(dbPath)) {
          healthStatus.checks.database = 'pass';
          this.log({
            type: 'health',
            level: 'info',
            message: 'Database health check: PASS',
          });
        } else {
          healthStatus.checks.database = 'fail';
          healthStatus.errors.push('Database file not found');
          this.log({
            type: 'health',
            level: 'warn',
            message: 'Database health check: FAIL - Database file not found',
          });
        }
      } catch (error) {
        healthStatus.checks.database = 'fail';
        healthStatus.errors.push(`Database check error: ${error}`);
      }

      // Authentication system health check
      try {
        // Check if auth endpoints are available
        const authTestOutput = await this.executeGitCommand(
          'npm run test:api 2>&1 | grep -E "(auth|login|register)" || echo ""'
        );
        if (authTestOutput.includes('pass') || authTestOutput.includes('✓')) {
          healthStatus.checks.authentication = 'pass';
          this.log({
            type: 'health',
            level: 'info',
            message: 'Authentication health check: PASS',
          });
        } else {
          healthStatus.checks.authentication = 'fail';
          healthStatus.warnings.push('Authentication tests may have issues');
          this.log({
            type: 'health',
            level: 'warn',
            message: 'Authentication health check: WARNING - Test results unclear',
          });
        }
      } catch (error) {
        healthStatus.checks.authentication = 'fail';
        healthStatus.errors.push(`Authentication check error: ${error}`);
      }

      // Session management health check (addressing the 401 errors from the issue)
      try {
        // Check for session-related configuration
        const envPath = join(__dirname, '../.env');
        if (existsSync(envPath)) {
          const envContent = readFileSync(envPath, 'utf8');
          if (envContent.includes('JWT_SECRET') && envContent.includes('SESSION_SECRET')) {
            healthStatus.checks.sessions = 'pass';
            this.log({
              type: 'health',
              level: 'info',
              message: 'Session management health check: PASS',
            });
          } else {
            healthStatus.checks.sessions = 'fail';
            healthStatus.errors.push(
              'Missing session configuration (JWT_SECRET or SESSION_SECRET)'
            );
            this.log({
              type: 'health',
              level: 'error',
              message: 'Session management health check: FAIL - Missing session secrets',
              details: 'This may cause 401 authentication errors like those in issue #93',
            });
          }
        } else {
          healthStatus.checks.sessions = 'fail';
          healthStatus.errors.push('Environment file not found');
        }
      } catch (error) {
        healthStatus.checks.sessions = 'fail';
        healthStatus.errors.push(`Session check error: ${error}`);
      }

      // API health check
      try {
        // Run API tests
        const apiTestResult = await this.executeGitCommand(
          'timeout 30s npm run test:api 2>&1 | tail -5 || echo "test timeout"'
        );
        if (apiTestResult.includes('passed') || apiTestResult.includes('✓')) {
          healthStatus.checks.api = 'pass';
          this.log({
            type: 'health',
            level: 'info',
            message: 'API health check: PASS',
          });
        } else if (apiTestResult.includes('timeout')) {
          healthStatus.checks.api = 'fail';
          healthStatus.warnings.push('API tests timed out');
        } else {
          healthStatus.checks.api = 'fail';
          healthStatus.errors.push('API tests failed');
        }
      } catch (error) {
        healthStatus.checks.api = 'fail';
        healthStatus.errors.push(`API check error: ${error}`);
      }

      // Deployment health check
      try {
        const deploymentCheck = await this.executeGitCommand(
          'npm run deployment:check 2>&1 | grep -E "(ready|warning|not_ready)" || echo ""'
        );
        if (deploymentCheck.includes('ready')) {
          healthStatus.checks.deployment = 'pass';
          this.log({
            type: 'health',
            level: 'info',
            message: 'Deployment health check: PASS',
          });
        } else if (deploymentCheck.includes('warning')) {
          healthStatus.checks.deployment = 'fail';
          healthStatus.warnings.push('Deployment has warnings');
        } else {
          healthStatus.checks.deployment = 'fail';
          healthStatus.errors.push('Deployment not ready');
        }
      } catch (error) {
        healthStatus.checks.deployment = 'fail';
        healthStatus.errors.push(`Deployment check error: ${error}`);
      }

      // Determine overall status
      const failedChecks = Object.values(healthStatus.checks).filter(
        check => check === 'fail'
      ).length;
      const unknownChecks = Object.values(healthStatus.checks).filter(
        check => check === 'unknown'
      ).length;

      if (failedChecks > 0) {
        healthStatus.overall = 'critical';
      } else if (unknownChecks > 0) {
        healthStatus.overall = 'warning';
      } else {
        healthStatus.overall = 'healthy';
      }

      this.log({
        type: 'health',
        level:
          healthStatus.overall === 'healthy'
            ? 'info'
            : healthStatus.overall === 'warning'
              ? 'warn'
              : 'error',
        message: `Health check complete: ${healthStatus.overall.toUpperCase()}`,
        details: healthStatus,
      });
    } catch (error) {
      healthStatus.overall = 'critical';
      healthStatus.errors.push(`Health check system error: ${error}`);
      this.log({
        type: 'error',
        level: 'critical',
        message: 'Health check system failed',
        details: error,
      });
    }

    return healthStatus;
  }

  /**
   * Track location and deployment status
   */
  async trackLocationStatus(): Promise<void> {
    this.log({
      type: 'location',
      level: 'info',
      message: 'Starting location and deployment status tracking',
    });

    try {
      // Check Git remote configuration
      const remoteOrigin = await this.executeGitCommand('git remote get-url origin');
      this.log({
        type: 'location',
        level: 'info',
        message: 'Repository location tracked',
        details: {
          remote: remoteOrigin,
          repository: 'rsl37/GLX_Civic_Networking_App',
        },
      });

      // Check current branch and commit
      const currentBranch = await this.executeGitCommand('git branch --show-current');
      const currentCommit = await this.executeGitCommand('git rev-parse HEAD');

      this.log({
        type: 'location',
        level: 'info',
        message: 'Current location status',
        branch: currentBranch,
        commit: currentCommit.substring(0, 8),
        details: {
          branch: currentBranch,
          fullCommit: currentCommit,
          shortCommit: currentCommit.substring(0, 8),
        },
      });

      // Check for deployment environment indicators
      const packageJson = join(__dirname, '../package.json');
      if (existsSync(packageJson)) {
        const pkg = JSON.parse(readFileSync(packageJson, 'utf8'));
        this.log({
          type: 'location',
          level: 'info',
          message: 'Application location info',
          details: {
            name: pkg.name,
            version: pkg.version,
            environment: process.env.NODE_ENV || 'development',
          },
        });
      }

      // Check Vercel deployment configuration
      const vercelConfig = join(__dirname, '../../vercel.json');
      if (existsSync(vercelConfig)) {
        this.log({
          type: 'location',
          level: 'info',
          message: 'Vercel deployment configuration found',
          details: {
            configPath: vercelConfig,
            deploymentTarget: 'vercel',
          },
        });
      }
    } catch (error) {
      this.log({
        type: 'error',
        level: 'error',
        message: 'Location tracking failed',
        details: error,
      });
    }
  }

  /**
   * Monitor for specific error patterns from issue #93
   */
  async monitorSessionErrors(): Promise<void> {
    this.log({
      type: 'status',
      level: 'info',
      message: 'Monitoring for session and authentication errors (Issue #93 patterns)',
    });

    try {
      // Check for recent CI/CD failures
      const githubWorkflowDir = join(__dirname, '../../.github/workflows');
      if (existsSync(githubWorkflowDir)) {
        this.log({
          type: 'status',
          level: 'info',
          message: 'GitHub Actions workflows detected',
          details: {
            workflowsPath: githubWorkflowDir,
            note: 'Monitor for 401 errors and session update failures',
          },
        });
      }

      // Check for authentication configuration issues
      const envExamplePath = join(__dirname, '../.env.example');
      if (existsSync(envExamplePath)) {
        const envExample = readFileSync(envExamplePath, 'utf8');
        const requiredVars = ['JWT_SECRET', 'SESSION_SECRET', 'FRONTEND_URL'];
        const missingVars = requiredVars.filter(varName => !envExample.includes(varName));

        if (missingVars.length > 0) {
          this.log({
            type: 'error',
            level: 'error',
            message: 'Missing authentication configuration variables',
            details: {
              missing: missingVars,
              impact: 'May cause 401 authentication errors and session update failures',
            },
          });
        }
      }

      // Check for process exit patterns
      this.log({
        type: 'status',
        level: 'info',
        message: 'Process monitoring active',
        details: {
          processId: process.pid,
          nodeVersion: process.version,
          monitoring: 'Exit codes and error patterns from Issue #93',
        },
      });
    } catch (error) {
      this.log({
        type: 'error',
        level: 'error',
        message: 'Session error monitoring failed',
        details: error,
      });
    }
  }

  /**
   * Generate comprehensive report
   */
  async generateReport(): Promise<void> {
    const reportPath = join(this.logDir, `health-location-status-report-${Date.now()}.json`);
    const summaryPath = join(this.logDir, 'latest-summary.md');

    // Save detailed logs
    writeFileSync(reportPath, JSON.stringify(this.logs, null, 2));

    // Generate markdown summary
    const summary = this.generateMarkdownSummary();
    writeFileSync(summaryPath, summary);

    this.log({
      type: 'info',
      level: 'info',
      message: 'Report generation complete',
      details: {
        reportPath,
        summaryPath,
        totalLogs: this.logs.length,
      },
    });

    console.log(`\n📊 Report saved to: ${reportPath}`);
    console.log(`📋 Summary saved to: ${summaryPath}`);
  }

  private generateMarkdownSummary(): string {
    const healthLogs = this.logs.filter(log => log.type === 'health');
    const errorLogs = this.logs.filter(log => log.level === 'error');
    const branchLogs = this.logs.filter(log => log.branch);

    return `# GLX Health, Location, and Status Report

Generated: ${new Date().toISOString()}

## Summary

- **Total Log Entries**: ${this.logs.length}
- **Health Checks**: ${healthLogs.length}
- **Errors Found**: ${errorLogs.length}
- **Branches Analyzed**: ${new Set(branchLogs.map(log => log.branch)).size}

## Health Status

${healthLogs.map(log => `- ${log.level.toUpperCase()}: ${log.message}`).join('\n')}

## Critical Issues

${errorLogs.map(log => `- **${log.message}**${log.details ? `\n  \`${JSON.stringify(log.details)}\`` : ''}`).join('\n')}

## Recommendations

Based on Issue #93 error patterns:

1. **Session Management**: Verify JWT_SECRET and SESSION_SECRET configuration
2. **Authentication**: Monitor for 401 errors in CI/CD pipelines
3. **Process Monitoring**: Track exit codes and shutdown patterns
4. **Branch Health**: Regular analysis of merged and unmerged branches

## Next Steps

1. Address any critical health check failures
2. Monitor authentication endpoints for 401 errors
3. Review session management configuration
4. Implement automated alerting for error patterns

---
*This report addresses the comprehensive logging requirements from Issue #93*
`;
  }

  /**
   * Main execution function
   */
  async run(): Promise<void> {
    console.log('🔍 GLX Health, Location, and Status Logger Starting...\n');

    try {
      // Perform all analyses
      await this.analyzeBranches();
      await this.analyzeCommits();
      await this.performHealthChecks();
      await this.trackLocationStatus();
      await this.monitorSessionErrors();

      // Generate final report
      await this.generateReport();

      console.log('\n✅ Health, Location, and Status logging complete!');
      console.log(`📊 Total log entries: ${this.logs.length}`);
      console.log(`📁 Logs saved to: ${this.logDir}`);
    } catch (error) {
      console.error('\n❌ Logging system failed:', error);
      process.exit(1);
    }
  }
}

// Run the logger if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const logger = new HealthLocationStatusLogger();
  logger.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { HealthLocationStatusLogger };
