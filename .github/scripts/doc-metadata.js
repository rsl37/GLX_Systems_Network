#!/usr/bin/env node

/**
 * Documentation Metadata Manager
 * Manages documentation metadata headers and validates best practices
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DocumentationManager {
  constructor() {
    this.rootPath = path.resolve(__dirname, '../..');
    this.docPaths = [
      '.',
      'GLX_App_files/docs',
      '.github',
      'docs-backup'
    ];
    this.excludePatterns = [
      'node_modules',
      '.git',
      'external',
      'screenshots',
      'license-compliance-reports'
    ];
  }

  /**
   * Generate standardized documentation metadata
   */
  generateMetadata(filePath, existingContent = '') {
    const fileName = path.basename(filePath, '.md');
    const now = new Date().toISOString().split('T')[0];
    const relativePath = path.relative(this.rootPath, filePath);
    
    // Extract title from existing content or generate from filename
    const titleMatch = existingContent.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : this.formatTitle(fileName);
    
    // Determine content type based on path and filename
    const contentType = this.determineContentType(relativePath, fileName);
    
    // Calculate next review date (1 month from now)
    const nextReview = new Date();
    nextReview.setMonth(nextReview.getMonth() + 1);
    const reviewDate = nextReview.toISOString().split('T')[0];

    return {
      title,
      lastUpdated: now,
      nextReview: reviewDate,
      contentType,
      path: relativePath,
      maintainer: 'GLX Development Team',
      version: '1.0.0'
    };
  }

  /**
   * Format filename to proper title
   */
  formatTitle(filename) {
    return filename
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace(/\bApi\b/g, 'API')
      .replace(/\bUi\b/g, 'UI')
      .replace(/\bId\b/g, 'ID')
      .replace(/\bUrl\b/g, 'URL')
      .replace(/\bHtml\b/g, 'HTML')
      .replace(/\bCss\b/g, 'CSS')
      .replace(/\bJs\b/g, 'JavaScript')
      .replace(/\bTs\b/g, 'TypeScript')
      .replace(/\bMcp\b/g, 'MCP')
      .replace(/\bGalax\b/g, 'GLX')
      .replace(/\bCicd\b/g, 'CI/CD')
      .replace(/\bKyc\b/g, 'KYC')
      .replace(/\bWeb3\b/g, 'Web3')
      .replace(/\bPwa\b/g, 'PWA');
  }

  /**
   * Determine content type based on file path and name
   */
  determineContentType(relativePath, fileName) {
    const lowerPath = relativePath.toLowerCase();
    const lowerName = fileName.toLowerCase();

    if (lowerName === 'readme') return 'overview';
    if (lowerName.includes('api')) return 'api-reference';
    if (lowerName.includes('guide') || lowerName.includes('tutorial')) return 'guide';
    if (lowerName.includes('security')) return 'security';
    if (lowerName.includes('deployment')) return 'deployment';
    if (lowerName.includes('development') || lowerName.includes('dev')) return 'development';
    if (lowerName.includes('history') || lowerName.includes('changelog')) return 'changelog';
    if (lowerName.includes('metrics') || lowerName.includes('summary')) return 'metrics';
    if (lowerName.includes('spec') || lowerName.includes('specification')) return 'specification';
    if (lowerName.includes('license')) return 'legal';
    if (lowerPath.includes('.github')) return 'workflow';
    if (lowerPath.includes('docs-backup')) return 'archive';
    
    return 'documentation';
  }

  /**
   * Create standardized frontmatter
   */
  createFrontmatter(metadata) {
    return `---
title: "${metadata.title}"
description: ""
lastUpdated: "${metadata.lastUpdated}"
nextReview: "${metadata.nextReview}"
contentType: "${metadata.contentType}"
maintainer: "${metadata.maintainer}"
version: "${metadata.version}"
tags: []
relatedDocs: []
---

`;
  }

  /**
   * Update or add metadata to documentation file
   */
  async updateDocumentationMetadata(filePath) {
    try {
      let content = await fs.readFile(filePath, 'utf8');
      const hasExistingFrontmatter = content.startsWith('---\n');
      
      let metadata;
      let bodyContent = content;

      if (hasExistingFrontmatter) {
        // Extract existing frontmatter and update lastUpdated
        const frontmatterEnd = content.indexOf('\n---\n', 4);
        if (frontmatterEnd > 0) {
          const frontmatterContent = content.slice(4, frontmatterEnd);
          bodyContent = content.slice(frontmatterEnd + 5);
          
          // Parse existing metadata
          const existingMetadata = {};
          frontmatterContent.split('\n').forEach(line => {
            const match = line.match(/^(\w+):\s*"?([^"]+)"?$/);
            if (match) {
              existingMetadata[match[1]] = match[2].replace(/"/g, '');
            }
          });
          
          // Generate new metadata with preserved values
          metadata = this.generateMetadata(filePath, bodyContent);
          Object.assign(metadata, existingMetadata);
          metadata.lastUpdated = new Date().toISOString().split('T')[0];
          
          // Force update nextReview to new schedule (1 month from now)
          const nextReview = new Date();
          nextReview.setMonth(nextReview.getMonth() + 1);
          metadata.nextReview = nextReview.toISOString().split('T')[0];
        } else {
          metadata = this.generateMetadata(filePath, content);
        }
      } else {
        metadata = this.generateMetadata(filePath, content);
      }

      const frontmatter = this.createFrontmatter(metadata);
      const newContent = frontmatter + bodyContent.trim() + '\n';
      
      await fs.writeFile(filePath, newContent, 'utf8');
      return { success: true, updated: true, file: filePath };
    } catch (error) {
      return { success: false, error: error.message, file: filePath };
    }
  }

  /**
   * Find all markdown files in the repository
   */
  async findMarkdownFiles() {
    const files = [];
    
    for (const docPath of this.docPaths) {
      const fullPath = path.resolve(this.rootPath, docPath);
      
      try {
        await this.scanDirectory(fullPath, files);
      } catch (error) {
        console.warn(`Warning: Could not scan directory ${fullPath}: ${error.message}`);
      }
    }
    
    return files.filter(file => {
      const relativePath = path.relative(this.rootPath, file);
      return !this.excludePatterns.some(pattern => relativePath.includes(pattern));
    });
  }

  /**
   * Recursively scan directory for markdown files
   */
  async scanDirectory(dirPath, files) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          await this.scanDirectory(fullPath, files);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  /**
   * Validate documentation best practices
   */
  async validateDocumentation(filePath) {
    const issues = [];
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n');
      
      // Check for metadata
      if (!content.startsWith('---\n')) {
        issues.push('Missing metadata frontmatter');
      }
      
      // Check for title
      const hasTitle = lines.some(line => line.match(/^#\s+.+/));
      if (!hasTitle) {
        issues.push('Missing main title (H1)');
      }
      
      // Check for empty sections
      const headings = lines.filter(line => line.match(/^#+\s+.+/));
      if (headings.length > 1) {
        for (let i = 0; i < headings.length - 1; i++) {
          const currentIndex = lines.indexOf(headings[i]);
          const nextIndex = lines.indexOf(headings[i + 1]);
          const sectionContent = lines.slice(currentIndex + 1, nextIndex);
          
          if (sectionContent.every(line => line.trim() === '')) {
            issues.push(`Empty section: ${headings[i]}`);
          }
        }
      }
      
      // Check for broken relative links
      const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
      let match;
      while ((match = linkPattern.exec(content)) !== null) {
        const linkPath = match[2];
        if (linkPath.startsWith('./') || linkPath.startsWith('../')) {
          const fullLinkPath = path.resolve(path.dirname(filePath), linkPath);
          try {
            await fs.access(fullLinkPath);
          } catch {
            issues.push(`Broken relative link: ${linkPath}`);
          }
        }
      }
      
      // Check line length (warning for very long lines)
      lines.forEach((line, index) => {
        if (line.length > 120 && !line.startsWith('|') && !line.includes('http')) {
          issues.push(`Line ${index + 1} is very long (${line.length} chars)`);
        }
      });
      
    } catch (error) {
      issues.push(`Could not read file: ${error.message}`);
    }
    
    return issues;
  }

  /**
   * Check if documentation is outdated (older than 1 month for monthly reviews)
   */
  async checkFreshness(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const lastUpdatedMatch = content.match(/lastUpdated:\s*"?([^"\n]+)"?/);
      
      if (!lastUpdatedMatch) {
        return { isOutdated: true, reason: 'No lastUpdated date found' };
      }
      
      const lastUpdated = new Date(lastUpdatedMatch[1]);
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      
      if (lastUpdated < oneMonthAgo) {
        const monthsOld = Math.floor((Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24 * 30));
        return { 
          isOutdated: true, 
          reason: `Last updated ${monthsOld} months ago (${lastUpdated.toISOString().split('T')[0]})` 
        };
      }
      
      return { isOutdated: false };
    } catch (error) {
      return { isOutdated: true, reason: `Error checking file: ${error.message}` };
    }
  }
}

