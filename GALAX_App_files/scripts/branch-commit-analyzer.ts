#!/usr/bin/env tsx

/*
 * Copyright (c) 2025 GALAX Civic Networking App
 *
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

/**
 * GALAX Branch and Commit Analyzer
 *
 * Comprehensive analysis of all branches (merged and unmerged) and commits
 * with health, location, and status tracking as requested in Issue #93.
 *
 * Usage:
 *   npm run branch:analyze
 *   tsx scripts/branch-commit-analyzer.ts
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface BranchAnalysis {
  name: string;
  type: 'local' | 'remote' | 'tracking';
  status: 'merged' | 'unmerged' | 'active' | 'stale' | 'abandoned';
  lastCommit: {
    hash: string;
    shortHash: string;
    date: string;
    author: string;
    message: string;
  };
  commits: CommitAnalysis[];
  mergeStatus: {
    isMerged: boolean;
    mergedInto?: string;
    mergeDate?: string;
    mergeCommit?: string;
  };
  healthStatus: {
    hasErrors: boolean;
    hasConflicts: boolean;
    isBuilding: boolean;
    lastBuildStatus?: 'success' | 'failure' | 'unknown';
  };
  location: {
    remote?: string;
    tracking?: string;
    ahead: number;
    behind: number;
  };
}

interface CommitAnalysis {
  hash: string;
  shortHash: string;
  author: string;
  email: string;
  date: string;
  timestamp: number;
  message: string;
  filesChanged: string[];
  insertions: number;
  deletions: number;
  mergeStatus: {
    isMerged: boolean;
    mergedInto: string[];
    isUnmerged: boolean;
  };
  healthIndicators: {
    affectsAuth: boolean;
    affectsDatabase: boolean;
    affectsTests: boolean;
    affectsConfig: boolean;
    affectsCI: boolean;
  };
  location: {
    branch: string;
    remoteRefs: string[];
  };
}

interface AnalysisReport {
  timestamp: string;
  repository: {
    url: string;
    currentBranch: string;
    totalCommits: number;
    totalBranches: number;
  };
  branches: BranchAnalysis[];
  commits: CommitAnalysis[];
  summary: {
    mergedBranches: number;
    unmergedBranches: number;
    mergedCommits: number;
    unmergedCommits: number;
    healthIssues: number;
    criticalIssues: string[];
  };
  sessionErrorAnalysis: {
    authRelatedCommits: number;
    configurationIssues: string[];
    potentialCauses: string[];
  };
}

class BranchCommitAnalyzer {
  private repoPath: string;

  constructor() {
    this.repoPath = join(__dirname, '../..');
  }

  private async executeGit(command: string): Promise<string> {
    try {
      const { stdout } = await execAsync(`cd ${this.repoPath} && git ${command}`);
      return stdout.trim();
    } catch (error) {
      console.error(`Git command failed: git ${command}`);
      console.error(error);
      return '';
    }
  }

  /**
   * Get all branches with detailed information
   */
  async getAllBranches(): Promise<BranchAnalysis[]> {
    console.log('🔍 Analyzing all branches (merged and unmerged)...');

    const branches: BranchAnalysis[] = [];

    try {
      // Get all branches including remotes with detailed info
      const branchOutput = await this.executeGit('branch -av --format="%(refname:short)|%(objectname)|%(objectname:short)|%(committerdate:iso8601)|%(authorname)|%(subject)|%(upstream)"');

      const branchLines = branchOutput.split('\n').filter(line => line.trim() && !line.includes('HEAD'));

      for (const line of branchLines) {
        const [name, fullHash, shortHash, date, author, message, upstream] = line.split('|');

        if (!name || name.trim() === '') continue;

        const cleanName = name.trim().replace('remotes/', '').replace('origin/', '');

        // Determine branch type
        let type: 'local' | 'remote' | 'tracking' = 'local';
        if (name.includes('remotes/')) {
          type = 'remote';
        } else if (upstream && upstream.trim()) {
          type = 'tracking';
        }

        // Check merge status
        const mergedOutput = await this.executeGit(`branch --merged | grep -F "${cleanName}" || echo ""`);
        const isMerged = mergedOutput.trim() !== '';

        // Get detailed merge information
        let mergeInfo = { isMerged, mergedInto: undefined, mergeDate: undefined, mergeCommit: undefined };
        if (isMerged) {
          try {
            const mergeCommitOutput = await this.executeGit(`log --oneline --merges --grep="${cleanName}" --format="%H|%ai" | head -1`);
            if (mergeCommitOutput) {
              const [mergeCommit, mergeDate] = mergeCommitOutput.split('|');
              mergeInfo = { ...mergeInfo, mergeCommit, mergeDate, mergedInto: 'main' };
            }
          } catch (error) {
            console.warn(`Could not get merge info for ${cleanName}`);
          }
        }

        // Check for conflicts and build status
        const conflictCheck = await this.executeGit(`ls-files -u | grep . || echo ""`);
        const hasConflicts = conflictCheck.trim() !== '';

        // Determine branch status
        const now = new Date();
        const branchDate = new Date(date);
        const daysSinceLastCommit = (now.getTime() - branchDate.getTime()) / (1000 * 60 * 60 * 24);

        let status: 'merged' | 'unmerged' | 'active' | 'stale' | 'abandoned' = 'unmerged';
        if (isMerged) {
          status = 'merged';
        } else if (daysSinceLastCommit <= 7) {
          status = 'active';
        } else if (daysSinceLastCommit <= 30) {
          status = 'stale';
        } else {
          status = 'abandoned';
        }

        // Get tracking information
        const trackingInfo = await this.executeGit(`rev-list --left-right --count ${cleanName}...origin/${cleanName} 2>/dev/null || echo "0	0"`);
        const [ahead, behind] = trackingInfo.split('\t').map(n => parseInt(n) || 0);

        // Get commits for this branch
        const branchCommits = await this.getBranchCommits(cleanName);

        const branchAnalysis: BranchAnalysis = {
          name: cleanName,
          type,
          status,
          lastCommit: {
            hash: fullHash || '',
            shortHash: shortHash || '',
            date,
            author: author || '',
            message: message || ''
          },
          commits: branchCommits,
          mergeStatus: mergeInfo,
          healthStatus: {
            hasErrors: false,
            hasConflicts,
            isBuilding: false,
            lastBuildStatus: 'unknown'
          },
          location: {
            remote: type === 'remote' ? name : undefined,
            tracking: upstream || undefined,
            ahead,
            behind
          }
        };

        branches.push(branchAnalysis);

        console.log(`  ✓ ${cleanName} (${status}) - ${branchCommits.length} commits`);
      }

    } catch (error) {
      console.error('Error analyzing branches:', error);
    }

    return branches;
  }

  /**
   * Get all commits for a specific branch
   */
  async getBranchCommits(branchName: string): Promise<CommitAnalysis[]> {
    const commits: CommitAnalysis[] = [];

    try {
      // Get commits for this branch
      const commitOutput = await this.executeGit(`log ${branchName} --format="%H|%h|%an|%ae|%ai|%at|%s" --numstat`);

      let currentCommit: any = null;
      const lines = commitOutput.split('\n');

      for (const line of lines) {
        if (line.includes('|') && line.length > 40) {
          // This is a commit line
          if (currentCommit) {
            commits.push(currentCommit);
          }

          const [hash, shortHash, author, email, date, timestamp, message] = line.split('|');

          currentCommit = {
            hash,
            shortHash,
            author,
            email,
            date,
            timestamp: parseInt(timestamp) * 1000,
            message,
            filesChanged: [],
            insertions: 0,
            deletions: 0,
            mergeStatus: {
              isMerged: false,
              mergedInto: [],
              isUnmerged: false
            },
            healthIndicators: {
              affectsAuth: false,
              affectsDatabase: false,
              affectsTests: false,
              affectsConfig: false,
              affectsCI: false
            },
            location: {
              branch: branchName,
              remoteRefs: []
            }
          };
        } else if (line.trim() && currentCommit && line.includes('\t')) {
          // This is a file change line
          const [insertions, deletions, filename] = line.split('\t');
          if (filename) {
            currentCommit.filesChanged.push(filename);
            currentCommit.insertions += parseInt(insertions) || 0;
            currentCommit.deletions += parseInt(deletions) || 0;

            // Check health indicators
            if (filename.includes('auth') || filename.includes('login') || filename.includes('session')) {
              currentCommit.healthIndicators.affectsAuth = true;
            }
            if (filename.includes('database') || filename.includes('.db') || filename.includes('migration')) {
              currentCommit.healthIndicators.affectsDatabase = true;
            }
            if (filename.includes('test') || filename.includes('.test.') || filename.includes('.spec.')) {
              currentCommit.healthIndicators.affectsTests = true;
            }
            if (filename.includes('config') || filename.includes('.env') || filename.includes('package.json')) {
              currentCommit.healthIndicators.affectsConfig = true;
            }
            if (filename.includes('.github') || filename.includes('workflow') || filename.includes('ci.yml')) {
              currentCommit.healthIndicators.affectsCI = true;
            }
          }
        }
      }

      // Add the last commit
      if (currentCommit) {
        commits.push(currentCommit);
      }

      // Check merge status for each commit
      for (const commit of commits) {
        try {
          const mergeCheck = await this.executeGit(`branch --contains ${commit.hash} | grep -v "^\\*" | head -5`);
          const mergedBranches = mergeCheck.split('\n').map(b => b.trim()).filter(b => b);

          commit.mergeStatus.isMerged = mergedBranches.length > 0;
          commit.mergeStatus.mergedInto = mergedBranches;
          commit.mergeStatus.isUnmerged = !commit.mergeStatus.isMerged;
        } catch (error) {
          // Continue processing if merge check fails
        }
      }

    } catch (error) {
      console.error(`Error getting commits for branch ${branchName}:`, error);
    }

    return commits;
  }

  /**
   * Analyze session-related errors from Issue #93
   */
  async analyzeSessionErrors(commits: CommitAnalysis[]): Promise<any> {
    console.log('🔍 Analyzing session and authentication patterns...');

    const authRelatedCommits = commits.filter(commit =>
      commit.healthIndicators.affectsAuth ||
      commit.message.toLowerCase().includes('auth') ||
      commit.message.toLowerCase().includes('session') ||
      commit.message.toLowerCase().includes('login') ||
      commit.message.toLowerCase().includes('401')
    );

    const configurationIssues: string[] = [];
    const potentialCauses: string[] = [];

    // Check for common issues that could cause 401 errors
    for (const commit of authRelatedCommits) {
      if (commit.filesChanged.some(file => file.includes('.env'))) {
        potentialCauses.push(`Commit ${commit.shortHash}: Environment configuration changes`);
      }
      if (commit.filesChanged.some(file => file.includes('auth'))) {
        potentialCauses.push(`Commit ${commit.shortHash}: Authentication system changes`);
      }
      if (commit.message.toLowerCase().includes('fix') && commit.message.toLowerCase().includes('401')) {
        potentialCauses.push(`Commit ${commit.shortHash}: Direct 401 error fix attempt`);
      }
    }

    // Check for missing configuration
    try {
      const envCheck = await this.executeGit('ls-files | grep -E "\\.(env|config)" | head -5');
      if (!envCheck.includes('.env')) {
        configurationIssues.push('No .env file found in repository');
      }
    } catch (error) {
      configurationIssues.push('Could not check environment configuration');
    }

    // Check for session management issues
    try {
      const sessionFiles = await this.executeGit('ls-files | grep -i session | head -5');
      if (sessionFiles.trim() === '') {
        configurationIssues.push('No session management files found');
      }
    } catch (error) {
      configurationIssues.push('Could not check session files');
    }

    return {
      authRelatedCommits: authRelatedCommits.length,
      configurationIssues,
      potentialCauses,
      authCommitDetails: authRelatedCommits.slice(0, 10).map(c => ({
        hash: c.shortHash,
        message: c.message,
        date: c.date,
        filesChanged: c.filesChanged.length
      }))
    };
  }

  /**
   * Generate comprehensive analysis report
   */
  async generateReport(): Promise<AnalysisReport> {
    console.log('📊 Starting comprehensive branch and commit analysis...');

    const branches = await this.getAllBranches();
    const allCommits = branches.flatMap(branch => branch.commits);

    // Remove duplicate commits (same hash)
    const uniqueCommits = allCommits.filter((commit, index, array) =>
      array.findIndex(c => c.hash === commit.hash) === index
    );

    const sessionErrorAnalysis = await this.analyzeSessionErrors(uniqueCommits);

    // Get repository information
    const currentBranch = await this.executeGit('branch --show-current');
    const remoteUrl = await this.executeGit('remote get-url origin || echo "unknown"');

    const mergedBranches = branches.filter(b => b.status === 'merged').length;
    const unmergedBranches = branches.filter(b => b.status !== 'merged').length;
    const mergedCommits = uniqueCommits.filter(c => c.mergeStatus.isMerged).length;
    const unmergedCommits = uniqueCommits.filter(c => c.mergeStatus.isUnmerged).length;

    const healthIssues = branches.filter(b => b.healthStatus.hasConflicts || b.healthStatus.hasErrors).length;
    const criticalIssues: string[] = [];

    // Identify critical issues
    if (sessionErrorAnalysis.authRelatedCommits > 0) {
      criticalIssues.push(`${sessionErrorAnalysis.authRelatedCommits} authentication-related commits found`);
    }
    if (sessionErrorAnalysis.configurationIssues.length > 0) {
      criticalIssues.push(`Configuration issues detected: ${sessionErrorAnalysis.configurationIssues.join(', ')}`);
    }
    if (healthIssues > 0) {
      criticalIssues.push(`${healthIssues} branches have health issues`);
    }

    const report: AnalysisReport = {
      timestamp: new Date().toISOString(),
      repository: {
        url: remoteUrl,
        currentBranch: currentBranch,
        totalCommits: uniqueCommits.length,
        totalBranches: branches.length
      },
      branches,
      commits: uniqueCommits,
      summary: {
        mergedBranches,
        unmergedBranches,
        mergedCommits,
        unmergedCommits,
        healthIssues,
        criticalIssues
      },
      sessionErrorAnalysis
    };

    return report;
  }

  /**
   * Save report to files
   */
  async saveReport(report: AnalysisReport): Promise<void> {
    const reportsDir = join(__dirname, '../logs/branch-commit-analysis');
    if (!existsSync(reportsDir)) {
      mkdirSync(reportsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const jsonPath = join(reportsDir, `analysis-report-${timestamp}.json`);
    const markdownPath = join(reportsDir, `analysis-summary-${timestamp}.md`);
    const latestPath = join(reportsDir, 'latest-analysis.json');

    // Save detailed JSON report
    writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    writeFileSync(latestPath, JSON.stringify(report, null, 2));

    // Generate markdown summary
    const markdown = this.generateMarkdownSummary(report);
    writeFileSync(markdownPath, markdown);

    console.log(`\n📁 Report saved to:`);
    console.log(`   JSON: ${jsonPath}`);
    console.log(`   Markdown: ${markdownPath}`);
    console.log(`   Latest: ${latestPath}`);
  }

  /**
   * Generate markdown summary
   */
  private generateMarkdownSummary(report: AnalysisReport): string {
    return `# GALAX Branch and Commit Analysis Report

**Generated:** ${report.timestamp}
**Repository:** ${report.repository.url}
**Current Branch:** ${report.repository.currentBranch}

## Executive Summary

This comprehensive analysis addresses Issue #93 requirements for health, location, and status checks across all branches and commits.

### Repository Overview
- **Total Branches:** ${report.repository.totalBranches}
- **Total Commits:** ${report.repository.totalCommits}
- **Current Branch:** ${report.repository.currentBranch}

### Branch Analysis
- **Merged Branches:** ${report.summary.mergedBranches}
- **Unmerged Branches:** ${report.summary.unmergedBranches}
- **Branches with Health Issues:** ${report.summary.healthIssues}

### Commit Analysis
- **Merged Commits:** ${report.summary.mergedCommits}
- **Unmerged Commits:** ${report.summary.unmergedCommits}

## Session Error Analysis (Issue #93)

**Authentication-Related Commits:** ${report.sessionErrorAnalysis.authRelatedCommits}

### Configuration Issues
${report.sessionErrorAnalysis.configurationIssues.map(issue => `- ${issue}`).join('\n')}

### Potential Causes of 401 Errors
${report.sessionErrorAnalysis.potentialCauses.map(cause => `- ${cause}`).join('\n')}

## Critical Issues

${report.summary.criticalIssues.map(issue => `⚠️ ${issue}`).join('\n')}

## Branch Status Details

### Merged Branches
${report.branches.filter(b => b.status === 'merged').map(branch =>
`- **${branch.name}** (${branch.type}) - Last commit: ${branch.lastCommit.shortHash} by ${branch.lastCommit.author}`
).join('\n')}

### Unmerged Branches
${report.branches.filter(b => b.status !== 'merged').map(branch =>
`- **${branch.name}** (${branch.status}) - ${branch.commits.length} commits, ahead: ${branch.location.ahead}, behind: ${branch.location.behind}`
).join('\n')}

## Health and Location Status

### Branches with Issues
${report.branches.filter(b => b.healthStatus.hasConflicts || b.healthStatus.hasErrors).map(branch =>
`- **${branch.name}**: ${branch.healthStatus.hasConflicts ? 'Has Conflicts' : ''} ${branch.healthStatus.hasErrors ? 'Has Errors' : ''}`
).join('\n')}

### Recent Authentication Changes
${report.sessionErrorAnalysis.authRelatedCommits > 0 ?
  `Found ${report.sessionErrorAnalysis.authRelatedCommits} authentication-related commits` :
  'No recent authentication changes found'}

## Recommendations

Based on this analysis for Issue #93:

1. **Session Management**: Review authentication configuration in commits affecting auth system
2. **Branch Health**: Address any conflicts or errors in unmerged branches
3. **Merge Status**: Consider merging or cleaning up stale/abandoned branches
4. **Configuration**: Ensure environment variables are properly configured for authentication
5. **Monitoring**: Set up automated monitoring for 401 errors and session failures

## Location and Deployment Status

- **Repository URL**: ${report.repository.url}
- **Current Branch**: ${report.repository.currentBranch}
- **Analysis Timestamp**: ${report.timestamp}

---

*This report provides comprehensive analysis of all branches and commits as requested in Issue #93, with specific focus on session management and authentication error patterns.*
`;
  }

  /**
   * Main execution function
   */
  async run(): Promise<void> {
    console.log('🚀 GALAX Branch and Commit Analyzer Starting...\n');

    try {
      const report = await this.generateReport();
      await this.saveReport(report);

      console.log('\n✅ Analysis Complete!');
      console.log(`📊 Analyzed ${report.repository.totalBranches} branches and ${report.repository.totalCommits} commits`);
      console.log(`🔍 Found ${report.summary.criticalIssues.length} critical issues`);

      if (report.summary.criticalIssues.length > 0) {
        console.log('\n⚠️  Critical Issues:');
        report.summary.criticalIssues.forEach(issue => console.log(`   - ${issue}`));
      }

    } catch (error) {
      console.error('\n❌ Analysis failed:', error);
      process.exit(1);
    }
  }
}

// Run the analyzer if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const analyzer = new BranchCommitAnalyzer();
  analyzer.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { BranchCommitAnalyzer };