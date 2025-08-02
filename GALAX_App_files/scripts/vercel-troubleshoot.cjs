#!/usr/bin/env node

/**
 * Vercel Deployment Troubleshooting Script
 * 
 * Diagnoses common issues with Vercel deployments and provides
 * specific recommendations for fixing them.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

class VercelTroubleshooter {
  constructor() {
    this.issues = [];
    this.recommendations = [];
    this.criticalIssues = [];
  }

  log(level, category, message, recommendation = null) {
    const timestamp = new Date().toISOString();
    const icon = level === 'critical' ? '🚨' : level === 'warning' ? '⚠️' : level === 'info' ? 'ℹ️' : '✅';
    
    console.log(`${icon} [${category}] ${message}`);
    
    if (level === 'critical') {
      this.criticalIssues.push({ category, message, recommendation });
    } else if (level === 'warning') {
      this.issues.push({ category, message, recommendation });
    }
    
    if (recommendation) {
      this.recommendations.push({ category, recommendation });
    }
  }

  checkVercelConfig() {
    console.log('\n🔍 Checking Vercel Configuration...');
    
    // Check if vercel.json exists in parent directory
    const vercelPath = fs.existsSync('vercel.json') ? 'vercel.json' : '../vercel.json';
    
    if (!fs.existsSync(vercelPath)) {
      this.log('critical', 'Configuration', 'vercel.json file not found', 
        'Create a vercel.json file in the root directory with proper build configuration');
      return;
    }
    
    try {
      const config = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
      
      // Check essential fields
      if (!config.buildCommand) {
        this.log('critical', 'Configuration', 'buildCommand not specified in vercel.json',
          'Add buildCommand: "cd GALAX_App_files && npm install && npm run build"');
      }
      
      if (!config.outputDirectory) {
        this.log('critical', 'Configuration', 'outputDirectory not specified in vercel.json',
          'Add outputDirectory: "GALAX_App_files/dist/public"');
      }
      
      if (!config.headers) {
        this.log('warning', 'Security', 'No security headers configured',
          'Add security headers configuration for HSTS, CSP, etc.');
      }
      
      // Check functions configuration
      if (!config.functions || !config.functions['GALAX_App_files/api/**/*']) {
        this.log('warning', 'Functions', 'API functions not properly configured',
          'Add functions configuration for serverless API routes');
      }
      
      this.log('success', 'Configuration', 'vercel.json found and basic structure validated');
      
    } catch (error) {
      this.log('critical', 'Configuration', 'Invalid JSON syntax in vercel.json',
        'Fix JSON syntax errors in vercel.json file');
    }
  }

  checkEnvironmentFiles() {
    console.log('\n🔍 Checking Environment Configuration...');
    
    const envFiles = ['.env.example', '.env.vercel', '.env.production'];
    let hasEnvExample = false;
    
    for (const envFile of envFiles) {
      const filePath = envFile; // Look in current directory
      if (fs.existsSync(filePath)) {
        this.log('success', 'Environment', `${envFile} found`);
        if (envFile === '.env.example') hasEnvExample = true;
      } else {
        if (envFile === '.env.example') {
          this.log('critical', 'Environment', `${envFile} not found`,
            'Create .env.example with all required environment variables documented');
        } else {
          this.log('info', 'Environment', `${envFile} not found (optional)`);
        }
      }
    }
    
    if (hasEnvExample) {
      this.checkEnvironmentVariables();
    }
  }

  checkEnvironmentVariables() {
    const envPath = '.env.example';
    const content = fs.readFileSync(envPath, 'utf8');
    
    const requiredVars = [
      'NODE_ENV',
      'JWT_SECRET',
      'CLIENT_ORIGIN',
      'PUSHER_APP_ID',
      'PUSHER_KEY',
      'PUSHER_SECRET',
      'PUSHER_CLUSTER'
    ];
    
    for (const varName of requiredVars) {
      if (!content.includes(`${varName}=`)) {
        this.log('critical', 'Environment', `Required variable ${varName} not documented`,
          `Add ${varName} to .env.example with proper documentation`);
      }
    }
    
    // Check for placeholder values
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.includes('your-') || line.includes('change-this') || line.includes('PLACEHOLDER')) {
        const varName = line.split('=')[0];
        this.log('warning', 'Environment', `${varName} appears to have placeholder value`,
          `Replace placeholder values with actual configuration in Vercel dashboard`);
      }
    }
  }

  checkBuildConfiguration() {
    console.log('\n🔍 Checking Build Configuration...');
    
    const packageJsonPath = 'package.json';
    if (!fs.existsSync(packageJsonPath)) {
      this.log('critical', 'Build', 'package.json not found in current directory',
        'Ensure package.json exists in the correct directory');
      return;
    }
    
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Check for essential scripts
      const requiredScripts = ['build', 'start'];
      for (const script of requiredScripts) {
        if (!packageJson.scripts || !packageJson.scripts[script]) {
          this.log('critical', 'Build', `Missing ${script} script in package.json`,
            `Add "${script}" script to package.json scripts section`);
        }
      }
      
      // Check for Vercel-specific scripts
      const vercelScripts = ['vercel:validate', 'vercel:health'];
      for (const script of vercelScripts) {
        if (!packageJson.scripts || !packageJson.scripts[script]) {
          this.log('warning', 'Build', `Missing ${script} script`,
            `Add Vercel validation scripts for better deployment reliability`);
        }
      }
      
      this.log('success', 'Build', 'package.json structure validated');
      
    } catch (error) {
      this.log('critical', 'Build', 'Invalid JSON syntax in package.json',
        'Fix JSON syntax errors in package.json');
    }
  }

  checkGitHubWorkflows() {
    console.log('\n🔍 Checking GitHub Workflows...');
    
    const workflowsDir = '../.github/workflows';
    if (!fs.existsSync(workflowsDir)) {
      this.log('warning', 'CI/CD', 'No GitHub workflows directory found',
        'Create .github/workflows directory with CI/CD workflows');
      return;
    }
    
    const requiredWorkflows = [
      'preview-deploy.yml',
      'security-streamlined.yml',
      'comprehensive-checks.yml'
    ];
    
    for (const workflow of requiredWorkflows) {
      const workflowPath = path.join(workflowsDir, workflow);
      if (fs.existsSync(workflowPath)) {
        this.log('success', 'CI/CD', `${workflow} workflow found`);
        
        // Check for Vercel integration
        const content = fs.readFileSync(workflowPath, 'utf8');
        if (content.includes('VERCEL_TOKEN')) {
          this.log('success', 'CI/CD', `${workflow} has Vercel integration`);
        } else if (workflow === 'preview-deploy.yml') {
          this.log('warning', 'CI/CD', `${workflow} missing Vercel integration`,
            'Add Vercel deployment steps to preview workflow');
        }
      } else {
        this.log('warning', 'CI/CD', `${workflow} workflow not found`,
          `Create ${workflow} for automated deployments and checks`);
      }
    }
  }

  checkSecurityConfiguration() {
    console.log('\n🔍 Checking Security Configuration...');
    
    try {
      const vercelPath = fs.existsSync('vercel.json') ? 'vercel.json' : '../vercel.json';
      const vercelConfig = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
      
      if (!vercelConfig.headers) {
        this.log('critical', 'Security', 'No security headers configured',
          'Add security headers to vercel.json for HSTS, CSP, XSS protection');
        return;
      }
      
      const headers = vercelConfig.headers[0]?.headers || [];
      const headerNames = headers.map(h => h.key.toLowerCase());
      
      const requiredHeaders = [
        'strict-transport-security',
        'content-security-policy',
        'x-frame-options',
        'x-content-type-options'
      ];
      
      for (const headerName of requiredHeaders) {
        if (headerNames.includes(headerName)) {
          this.log('success', 'Security', `${headerName} header configured`);
        } else {
          this.log('critical', 'Security', `${headerName} header missing`,
            `Add ${headerName} header to vercel.json for security`);
        }
      }
      
      // Check CSP configuration
      const cspHeader = headers.find(h => h.key.toLowerCase() === 'content-security-policy');
      if (cspHeader) {
        const csp = cspHeader.value;
        if (csp.includes("'unsafe-eval'")) {
          this.log('warning', 'Security', 'CSP allows unsafe-eval',
            'Consider removing unsafe-eval from CSP for better security');
        }
        if (!csp.includes('https:')) {
          this.log('warning', 'Security', 'CSP may not enforce HTTPS',
            'Ensure CSP directives require HTTPS sources');
        }
      }
      
    } catch (error) {
      this.log('warning', 'Security', 'Could not validate security headers',
        'Ensure vercel.json exists and has valid JSON syntax');
    }
  }

  async checkDeploymentConnectivity() {
    console.log('\n🔍 Checking Deployment Connectivity...');
    
    // Try to detect Vercel deployment URL
    const possibleUrls = [
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
      'https://galax-civic-networking.vercel.app',
      'https://galaxcivicnetwork.me'
    ].filter(Boolean);
    
    for (const url of possibleUrls) {
      try {
        await this.testUrl(url);
        this.log('success', 'Connectivity', `${url} is accessible`);
        return;
      } catch (error) {
        this.log('warning', 'Connectivity', `${url} is not accessible: ${error.message}`,
          'Check if deployment is complete and URL is correct');
      }
    }
    
    this.log('critical', 'Connectivity', 'No accessible deployment URLs found',
      'Verify deployment was successful and URLs are correct');
  }

  testUrl(url) {
    return new Promise((resolve, reject) => {
      const request = https.get(url, { timeout: 10000 }, (response) => {
        if (response.statusCode >= 200 && response.statusCode < 400) {
          resolve(response);
        } else {
          reject(new Error(`HTTP ${response.statusCode}`));
        }
      });
      
      request.on('error', reject);
      request.on('timeout', () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  checkCommonIssues() {
    console.log('\n🔍 Checking for Common Issues...');
    
    // Check for build output directory
    const outputDir = 'dist/public';
    if (!fs.existsSync(outputDir)) {
      this.log('warning', 'Build', 'Build output directory not found',
        'Run "npm run build" to generate build output');
    } else {
      // Check for index.html
      if (!fs.existsSync(path.join(outputDir, 'index.html'))) {
        this.log('critical', 'Build', 'index.html not found in build output',
          'Ensure build process generates index.html file');
      } else {
        this.log('success', 'Build', 'Build output appears valid');
      }
    }
    
    // Check for large files that might cause deployment issues
    if (fs.existsSync(outputDir)) {
      const checkDirectory = (dir) => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          
          if (stat.isDirectory()) {
            checkDirectory(filePath);
          } else if (stat.size > 25 * 1024 * 1024) { // 25MB
            this.log('warning', 'Build', `Large file detected: ${filePath} (${Math.round(stat.size / 1024 / 1024)}MB)`,
              'Consider optimizing large assets or using external storage');
          }
        }
      };
      
      try {
        checkDirectory(outputDir);
      } catch (error) {
        this.log('warning', 'Build', 'Could not check file sizes',
          'Manually verify no files exceed Vercel size limits');
      }
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(70));
    console.log('VERCEL DEPLOYMENT TROUBLESHOOTING REPORT');
    console.log('='.repeat(70));
    
    if (this.criticalIssues.length === 0 && this.issues.length === 0) {
      console.log('\n🎉 No issues detected! Your deployment configuration looks good.');
      console.log('\n✅ Ready for Vercel deployment');
      return true;
    }
    
    if (this.criticalIssues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES (must be fixed):');
      this.criticalIssues.forEach((issue, index) => {
        console.log(`\n${index + 1}. [${issue.category}] ${issue.message}`);
        if (issue.recommendation) {
          console.log(`   💡 Solution: ${issue.recommendation}`);
        }
      });
    }
    
    if (this.issues.length > 0) {
      console.log('\n⚠️  WARNINGS (recommended to fix):');
      this.issues.forEach((issue, index) => {
        console.log(`\n${index + 1}. [${issue.category}] ${issue.message}`);
        if (issue.recommendation) {
          console.log(`   💡 Recommendation: ${issue.recommendation}`);
        }
      });
    }
    
    console.log('\n📋 NEXT STEPS:');
    if (this.criticalIssues.length > 0) {
      console.log('1. Fix all critical issues listed above');
      console.log('2. Re-run this troubleshooter to verify fixes');
      console.log('3. Test deployment after fixes are applied');
    } else {
      console.log('1. Address warnings for optimal deployment');
      console.log('2. Test deployment to verify everything works');
      console.log('3. Monitor deployment for any runtime issues');
    }
    
    console.log('\n📚 HELPFUL RESOURCES:');
    console.log('- Vercel Documentation: https://vercel.com/docs');
    console.log('- GitHub-Vercel Integration Guide: ./GITHUB_VERCEL_INTEGRATION_GUIDE.md');
    console.log('- Deployment Guide: ./VERCEL_DEPLOYMENT_COMPLETE.md');
    
    console.log('\n' + '='.repeat(70));
    
    return this.criticalIssues.length === 0;
  }

  async runAllChecks() {
    console.log('🔧 Starting Vercel deployment troubleshooting...\n');
    
    this.checkVercelConfig();
    this.checkEnvironmentFiles();
    this.checkBuildConfiguration();
    this.checkGitHubWorkflows();
    this.checkSecurityConfiguration();
    this.checkCommonIssues();
    
    // Connectivity check is async
    await this.checkDeploymentConnectivity();
    
    return this.generateReport();
  }
}

// CLI execution
if (require.main === module) {
  const troubleshooter = new VercelTroubleshooter();
  
  troubleshooter.runAllChecks().then((success) => {
    process.exit(success ? 0 : 1);
  }).catch((error) => {
    console.error('❌ Troubleshooting failed with error:', error.message);
    process.exit(1);
  });
}

module.exports = VercelTroubleshooter;