// CLI functionality
async function main() {
  const manager = new DocumentationManager();
  const command = process.argv[2];
  const targetFile = process.argv[3];
  
  switch (command) {
    case 'update':
      if (targetFile) {
        const result = await manager.updateDocumentationMetadata(targetFile);
        console.log(JSON.stringify(result, null, 2));
      } else {
        const files = await manager.findMarkdownFiles();
        console.log(`Found ${files.length} markdown files`);
        
        const results = [];
        for (const file of files) {
          const result = await manager.updateDocumentationMetadata(file);
          results.push(result);
          if (result.success) {
            console.log(`✓ Updated: ${path.relative(manager.rootPath, file)}`);
          } else {
            console.log(`✗ Failed: ${path.relative(manager.rootPath, file)} - ${result.error}`);
          }
        }
        
        console.log(`\nCompleted: ${results.filter(r => r.success).length}/${results.length} files updated`);
      }
      break;
      
    case 'validate':
      if (targetFile) {
        const issues = await manager.validateDocumentation(targetFile);
        console.log(JSON.stringify({ file: targetFile, issues }, null, 2));
      } else {
        const files = await manager.findMarkdownFiles();
        const allIssues = [];
        
        for (const file of files) {
          const issues = await manager.validateDocumentation(file);
          if (issues.length > 0) {
            allIssues.push({ file: path.relative(manager.rootPath, file), issues });
          }
        }
        
        console.log(JSON.stringify(allIssues, null, 2));
      }
      break;
      
    case 'check-freshness':
      const files = await manager.findMarkdownFiles();
      const outdatedFiles = [];
      
      for (const file of files) {
        const result = await manager.checkFreshness(file);
        if (result.isOutdated) {
          outdatedFiles.push({ 
            file: path.relative(manager.rootPath, file), 
            reason: result.reason 
          });
        }
      }
      
      console.log(JSON.stringify({ outdatedFiles, count: outdatedFiles.length }, null, 2));
      break;
      
    case 'list':
      const markdownFiles = await manager.findMarkdownFiles();
      const relativePaths = markdownFiles.map(file => path.relative(manager.rootPath, file));
      console.log(JSON.stringify(relativePaths, null, 2));
      break;
      
    default:
      console.log(`Usage: ${path.basename(__filename)} <command> [file]
      
Commands:
  update [file]     - Update metadata for file or all markdown files
  validate [file]   - Validate documentation best practices
  check-freshness   - Check for outdated documentation (>1 month)
  list              - List all markdown files
`);
      process.exit(1);
  }
}

if (process.argv[1] === __filename) {
  main().catch(console.error);
}

export default DocumentationManager;