#!/usr/bin/env node

/**
 * GLX: Connect the World - Civic Networking Platform
 * 
 * Copyright (c) 2025 [Your Name/Company]
 * Licensed under PolyForm Shield License 1.0.0
 * 
 * ⚠️  TERMS:
 * - Commercial use strictly prohibited without written permission from copyright holder
 * - Forking/derivative works prohibited without written permission
 * - Violations subject to legal action and damages
 * 
 * See LICENSE file in repository root for full terms.
 * Contact: [your-email@example.com] for licensing inquiries
 */

/**
 * Smart Documentation Update Trigger
 * Analyzes code changes and determines which documentation needs updates
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Logging utility with levels
class Logger {
  constructor(level = 'info') {
    this.levels = { error: 0, warn: 1, info: 2, debug: 3 };
    this.currentLevel = this.levels[level] || this.levels.info;
  }

  error(message, ...args) {
    if (this.currentLevel >= this.levels.error) {
      console.error(`❌ ERROR: ${message}`, ...args);
    }
  }

  warn(message, ...args) {
    if (this.currentLevel >= this.levels.warn) {
      console.warn(`⚠️  WARN: ${message}`, ...args);
    }
  }

  info(message, ...args) {
    if (this.currentLevel >= this.levels.info) {
      console.info(`ℹ️  INFO: ${message}`, ...args);
    }
  }

  debug(message, ...args) {
    if (this.currentLevel >= this.levels.debug) {
      console.debug(`🔍 DEBUG: ${message}`, ...args);
    }
  }
}

class SmartDocumentationUpdater {
  constructor(options = {}) {
    this.logger = new Logger(options.logLevel || process.env.LOG_LEVEL || 'info');
    this.rootPath = options.rootPath || this.findProjectRoot();
    this.dryRun = options.dryRun || false;

    if (!this.rootPath) {
      throw new Error('Could not determine project root path');
    }

    this.logger.debug(`Initialized with root path: ${this.rootPath}`);

    this.changeAnalysisRules = {
      // API/Backend changes
      api: {
        patterns: [
          'GLX_App_files/server/**/*.js',
          'GLX_App_files/server/**/*.ts',
          'GLX_App_files/api/**/*.js',
          'GLX_App_files/api/**/*.ts',
          'GLX_App_files/routes/**/*.js',
          'GLX_App_files/routes/**/*.ts'
        ],
        affectedDocs: [
          'GLX_App_files/docs/API_REFERENCE.md',
          'GLX_App_files/docs/INTEGRATION_GUIDE.md',
          'README.md'
        ],
        updateReason: 'API or backend functionality changes detected'
      },
      
      // Security changes
      security: {
        patterns: [
          'GLX_App_files/server/middleware/auth*.js',
          'GLX_App_files/server/middleware/security*.js',
          'GLX_App_files/server/utils/encryption*.js',
          'GLX_App_files/server/utils/validation*.js',
          'GLX_App_files/src/lib/auth*.js',
          'GLX_App_files/src/lib/security*.js'
        ],
        affectedDocs: [
          'SECURITY.md',
          'GLX_App_files/docs/COMPREHENSIVE_SECURITY_PROTECTION.md',
          'POST_QUANTUM_SECURITY_SUMMARY.md',
          'GLX_App_files/SECURITY_IMPLEMENTATION.md'
        ],
        updateReason: 'Security implementation changes require documentation review'
      },
      
      // UI/Frontend changes
      ui: {
        patterns: [
          'GLX_App_files/src/components/**/*.jsx',
          'GLX_App_files/src/components/**/*.tsx',
          'GLX_App_files/src/pages/**/*.jsx',
          'GLX_App_files/src/pages/**/*.tsx',
          'GLX_App_files/client/**/*.jsx',
          'GLX_App_files/client/**/*.tsx'
        ],
        affectedDocs: [
          'GLX_App_files/docs/USER_INTERFACE_GUIDE.md',
          'GLX_App_files/docs/COMPONENT_DOCUMENTATION.md',
          'screenshots/README.md'
        ],
        updateReason: 'UI components or user interface changes detected'
      },
      
      // Configuration changes
      config: {
        patterns: [
          'package.json',
          'GLX_App_files/package.json',
          'vercel.json',
          'GLX_App_files/vite.config.js',
          'GLX_App_files/tailwind.config.js',
          'GLX_App_files/tsconfig.json',
          '.env.example',
          'GLX_App_files/.env.example'
        ],
        affectedDocs: [
          'README.md',
          'DEPLOYMENT.md',
          'GLX_App_files/SETUP_GUIDE.md',
          'GLX_App_files/ENV_SETUP.md'
        ],
        updateReason: 'Configuration or setup requirements changed'
      },
      
      // Database/Schema changes
      database: {
        patterns: [
          'GLX_App_files/server/models/**/*.js',
          'GLX_App_files/server/schemas/**/*.js',
          'GLX_App_files/server/database/**/*.js',
          'GLX_App_files/database/**/*.sql'
        ],
        affectedDocs: [
          'GLX_App_files/docs/DATABASE_SCHEMA.md',
          'GLX_App_files/docs/DATA_MODEL.md',
          'DEVELOPMENT_ACTIVITY_HISTORY.md'
        ],
        updateReason: 'Database schema or data model changes detected'
      },
      
      // Testing changes
      testing: {
        patterns: [
          'GLX_App_files/tests/**/*.js',
          'GLX_App_files/tests/**/*.ts',
          'GLX_App_files/e2e/**/*.js',
          'GLX_App_files/e2e/**/*.ts',
          'GLX_App_files/vitest.config.js',
          'GLX_App_files/playwright.config.ts'
        ],
        affectedDocs: [
          'GLX_App_files/docs/TESTING_GUIDE.md',
          'README.md'
        ],
        updateReason: 'Testing configuration or test suites updated'
      },
      
      // Deployment changes
      deployment: {
        patterns: [
          '.github/workflows/**/*.yml',
          'scripts/**/*.sh',
          'GLX_App_files/scripts/**/*.sh',
          'Dockerfile',
          'docker-compose.yml'
        ],
        affectedDocs: [
          'DEPLOYMENT.md',
          'GLX_App_files/PRODUCTION_MODE_GUIDE.md',
          '.github/workflows/README.md',
          'GITHUB_ACTIONS_STATUS_FIX.md'
        ],
        updateReason: 'Deployment or CI/CD pipeline changes detected'
      }
    };
  }

  /**
   * Find the project root by looking for common indicators
   */
  findProjectRoot() {
    let currentDir = __dirname;
    const indicators = ['package.json', '.git', 'README.md', 'GLX_App_files'];

    // Walk up the directory tree
    for (let i = 0; i < 10; i++) { // Limit to prevent infinite loops
      try {
        const entries = require('fs').readdirSync(currentDir);
        const hasIndicator = indicators.some(indicator => entries.includes(indicator));
        
        if (hasIndicator) {
          this.logger.debug(`Found project root: ${currentDir}`);
          return currentDir;
        }
        
        const parentDir = path.dirname(currentDir);
        if (parentDir === currentDir) break; // Reached filesystem root
        currentDir = parentDir;
      } catch (error) {
        this.logger.warn(`Error reading directory ${currentDir}:`, error.message);
        break;
      }
    }

    // Fallback to resolving relative to current file
    this.logger.warn('Could not find project root, using fallback');
    return path.resolve(__dirname, '../..');
  }

  /**
   * Validate input parameters
   */
  validateInput(changedFiles) {
    if (!changedFiles || !Array.isArray(changedFiles)) {
      throw new Error('changedFiles must be a non-empty array');
    }

    if (changedFiles.length === 0) {
      throw new Error('No changed files provided');
    }

    // Validate file paths
    const invalidFiles = changedFiles.filter(file => 
      !file || typeof file !== 'string' || file.trim() === ''
    );

    if (invalidFiles.length > 0) {
      throw new Error(`Invalid file paths detected: ${invalidFiles.join(', ')}`);
    }

    this.logger.debug(`Validated ${changedFiles.length} input files`);
    return true;
  }

  /**
   * Analyze changed files and determine documentation updates needed
   */
  async analyzeChanges(changedFiles) {
    try {
      this.validateInput(changedFiles);
      
      const updates = [];
      const affectedCategories = new Set();
      
      this.logger.info(`Analyzing ${changedFiles.length} changed files`);
      
      for (const [category, rule] of Object.entries(this.changeAnalysisRules)) {
        try {
          const matchedFiles = changedFiles.filter(file => {
            try {
              return rule.patterns.some(pattern => this.matchesPattern(file, pattern));
            } catch (error) {
              this.logger.warn(`Error matching file ${file} against pattern:`, error.message);
              return false;
            }
          });
          
          if (matchedFiles.length > 0) {
            affectedCategories.add(category);
            this.logger.debug(`Category ${category} affected by ${matchedFiles.length} files`);
            
            for (const docPath of rule.affectedDocs) {
              try {
                const fullDocPath = path.resolve(this.rootPath, docPath);
                
                // Check if the documentation file exists
                let fileExists = false;
                try {
                  await fs.access(fullDocPath);
                  fileExists = true;
                } catch (error) {
                  // File doesn't exist
                  this.logger.debug(`Documentation file missing: ${docPath}`);
                }
                
                const priority = this.calculatePriority(category, matchedFiles);
                
                updates.push({
                  category,
                  docPath,
                  fullPath: fullDocPath,
                  reason: fileExists ? rule.updateReason : `${rule.updateReason} (documentation file missing)`,
                  triggeringFiles: [...matchedFiles], // Clone array
                  priority,
                  action: fileExists ? 'update' : 'create',
                  exists: fileExists
                });
              } catch (error) {
                this.logger.error(`Error processing doc path ${docPath}:`, error.message);
              }
            }
          }
        } catch (error) {
          this.logger.error(`Error processing category ${category}:`, error.message);
        }
      }
      
      // Deduplicate updates by document path
      const uniqueUpdates = this.deduplicateUpdates(updates);
      
      const result = {
        updates: uniqueUpdates,
        affectedCategories: Array.from(affectedCategories),
        summary: this.generateUpdateSummary(uniqueUpdates, affectedCategories)
      };
      
      this.logger.info(`Analysis complete: ${result.updates.length} documents affected across ${result.affectedCategories.length} categories`);
      return result;

    } catch (error) {
      this.logger.error('Failed to analyze changes:', error.message);
      throw new Error(`Analysis failed: ${error.message}`);
    }
  }

  /**
   * Deduplicate updates by document path, preferring higher priority
   */
  deduplicateUpdates(updates) {
    const updateMap = new Map();
    const priorityOrder = { high: 3, medium: 2, low: 1 };

    for (const update of updates) {
      const existing = updateMap.get(update.docPath);
      
      if (!existing || priorityOrder[update.priority] > priorityOrder[existing.priority]) {
        // Merge triggering files if we're replacing an existing update
        if (existing) {
          update.triggeringFiles = [
            ...new Set([...existing.triggeringFiles, ...update.triggeringFiles])
          ];
        }
        updateMap.set(update.docPath, update);
      } else if (existing) {
        // Merge triggering files from lower priority update
        existing.triggeringFiles = [
          ...new Set([...existing.triggeringFiles, ...update.triggeringFiles])
        ];
      }
    }

    return Array.from(updateMap.values());
  }

  /**
   * Check if a file path matches a pattern (supports basic globbing)
   */
  matchesPattern(filePath, pattern) {
    try {
      // Normalize paths to use forward slashes
      const normalizedFile = filePath.replace(/\\/g, '/');
      const normalizedPattern = pattern.replace(/\\/g, '/');
      
      // Convert glob pattern to regex
      const regexPattern = normalizedPattern
        .replace(/\*\*/g, '.*')      // ** matches any number of directories
        .replace(/\*/g, '[^/]*')     // * matches anything except path separators
        .replace(/\./g, '\\.')       // Escape dots
        .replace(/\+/g, '\\+')       // Escape plus signs
        .replace(/\?/g, '\\?');      // Escape question marks
      
      const regex = new RegExp(`^${regexPattern}$`, 'i'); // Case insensitive
      const matches = regex.test(normalizedFile);
      
      if (matches) {
        this.logger.debug(`File ${filePath} matches pattern ${pattern}`);
      }
      
      return matches;
    } catch (error) {
      this.logger.warn(`Error matching pattern ${pattern} against ${filePath}:`, error.message);
      return false;
    }
  }

  /**
   * Calculate update priority based on change type and scope
   */
  calculatePriority(category, matchedFiles) {
    try {
      // Security changes always high priority
      if (category === 'security') return 'high';
      
      // API changes are high priority if they affect routes
      if (category === 'api' && matchedFiles.some(f => f.toLowerCase().includes('route'))) {
        return 'high';
      }
      
      // Configuration changes affecting core files
      if (category === 'config' && matchedFiles.some(f => 
        f.includes('package.json') || f.includes('vercel.json'))) {
        return 'high';
      }
      
      // Database changes are typically high priority
      if (category === 'database') return 'high';
      
      // Multiple files changed in category
      if (matchedFiles.length >= 3) return 'medium';
      
      return 'low';
    } catch (error) {
      this.logger.warn(`Error calculating priority for ${category}:`, error.message);
      return 'medium'; // Safe default
    }
  }

  /**
   * Generate human-readable summary of required updates
   */
  generateUpdateSummary(updates, affectedCategories) {
    try {
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
        highPriorityItems: updates
          .filter(u => u.priority === 'high')
          .map(u => ({
            doc: u.docPath,
            reason: u.reason,
            category: u.category
          }))
      };
    } catch (error) {
      this.logger.error('Error generating update summary:', error.message);
      return {
        totalDocs: updates.length,
        priorityCounts: { high: 0, medium: 0, low: 0 },
        categoriesAffected: 0,
        missingDocs: 0,
        highPriorityItems: []
      };
    }
  }

  /**
   * Generate markdown report of recommended updates
   */
  generateMarkdownReport(analysisResult) {
    try {
      const { updates, affectedCategories, summary } = analysisResult;
      
      let report = `# 📝 Documentation Update Analysis\n\n`;
      report += `*Generated on ${new Date().toISOString()}*\n\n`;
      
      // Summary section
      report += `## 📊 Summary\n\n`;
      report += `- **Total documents affected**: ${summary.totalDocs}\n`;
      report += `- **Categories with changes**: ${affectedCategories.length > 0 ? affectedCategories.join(', ') : 'None'}\n`;
      report += `- **Priority distribution**: ${summary.priorityCounts.high} high, ${summary.priorityCounts.medium} medium, ${summary.priorityCounts.low} low\n`;
      
      if (summary.missingDocs > 0) {
        report += `- **Missing documentation**: ${summary.missingDocs} files need to be created\n`;
      }
      
      report += `\n`;
      
      // High priority updates
      if (summary.priorityCounts.high > 0) {
        report += `## 🚨 High Priority Updates\n\n`;
        for (const update of updates.filter(u => u.priority === 'high')) {
          report += `### \`${update.docPath}\`\n\n`;
          report += `**Category**: ${update.category}\n\n`;
          report += `**Reason**: ${update.reason}\n\n`;
          report += `**Triggering files**:\n`;
          for (const file of update.triggeringFiles) {
            report += `- \`${file}\`\n`;
          }
          report += `\n`;
          if (update.action === 'create') {
            report += `**⚠️ Action Required**: Create missing documentation file\n\n`;
          }
          report += `---\n\n`;
        }
      }
      
      // Medium priority updates
      if (summary.priorityCounts.medium > 0) {
        report += `## ⚠️ Medium Priority Updates\n\n`;
        for (const update of updates.filter(u => u.priority === 'medium')) {
          report += `### \`${update.docPath}\`\n`;
          report += `**Category**: ${update.category} | **Reason**: ${update.reason}\n\n`;
          report += `**Files**: ${update.triggeringFiles.join(', ')}\n\n`;
        }
      }
      
      // Low priority updates
      if (summary.priorityCounts.low > 0) {
        report += `## ℹ️ Low Priority Updates\n\n`;
        for (const update of updates.filter(u => u.priority === 'low')) {
          report += `- **\`${update.docPath}\`** (${update.category}): ${update.reason}\n`;
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
      
      if (updates.length === 0) {
        report += `✅ **No documentation updates needed** based on current analysis rules.\n`;
      }
      
      report += `\n---\n\n`;
      report += `*This analysis was automatically generated by the GLX smart documentation system.*\n`;
      
      return report;
    } catch (error) {
      this.logger.error('Error generating markdown report:', error.message);
      return `# Documentation Update Analysis\n\n❌ Error generating report: ${error.message}\n`;
    }
  }

  /**
   * Auto-update documentation metadata for affected files
   */
  async updateAffectedDocumentationMetadata(analysisResult) {
    const results = [];

    if (!analysisResult || !analysisResult.updates) {
      return results;
    }

    this.logger.info(`Updating metadata for ${analysisResult.updates.length} documents`);

    for (const update of analysisResult.updates) {
      if (update.action !== 'create' && update.exists) {
        try {
          if (this.dryRun) {
            results.push({
              success: true,
              file: update.fullPath,
              priority: update.priority,
              reason: update.reason,
              dryRun: true,
              message: 'Would update metadata (dry run)'
            });
            continue;
          }

          // Try to import the metadata manager
          try {
            const { default: DocumentationManager } = await import('./doc-metadata.js');
            const docManager = new DocumentationManager();
            
            const result = await docManager.updateDocumentationMetadata(update.fullPath);
            results.push({
              ...result,
              priority: update.priority,
              reason: update.reason
            });
          } catch (importError) {
            this.logger.warn(`Could not import DocumentationManager: ${importError.message}`);
            results.push({
              success: false,
              error: `DocumentationManager not available: ${importError.message}`,
              file: update.fullPath,
              priority: update.priority,
              reason: update.reason
            });
          }
        } catch (error) {
          this.logger.error(`Failed to update metadata for ${update.fullPath}:`, error.message);
          results.push({
            success: false,
            error: error.message,
            file: update.fullPath,
            priority: update.priority,
            reason: update.reason
          });
        }
      } else {
        results.push({
          success: false,
          skipped: true,
          reason: update.action === 'create' ? 'File needs to be created first' : 'File does not exist',
          file: update.fullPath,
          priority: update.priority
        });
      }
    }

    this.logger.info(`Metadata update complete: ${results.filter(r => r.success).length} successful, ${results.filter(r => !r.success).length} failed`);
    return results;
  }
}

// Enhanced CLI functionality with better error handling
async function main() {
  const logger = new Logger(process.env.LOG_LEVEL || 'info');

  try {
    const command = process.argv[2];
    const options = {
      dryRun: process.argv.includes('--dry-run'),
      logLevel: process.env.LOG_LEVEL || 'info'
    };

    const updater = new SmartDocumentationUpdater(options);

    switch (command) {
      case 'analyze': {
        const changedFilesInput = process.argv[3];
        if (!changedFilesInput) {
          console.error('❌ Usage: analyze "file1.js,file2.ts,file3.jsx" [--dry-run]');
          process.exit(1);
        }
        
        const changedFiles = changedFilesInput.split(',').map(f => f.trim()).filter(f => f);
        
        if (changedFiles.length === 0) {
          console.error('❌ No valid files provided');
          process.exit(1);
        }
        
        logger.info(`Analyzing ${changedFiles.length} changed files`);
        const analysis = await updater.analyzeChanges(changedFiles);
        
        console.log(JSON.stringify(analysis, null, 2));
        break;
      }
      
      case 'report': {
        const reportInput = process.argv[3];
        if (!reportInput) {
          console.error('❌ Usage: report "file1.js,file2.ts,file3.jsx" [--dry-run]');
          process.exit(1);
        }
        
        const reportFiles = reportInput.split(',').map(f => f.trim()).filter(f => f);
        
        if (reportFiles.length === 0) {
          console.error('❌ No valid files provided');
          process.exit(1);
        }
        
        logger.info(`Generating report for ${reportFiles.length} changed files`);
        const reportAnalysis = await updater.analyzeChanges(reportFiles);
        const markdownReport = updater.generateMarkdownReport(reportAnalysis);
        
        console.log(markdownReport);
        break;
      }
      
      case 'update-metadata': {
        const updateInput = process.argv[3];
        if (!updateInput) {
          console.error('❌ Usage: update-metadata "file1.js,file2.ts,file3.jsx" [--dry-run]');
          process.exit(1);
        }
        
        const updateFiles = updateInput.split(',').map(f => f.trim()).filter(f => f);
        
        if (updateFiles.length === 0) {
          console.error('❌ No valid files provided');
          process.exit(1);
        }
        
        logger.info(`Processing metadata updates for ${updateFiles.length} changed files`);
        const updateAnalysis = await updater.analyzeChanges(updateFiles);
        const updateResults = await updater.updateAffectedDocumentationMetadata(updateAnalysis);
        
        console.log(JSON.stringify(updateResults, null, 2));
        break;
      }
      
      default:
        console.log(`📝 GLX Smart Documentation Update Trigger

Usage: ${path.basename(process.argv[1])} <command> [options]

Commands:
  analyze "file1,file2,..."     - Analyze changes and determine documentation updates needed
  report "file1,file2,..."      - Generate markdown report of recommended updates  
  update-metadata "file1,..."   - Update metadata for affected documentation files

Options:
  --dry-run                     - Show what would be done without making changes

Environment Variables:
  LOG_LEVEL                     - Set logging level (error, warn, info, debug)

Examples:
  ${path.basename(process.argv[1])} analyze "src/api/users.js,README.md"
  ${path.basename(process.argv[1])} report "components/Header.jsx" --dry-run
  ${path.basename(process.argv[1])} update-metadata "server/auth.js"
`);
        process.exit(command ? 1 : 0);
    }

    logger.info('Operation completed successfully');

  } catch (error) {
    logger.error('Operation failed:', error.message);
    if (logger.currentLevel >= logger.levels.debug) {
      logger.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
}

export default SmartDocumentationUpdater;
