#!/usr/bin/env node

/**
 * Smart Documentation Update Trigger
 * Analyzes code changes and determines which documentation needs updates
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SmartDocumentationUpdater {
  constructor() {
    this.rootPath = path.resolve(__dirname, '../..');
    this.changeAnalysisRules = {
      // API/Backend changes
      api: {
        patterns: [
          'GALAX_App_files/server/**/*.js',
          'GALAX_App_files/server/**/*.ts',
          'GALAX_App_files/api/**/*.js',
          'GALAX_App_files/api/**/*.ts',
          'GALAX_App_files/routes/**/*.js',
          'GALAX_App_files/routes/**/*.ts'
        ],
        affectedDocs: [
          'GALAX_App_files/docs/API_REFERENCE.md',
          'GALAX_App_files/docs/INTEGRATION_GUIDE.md',
          'README.md'
        ],
        updateReason: 'API or backend functionality changes detected'
      },
      
      // Security changes
      security: {
        patterns: [
          'GALAX_App_files/server/middleware/auth*.js',
          'GALAX_App_files/server/middleware/security*.js',
          'GALAX_App_files/server/utils/encryption*.js',
          'GALAX_App_files/server/utils/validation*.js',
          'GALAX_App_files/src/lib/auth*.js',
          'GALAX_App_files/src/lib/security*.js'
        ],
        affectedDocs: [
          'SECURITY.md',
          'GALAX_App_files/docs/COMPREHENSIVE_SECURITY_PROTECTION.md',
          'POST_QUANTUM_SECURITY_SUMMARY.md',
          'GALAX_App_files/SECURITY_IMPLEMENTATION.md'
        ],
        updateReason: 'Security implementation changes require documentation review'
      },
      
      // UI/Frontend changes
      ui: {
        patterns: [
          'GALAX_App_files/src/components/**/*.jsx',
          'GALAX_App_files/src/components/**/*.tsx',
          'GALAX_App_files/src/pages/**/*.jsx',
          'GALAX_App_files/src/pages/**/*.tsx',
          'GALAX_App_files/client/**/*.jsx',
          'GALAX_App_files/client/**/*.tsx'
        ],
        affectedDocs: [
          'GALAX_App_files/docs/USER_INTERFACE_GUIDE.md',
          'GALAX_App_files/docs/COMPONENT_DOCUMENTATION.md',
          'screenshots/README.md'
        ],
        updateReason: 'UI components or user interface changes detected'
      },
      
      // Configuration changes
      config: {
        patterns: [
          'package.json',
          'GALAX_App_files/package.json',
          'vercel.json',
          'GALAX_App_files/vite.config.js',
          'GALAX_App_files/tailwind.config.js',
          'GALAX_App_files/tsconfig.json',
          '.env.example',
          'GALAX_App_files/.env.example'
        ],
        affectedDocs: [
          'README.md',
          'DEPLOYMENT.md',
          'GALAX_App_files/SETUP_GUIDE.md',
          'GALAX_App_files/ENV_SETUP.md'
        ],
        updateReason: 'Configuration or setup requirements changed'
      },
      
      // Database/Schema changes
      database: {
        patterns: [
          'GALAX_App_files/server/models/**/*.js',
          'GALAX_App_files/server/schemas/**/*.js',
          'GALAX_App_files/server/database/**/*.js',
          'GALAX_App_files/database/**/*.sql'
        ],
        affectedDocs: [
          'GALAX_App_files/docs/DATABASE_SCHEMA.md',
          'GALAX_App_files/docs/DATA_MODEL.md',
          'DEVELOPMENT_ACTIVITY_HISTORY.md'
        ],
        updateReason: 'Database schema or data model changes detected'
      },
      
      // Testing changes
      testing: {
        patterns: [
          'GALAX_App_files/tests/**/*.js',
          'GALAX_App_files/tests/**/*.ts',
          'GALAX_App_files/e2e/**/*.js',
          'GALAX_App_files/e2e/**/*.ts',
          'GALAX_App_files/vitest.config.js',
          'GALAX_App_files/playwright.config.ts'
        ],
        affectedDocs: [
          'GALAX_App_files/docs/TESTING_GUIDE.md',
          'README.md'
        ],
        updateReason: 'Testing configuration or test suites updated'
      },
      
      // Deployment changes
      deployment: {
        patterns: [
          '.github/workflows/**/*.yml',
          'scripts/**/*.sh',
          'GALAX_App_files/scripts/**/*.sh',
          'Dockerfile',
          'docker-compose.yml'
        ],
        affectedDocs: [
          'DEPLOYMENT.md',
          'GALAX_App_files/PRODUCTION_MODE_GUIDE.md',
          '.github/workflows/README.md',
          'GITHUB_ACTIONS_STATUS_FIX.md'
        ],
        updateReason: 'Deployment or CI/CD pipeline changes detected'
      }
    };
  }

  /**
   * Analyze changed files and determine documentation updates needed
   */
  async analyzeChanges(changedFiles) {
    const updates = [];
    const affectedCategories = new Set();
    
    for (const [category, rule] of Object.entries(this.changeAnalysisRules)) {
      const matchedFiles = changedFiles.filter(file => 
        rule.patterns.some(pattern => this.matchesPattern(file, pattern))
      );
      
      if (matchedFiles.length > 0) {
        affectedCategories.add(category);
        
        for (const docPath of rule.affectedDocs) {
          const fullDocPath = path.resolve(this.rootPath, docPath);
          
          // Check if the documentation file exists
          try {
            await fs.access(fullDocPath);
            updates.push({
              category,
              docPath,
              fullPath: fullDocPath,
              reason: rule.updateReason,
              triggeringFiles: matchedFiles,
              priority: this.calculatePriority(category, matchedFiles)
            });
          } catch (error) {
            // Document doesn't exist, note it as needed
            updates.push({
              category,
              docPath,
              fullPath: fullDocPath,
              reason: `${rule.updateReason} (documentation file missing)`,
              triggeringFiles: matchedFiles,
              priority: 'high',
              action: 'create'
            });
          }
        }
      }
    }
    
    // Deduplicate updates by document path
    const uniqueUpdates = [];
    const seenDocs = new Set();
    
    for (const update of updates) {
      if (!seenDocs.has(update.docPath)) {
        seenDocs.add(update.docPath);
        uniqueUpdates.push(update);
      }
    }
    
    return {
      updates: uniqueUpdates,
      affectedCategories: Array.from(affectedCategories),
      summary: this.generateUpdateSummary(uniqueUpdates, affectedCategories)
    };
  }

  /**
   * Check if a file path matches a pattern (supports basic globbing)
   */
  matchesPattern(filePath, pattern) {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')  // ** matches any number of directories
      .replace(/\*/g, '[^/]*') // * matches anything except path separators
      .replace(/\./g, '\\.');   // Escape dots
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(filePath);
  }

  /**
   * Calculate update priority based on change type and scope
   */
  calculatePriority(category, matchedFiles) {
    // Security changes always high priority
    if (category === 'security') return 'high';
    
    // API changes are high priority if they affect routes
    if (category === 'api' && matchedFiles.some(f => f.includes('routes'))) {
      return 'high';
    }
    
    // Configuration changes affecting core files
    if (category === 'config' && matchedFiles.some(f => 
      f.includes('package.json') || f.includes('vercel.json'))) {
      return 'high';
    }
    
    // Multiple files changed in category
    if (matchedFiles.length >= 3) return 'medium';
    
    return 'low';
  }

  /**
   * Generate human-readable summary of required updates
   */
  generateUpdateSummary(updates, affectedCategories) {
    const priorityCounts = {
      high: updates.filter(u => u.priority === 'high').length,
      medium: updates.filter(u => u.priority === 'medium').length,
      low: updates.filter(u => u.priority === 'low').length
    };
    
    const createCount = updates.filter(u => u.action === 'create').length;
    
    return {
      totalDocs: updates.length,
      priorityCounts,
      categoriesAffected: affectedCategories.length,
      missingDocs: createCount,
      highPriorityItems: updates.filter(u => u.priority === 'high').map(u => ({
        doc: u.docPath,
        reason: u.reason
      }))
    };
  }

  /**
   * Generate markdown report of recommended updates
   */
  generateMarkdownReport(analysisResult) {
    const { updates, affectedCategories, summary } = analysisResult;
    
    let report = `# 📝 Documentation Update Analysis\n\n`;
    
    // Summary section
    report += `## 📊 Summary\n\n`;
    report += `- **Total documents affected**: ${summary.totalDocs}\n`;
    report += `- **Categories with changes**: ${affectedCategories.join(', ')}\n`;
    report += `- **Priority distribution**: ${summary.priorityCounts.high} high, ${summary.priorityCounts.medium} medium, ${summary.priorityCounts.low} low\n`;
    
    if (summary.missingDocs > 0) {
      report += `- **Missing documentation**: ${summary.missingDocs} files need to be created\n`;
    }
    
    report += `\n`;
    
    // High priority updates
    if (summary.priorityCounts.high > 0) {
      report += `## 🚨 High Priority Updates\n\n`;
      for (const update of updates.filter(u => u.priority === 'high')) {
        report += `### \`${update.docPath}\`\n`;
        report += `**Reason**: ${update.reason}\n\n`;
        report += `**Triggering files**: ${update.triggeringFiles.join(', ')}\n\n`;
        if (update.action === 'create') {
          report += `**Action**: Create missing documentation file\n\n`;
        }
      }
    }
    
    // Medium priority updates
    if (summary.priorityCounts.medium > 0) {
      report += `## ⚠️ Medium Priority Updates\n\n`;
      for (const update of updates.filter(u => u.priority === 'medium')) {
        report += `- **\`${update.docPath}\`**: ${update.reason}\n`;
      }
      report += `\n`;
    }
    
    // Low priority updates
    if (summary.priorityCounts.low > 0) {
      report += `## ℹ️ Low Priority Updates\n\n`;
      for (const update of updates.filter(u => u.priority === 'low')) {
        report += `- **\`${update.docPath}\`**: ${update.reason}\n`;
      }
      report += `\n`;
    }
    
    // Recommendations
    report += `## 💡 Recommendations\n\n`;
    
    if (summary.priorityCounts.high > 0) {
      report += `1. **Address high-priority updates immediately** before merging changes\n`;
    }
    
    if (summary.missingDocs > 0) {
      report += `2. **Create missing documentation files** to maintain comprehensive coverage\n`;
    }
    
    if (affectedCategories.includes('security')) {
      report += `3. **Security documentation requires immediate review** due to security-related changes\n`;
    }
    
    if (affectedCategories.includes('api')) {
      report += `4. **Update API examples and integration guides** to reflect endpoint changes\n`;
    }
    
    if (affectedCategories.includes('ui')) {
      report += `5. **Consider updating screenshots** if UI changes are user-visible\n`;
    }
    
    report += `\n---\n\n`;
    report += `*This analysis was automatically generated by the GALAX smart documentation system.*\n`;
    
    return report;
  }

  /**
   * Auto-update documentation metadata for affected files
   */
  async updateAffectedDocumentationMetadata(analysisResult) {
    const results = [];
    
    for (const update of analysisResult.updates) {
      if (update.action !== 'create') {
        try {
          // Import the metadata manager
          const { default: DocumentationManager } = await import('./doc-metadata.js');
          const docManager = new DocumentationManager();
          
          const result = await docManager.updateDocumentationMetadata(update.fullPath);
          results.push({
            ...result,
            priority: update.priority,
            reason: update.reason
          });
        } catch (error) {
          results.push({
            success: false,
            error: error.message,
            file: update.fullPath,
            priority: update.priority,
            reason: update.reason
          });
        }
      }
    }
    
    return results;
  }
}

