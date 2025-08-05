#!/usr/bin/env tsx

/*
 * Copyright (c) 2025 GLX Civic Networking App
 *
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

/**
 * GLX Monitoring Dashboard
 *
 * Aggregates and displays health, location, and status monitoring results
 * from all analysis tools. Provides a unified view of repository health
 * as requested in Issue #93.
 *
 * Usage:
 *   npm run dashboard
 *   tsx scripts/monitoring-dashboard.ts
 */

import { readFileSync, existsSync, readdirSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface DashboardData {
  timestamp: string;
  healthStatus: {
    overall: 'healthy' | 'warning' | 'critical' | 'unknown';
    lastCheck: string;
    issues: string[];
    warnings: string[];
  };
  branchStatus: {
    total: number;
    merged: number;
    unmerged: number;
    critical: number;
    lastAnalysis: string;
  };
  commitStatus: {
    total: number;
    merged: number;
    unmerged: number;
    authRelated: number;
    lastAnalysis: string;
  };
  sessionErrors: {
    detected: boolean;
    count: number;
    patterns: string[];
    recommendations: string[];
  };
  alertLevel: 'green' | 'yellow' | 'red';
}

class MonitoringDashboard {
  private logsDir: string;

  constructor() {
    this.logsDir = join(__dirname, '../logs');
  }

  /**
   * Load latest health logs
   */
  private loadHealthLogs(): any {
    const healthDir = join(this.logsDir, 'health-location-status');
    if (!existsSync(healthDir)) {
      return null;
    }

    try {
      const files = readdirSync(healthDir)
        .filter(f => f.endsWith('.json') && f.includes('health-location-status-report'))
        .sort()
        .reverse();

      if (files.length === 0) return null;

      const latestFile = join(healthDir, files[0]);
      return JSON.parse(readFileSync(latestFile, 'utf8'));
    } catch (error) {
      console.error('Error loading health logs:', error);
      return null;
    }
  }

  /**
   * Load latest branch analysis
   */
  private loadBranchAnalysis(): any {
    const branchDir = join(this.logsDir, 'branch-commit-analysis');
    if (!existsSync(branchDir)) {
      return null;
    }

    try {
      const latestFile = join(branchDir, 'latest-analysis.json');
      if (!existsSync(latestFile)) {
        // Try to find the most recent file
        const files = readdirSync(branchDir)
          .filter(f => f.endsWith('.json') && f.includes('analysis-report'))
          .sort()
          .reverse();

        if (files.length === 0) return null;
        return JSON.parse(readFileSync(join(branchDir, files[0]), 'utf8'));
      }

      return JSON.parse(readFileSync(latestFile, 'utf8'));
    } catch (error) {
      console.error('Error loading branch analysis:', error);
      return null;
    }
  }

  /**
   * Analyze session error patterns
   */
  private analyzeSessionErrors(healthData: any, branchData: any): any {
    const sessionErrors = {
      detected: false,
      count: 0,
      patterns: [],
      recommendations: []
    };

    // Check health logs for session errors
    if (healthData && healthData.logs) {
      const errorLogs = healthData.logs.filter((log: any) =>
        log.level === 'error' &&
        (log.message.includes('401') ||
         log.message.includes('session') ||
         log.message.includes('auth'))
      );

      sessionErrors.count += errorLogs.length;
      sessionErrors.detected = errorLogs.length > 0;

      errorLogs.forEach((log: any) => {
        sessionErrors.patterns.push(`${log.type}: ${log.message}`);
      });
    }

    // Check branch data for auth-related issues
    if (branchData && branchData.sessionErrorAnalysis) {
      const authAnalysis = branchData.sessionErrorAnalysis;

      if (authAnalysis.authRelatedCommits > 0) {
        sessionErrors.detected = true;
        sessionErrors.count += authAnalysis.authRelatedCommits;
        sessionErrors.patterns.push(`${authAnalysis.authRelatedCommits} authentication-related commits`);
      }

      if (authAnalysis.configurationIssues && authAnalysis.configurationIssues.length > 0) {
        sessionErrors.detected = true;
        sessionErrors.patterns.push(...authAnalysis.configurationIssues);
      }

      if (authAnalysis.potentialCauses && authAnalysis.potentialCauses.length > 0) {
        sessionErrors.patterns.push(...authAnalysis.potentialCauses);
      }
    }

    // Generate recommendations
    if (sessionErrors.detected) {
      sessionErrors.recommendations = [
        'Verify JWT_SECRET and SESSION_SECRET configuration',
        'Check authentication middleware for 401 error handling',
        'Review recent authentication-related commits',
        'Monitor API endpoints for session failures',
        'Validate environment configuration in deployment'
      ];
    }

    return sessionErrors;
  }

  /**
   * Determine overall alert level
   */
  private calculateAlertLevel(dashboardData: DashboardData): 'green' | 'yellow' | 'red' {
    // Red alert conditions
    if (dashboardData.healthStatus.overall === 'critical') return 'red';
    if (dashboardData.sessionErrors.detected && dashboardData.sessionErrors.count > 5) return 'red';
    if (dashboardData.branchStatus.critical > 0) return 'red';

    // Yellow alert conditions
    if (dashboardData.healthStatus.overall === 'warning') return 'yellow';
    if (dashboardData.sessionErrors.detected) return 'yellow';
    if (dashboardData.healthStatus.warnings.length > 0) return 'yellow';

    // Green - all good
    return 'green';
  }

  /**
   * Generate dashboard data
   */
  async generateDashboard(): Promise<DashboardData> {
    console.log('📊 Generating monitoring dashboard...');

    const healthData = this.loadHealthLogs();
    const branchData = this.loadBranchAnalysis();

    // Extract health status
    const healthStatus = {
      overall: 'unknown' as 'healthy' | 'warning' | 'critical' | 'unknown',
      lastCheck: 'never',
      issues: [],
      warnings: []
    };

    if (healthData && healthData.logs && Array.isArray(healthData.logs)) {
      const errorLogs = healthData.logs.filter((log: any) => log.level === 'error');
      const warningLogs = healthData.logs.filter((log: any) => log.level === 'warn');

      healthStatus.lastCheck = (healthData.logs && healthData.logs.length > 0) ? healthData.logs[0]?.timestamp || 'unknown' : 'unknown';
      healthStatus.issues = errorLogs.map((log: any) => log.message);
      healthStatus.warnings = warningLogs.map((log: any) => log.message);

      if (errorLogs.length > 0) {
        healthStatus.overall = 'critical';
      } else if (warningLogs.length > 0) {
        healthStatus.overall = 'warning';
      } else {
        healthStatus.overall = 'healthy';
      }
    }

    // Extract branch status
    const branchStatus = {
      total: 0,
      merged: 0,
      unmerged: 0,
      critical: 0,
      lastAnalysis: 'never'
    };

    if (branchData) {
      branchStatus.total = branchData.repository?.totalBranches || 0;
      branchStatus.merged = branchData.summary?.mergedBranches || 0;
      branchStatus.unmerged = branchData.summary?.unmergedBranches || 0;
      branchStatus.critical = branchData.summary?.healthIssues || 0;
      branchStatus.lastAnalysis = branchData.timestamp || 'unknown';
    }

    // Extract commit status
    const commitStatus = {
      total: 0,
      merged: 0,
      unmerged: 0,
      authRelated: 0,
      lastAnalysis: 'never'
    };

    if (branchData) {
      commitStatus.total = branchData.repository?.totalCommits || 0;
      commitStatus.merged = branchData.summary?.mergedCommits || 0;
      commitStatus.unmerged = branchData.summary?.unmergedCommits || 0;
      commitStatus.authRelated = branchData.sessionErrorAnalysis?.authRelatedCommits || 0;
      commitStatus.lastAnalysis = branchData.timestamp || 'unknown';
    }

    // Analyze session errors
    const sessionErrors = this.analyzeSessionErrors(healthData, branchData);

    const dashboardData: DashboardData = {
      timestamp: new Date().toISOString(),
      healthStatus,
      branchStatus,
      commitStatus,
      sessionErrors,
      alertLevel: 'green' // Will be calculated below
    };

    // Calculate alert level
    dashboardData.alertLevel = this.calculateAlertLevel(dashboardData);

    return dashboardData;
  }

  /**
   * Display dashboard in console
   */
  displayConsole(data: DashboardData): void {
    const alertEmoji = {
      green: '🟢',
      yellow: '🟡',
      red: '🔴'
    };

    const statusEmoji = {
      healthy: '✅',
      warning: '⚠️',
      critical: '🚨',
      unknown: '❓'
    };

    console.log('\n' + '='.repeat(70));
    console.log('📊 GLX MONITORING DASHBOARD');
    console.log('='.repeat(70));
    console.log(`${alertEmoji[data.alertLevel]} Overall Status: ${data.alertLevel.toUpperCase()}`);
    console.log(`📅 Last Updated: ${data.timestamp}`);
    console.log('');

    console.log('🏥 HEALTH STATUS');
    console.log('-'.repeat(40));
    console.log(`${statusEmoji[data.healthStatus.overall]} Overall Health: ${data.healthStatus.overall.toUpperCase()}`);
    console.log(`📅 Last Check: ${data.healthStatus.lastCheck}`);
    console.log(`❌ Issues: ${data.healthStatus.issues.length}`);
    console.log(`⚠️  Warnings: ${data.healthStatus.warnings.length}`);

    if (data.healthStatus.issues.length > 0) {
      console.log('\n   Critical Issues:');
      data.healthStatus.issues.forEach(issue => console.log(`   - ${issue}`));
    }

    console.log('\n🌳 BRANCH STATUS');
    console.log('-'.repeat(40));
    console.log(`📊 Total Branches: ${data.branchStatus.total}`);
    console.log(`✅ Merged: ${data.branchStatus.merged}`);
    console.log(`🔄 Unmerged: ${data.branchStatus.unmerged}`);
    console.log(`🚨 Critical Issues: ${data.branchStatus.critical}`);
    console.log(`📅 Last Analysis: ${data.branchStatus.lastAnalysis}`);

    console.log('\n📝 COMMIT STATUS');
    console.log('-'.repeat(40));
    console.log(`📊 Total Commits: ${data.commitStatus.total}`);
    console.log(`✅ Merged: ${data.commitStatus.merged}`);
    console.log(`🔄 Unmerged: ${data.commitStatus.unmerged}`);
    console.log(`🔐 Auth-Related: ${data.commitStatus.authRelated}`);
    console.log(`📅 Last Analysis: ${data.commitStatus.lastAnalysis}`);

    console.log('\n🔐 SESSION ERROR ANALYSIS (Issue #93)');
    console.log('-'.repeat(40));
    console.log(`🚨 Errors Detected: ${data.sessionErrors.detected ? 'YES' : 'NO'}`);
    console.log(`📊 Error Count: ${data.sessionErrors.count}`);

    if (data.sessionErrors.patterns.length > 0) {
      console.log('\n   Error Patterns:');
      data.sessionErrors.patterns.slice(0, 5).forEach(pattern =>
        console.log(`   - ${pattern}`)
      );
    }

    if (data.sessionErrors.recommendations.length > 0) {
      console.log('\n   Recommendations:');
      data.sessionErrors.recommendations.slice(0, 3).forEach(rec =>
        console.log(`   - ${rec}`)
      );
    }

    console.log('\n' + '='.repeat(70));

    if (data.alertLevel === 'red') {
      console.log('🚨 CRITICAL ALERT: Immediate attention required!');
    } else if (data.alertLevel === 'yellow') {
      console.log('⚠️  WARNING: Monitor closely and address issues when possible');
    } else {
      console.log('✅ ALL SYSTEMS HEALTHY: Continue normal operations');
    }

    console.log('='.repeat(70));
  }

  /**
   * Generate HTML dashboard
   */
  generateHTML(data: DashboardData): string {
    const alertColor = {
      green: '#28a745',
      yellow: '#ffc107',
      red: '#dc3545'
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GLX Monitoring Dashboard</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f5f6fa; }
        .dashboard { max-width: 1200px; margin: 0 auto; }
        .header { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; text-align: center; }
        .alert { padding: 15px; border-radius: 8px; margin-bottom: 20px; color: white; font-weight: bold; text-align: center; }
        .alert.green { background: ${alertColor.green}; }
        .alert.yellow { background: ${alertColor.yellow}; color: #333; }
        .alert.red { background: ${alertColor.red}; }
        .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .card h3 { margin: 0 0 15px 0; color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; }
        .metric { display: flex; justify-content: space-between; margin-bottom: 10px; }
        .metric-label { color: #666; }
        .metric-value { font-weight: bold; color: #333; }
        .status-healthy { color: #28a745; }
        .status-warning { color: #ffc107; }
        .status-critical { color: #dc3545; }
        .issues-list { background: #f8f9fa; padding: 10px; border-radius: 4px; margin-top: 10px; }
        .issues-list ul { margin: 0; padding-left: 20px; }
        .footer { text-align: center; color: #666; margin-top: 30px; padding: 20px; }
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="header">
            <h1>🔍 GLX Monitoring Dashboard</h1>
            <p>Health, Location, and Status Monitoring (Issue #93)</p>
            <p><strong>Last Updated:</strong> ${data.timestamp}</p>
        </div>

        <div class="alert ${data.alertLevel}">
            ${data.alertLevel === 'green' ? '✅ ALL SYSTEMS HEALTHY' :
              data.alertLevel === 'yellow' ? '⚠️ WARNING CONDITIONS DETECTED' :
              '🚨 CRITICAL ISSUES REQUIRE ATTENTION'}
        </div>

        <div class="cards">
            <div class="card">
                <h3>🏥 Health Status</h3>
                <div class="metric">
                    <span class="metric-label">Overall Health:</span>
                    <span class="metric-value status-${data.healthStatus.overall}">${data.healthStatus.overall.toUpperCase()}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Last Check:</span>
                    <span class="metric-value">${new Date(data.healthStatus.lastCheck).toLocaleString()}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Critical Issues:</span>
                    <span class="metric-value">${data.healthStatus.issues.length}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Warnings:</span>
                    <span class="metric-value">${data.healthStatus.warnings.length}</span>
                </div>
                ${data.healthStatus.issues.length > 0 ? `
                <div class="issues-list">
                    <strong>Critical Issues:</strong>
                    <ul>
                        ${data.healthStatus.issues.map(issue => `<li>${issue}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}
            </div>

            <div class="card">
                <h3>🌳 Branch Status</h3>
                <div class="metric">
                    <span class="metric-label">Total Branches:</span>
                    <span class="metric-value">${data.branchStatus.total}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Merged:</span>
                    <span class="metric-value">${data.branchStatus.merged}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Unmerged:</span>
                    <span class="metric-value">${data.branchStatus.unmerged}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Critical Issues:</span>
                    <span class="metric-value">${data.branchStatus.critical}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Last Analysis:</span>
                    <span class="metric-value">${new Date(data.branchStatus.lastAnalysis).toLocaleString()}</span>
                </div>
            </div>

            <div class="card">
                <h3>📝 Commit Status</h3>
                <div class="metric">
                    <span class="metric-label">Total Commits:</span>
                    <span class="metric-value">${data.commitStatus.total}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Merged:</span>
                    <span class="metric-value">${data.commitStatus.merged}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Unmerged:</span>
                    <span class="metric-value">${data.commitStatus.unmerged}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Auth-Related:</span>
                    <span class="metric-value">${data.commitStatus.authRelated}</span>
                </div>
            </div>

            <div class="card">
                <h3>🔐 Session Error Analysis</h3>
                <div class="metric">
                    <span class="metric-label">Errors Detected:</span>
                    <span class="metric-value ${data.sessionErrors.detected ? 'status-critical' : 'status-healthy'}">
                        ${data.sessionErrors.detected ? 'YES' : 'NO'}
                    </span>
                </div>
                <div class="metric">
                    <span class="metric-label">Error Count:</span>
                    <span class="metric-value">${data.sessionErrors.count}</span>
                </div>
                ${data.sessionErrors.patterns.length > 0 ? `
                <div class="issues-list">
                    <strong>Error Patterns:</strong>
                    <ul>
                        ${data.sessionErrors.patterns.slice(0, 5).map(pattern => `<li>${pattern}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}
                ${data.sessionErrors.recommendations.length > 0 ? `
                <div class="issues-list">
                    <strong>Recommendations:</strong>
                    <ul>
                        ${data.sessionErrors.recommendations.slice(0, 3).map(rec => `<li>${rec}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}
            </div>
        </div>

        <div class="footer">
            <p><strong>GLX Civic Networking App - Monitoring Dashboard</strong></p>
            <p>This dashboard provides comprehensive health, location, and status monitoring as requested in Issue #93</p>
            <p>Last generated: ${data.timestamp}</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Save dashboard files
   */
  saveDashboard(data: DashboardData): void {
    const dashboardDir = join(this.logsDir, 'dashboard');
    if (!existsSync(dashboardDir)) {
      mkdirSync(dashboardDir, { recursive: true });
    }

    // Save JSON data
    const jsonPath = join(dashboardDir, 'latest-dashboard.json');
    writeFileSync(jsonPath, JSON.stringify(data, null, 2));

    // Save HTML dashboard
    const htmlPath = join(dashboardDir, 'dashboard.html');
    const html = this.generateHTML(data);
    writeFileSync(htmlPath, html);

    console.log(`\n📁 Dashboard saved to:`);
    console.log(`   JSON: ${jsonPath}`);
    console.log(`   HTML: ${htmlPath}`);
  }

  /**
   * Main execution function
   */
  async run(): Promise<void> {
    try {
      const dashboardData = await this.generateDashboard();
      this.displayConsole(dashboardData);
      this.saveDashboard(dashboardData);

      // Exit with appropriate code based on alert level
      if (dashboardData.alertLevel === 'red') {
        console.log('\n❌ Exiting with error code due to critical issues');
        process.exit(1);
      } else if (dashboardData.alertLevel === 'yellow') {
        console.log('\n⚠️  Exiting with warning status');
        process.exit(0);
      } else {
        console.log('\n✅ All systems healthy');
        process.exit(0);
      }

    } catch (error) {
      console.error('\n❌ Dashboard generation failed:', error);
      process.exit(1);
    }
  }
}

// Run the dashboard if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const dashboard = new MonitoringDashboard();
  dashboard.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { MonitoringDashboard };