// CLI functionality
async function main() {
  const updater = new SmartDocumentationUpdater();
  const command = process.argv[2];
  
  switch (command) {
    case 'analyze':
      const changedFilesInput = process.argv[3];
      if (!changedFilesInput) {
        console.error('Usage: analyze "file1.js,file2.ts,file3.jsx"');
        process.exit(1);
      }
      
      const changedFiles = changedFilesInput.split(',').map(f => f.trim());
      const analysis = await updater.analyzeChanges(changedFiles);
      
      console.log(JSON.stringify(analysis, null, 2));
      break;
      
    case 'report':
      const reportInput = process.argv[3];
      if (!reportInput) {
        console.error('Usage: report "file1.js,file2.ts,file3.jsx"');
        process.exit(1);
      }
      
      const reportFiles = reportInput.split(',').map(f => f.trim());
      const reportAnalysis = await updater.analyzeChanges(reportFiles);
      const markdownReport = updater.generateMarkdownReport(reportAnalysis);
      
      console.log(markdownReport);
      break;
      
    case 'update-metadata':
      const updateInput = process.argv[3];
      if (!updateInput) {
        console.error('Usage: update-metadata "file1.js,file2.ts,file3.jsx"');
        process.exit(1);
      }
      
      const updateFiles = updateInput.split(',').map(f => f.trim());
      const updateAnalysis = await updater.analyzeChanges(updateFiles);
      const updateResults = await updater.updateAffectedDocumentationMetadata(updateAnalysis);
      
      console.log(JSON.stringify(updateResults, null, 2));
      break;
      
    default:
      console.log(`Usage: ${path.basename(__filename)} <command> [options]
      
Commands:
  analyze "file1,file2,..."     - Analyze changes and determine documentation updates needed
  report "file1,file2,..."      - Generate markdown report of recommended updates
  update-metadata "file1,..."   - Update metadata for affected documentation files
`);
      process.exit(1);
  }
}

if (process.argv[1] === __filename) {
  main().catch(console.error);
}

export default SmartDocumentationUpdater;