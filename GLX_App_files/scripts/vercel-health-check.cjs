#!/usr/bin/env node

/**
 * Vercel Deployment Health Check Script
 * 
 * Performs comprehensive health checks for Vercel deployments
 * including API endpoints, security headers, and performance metrics.
 */

const https = require('https');
const http = require('http');
const url = require('url');

class VercelHealthChecker {
  constructor(deploymentUrl) {
    this.baseUrl = deploymentUrl || process.env.VERCEL_URL || 'https://galax-civic-networking.vercel.app';
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      details: []
    };
  }

  log(level, test, message, details = null) {
    const timestamp = new Date().toISOString();
    const icon = level === 'pass' ? '✅' : level === 'fail' ? '❌' : '⚠️';
    
    console.log(`${icon} [${timestamp}] ${test}: ${message}`);
    
    if (details) {
      console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
    }
    
    this.results.details.push({
      timestamp,
      level,
      test,
      message,
      details
    });
    
    if (level === 'pass') this.results.passed++;
    else if (level === 'fail') this.results.failed++;
    else this.results.warnings++;
  }

  async makeRequest(path, options = {}) {
    return new Promise((resolve, reject) => {
      const requestUrl = new URL(path, this.baseUrl);
      const protocol = requestUrl.protocol === 'https:' ? https : http;
      
      const reqOptions = {
        hostname: requestUrl.hostname,
        port: requestUrl.port,
        path: requestUrl.pathname + requestUrl.search,
        method: options.method || 'GET',
        headers: options.headers || {},
        timeout: options.timeout || 10000
      };

      const req = protocol.request(reqOptions, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
            responseTime: Date.now() - startTime
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      const startTime = Date.now();
      
      if (options.body) {
        req.write(options.body);
      }
      
      req.end();
    });
  }

  async checkMainPage() {
    try {
      const response = await this.makeRequest('/');
      
      if (response.statusCode === 200) {
        this.log('pass', 'Main Page', `Loaded successfully (${response.responseTime}ms)`);
        
        // Check if it's actually HTML
        if (response.headers['content-type']?.includes('text/html')) {
          this.log('pass', 'Content Type', 'Correct HTML content type');
        } else {
          this.log('warn', 'Content Type', 'Unexpected content type for main page');
        }
        
        // Check for basic HTML structure
        if (response.body.includes('<html') && response.body.includes('</html>')) {
          this.log('pass', 'HTML Structure', 'Valid HTML document structure');
        } else {
          this.log('fail', 'HTML Structure', 'Invalid or missing HTML structure');
        }
        
      } else {
        this.log('fail', 'Main Page', `Failed to load (status: ${response.statusCode})`);
      }
    } catch (error) {
      this.log('fail', 'Main Page', `Request failed: ${error.message}`);
    }
  }

  async checkApiEndpoints() {
    const endpoints = [
      { path: '/api/health', method: 'GET', expectedStatus: 200 },
      { path: '/api/auth/status', method: 'GET', expectedStatus: [200, 401] },
      { path: '/api/realtime/health', method: 'GET', expectedStatus: 200 }
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await this.makeRequest(endpoint.path, { method: endpoint.method });
        
        const expectedStatuses = Array.isArray(endpoint.expectedStatus) 
          ? endpoint.expectedStatus 
          : [endpoint.expectedStatus];
        
        if (expectedStatuses.includes(response.statusCode)) {
          this.log('pass', `API ${endpoint.path}`, 
            `Responded correctly (${response.statusCode}, ${response.responseTime}ms)`);
          
          // Try to parse JSON response
          try {
            const data = JSON.parse(response.body);
            if (data.status || data.message) {
              this.log('pass', `API ${endpoint.path} Format`, 'Valid JSON response structure');
            }
          } catch (e) {
            this.log('warn', `API ${endpoint.path} Format`, 'Response is not valid JSON');
          }
          
        } else {
          this.log('fail', `API ${endpoint.path}`, 
            `Unexpected status (${response.statusCode}, expected: ${expectedStatuses.join(' or ')})`);
        }
      } catch (error) {
        this.log('fail', `API ${endpoint.path}`, `Request failed: ${error.message}`);
      }
    }
  }

  async checkSecurityHeaders() {
    try {
      const response = await this.makeRequest('/');
      const headers = response.headers;
      
      // Check for essential security headers
      const securityHeaders = {
        'strict-transport-security': 'HSTS',
        'x-content-type-options': 'Content Type Options',
        'x-frame-options': 'Frame Options',
        'x-xss-protection': 'XSS Protection',
        'content-security-policy': 'Content Security Policy',
        'referrer-policy': 'Referrer Policy'
      };
      
      for (const [headerName, displayName] of Object.entries(securityHeaders)) {
        if (headers[headerName]) {
          this.log('pass', `Security Header ${displayName}`, 
            `Present: ${headers[headerName]}`);
        } else {
          this.log('fail', `Security Header ${displayName}`, 'Missing');
        }
      }
      
      // Check HSTS configuration
      const hsts = headers['strict-transport-security'];
      if (hsts) {
        if (hsts.includes('max-age=') && hsts.includes('includeSubDomains')) {
          this.log('pass', 'HSTS Configuration', 'Properly configured with subdomains');
        } else if (hsts.includes('max-age=')) {
          this.log('warn', 'HSTS Configuration', 'Missing includeSubDomains directive');
        } else {
          this.log('fail', 'HSTS Configuration', 'Invalid HSTS header format');
        }
      }
      
    } catch (error) {
      this.log('fail', 'Security Headers', `Failed to check: ${error.message}`);
    }
  }

  async checkPerformance() {
    const testPaths = ['/', '/assets', '/api/health'];
    
    for (const path of testPaths) {
      try {
        const response = await this.makeRequest(path);
        
        if (response.responseTime < 1000) {
          this.log('pass', `Performance ${path}`, 
            `Fast response (${response.responseTime}ms)`);
        } else if (response.responseTime < 3000) {
          this.log('warn', `Performance ${path}`, 
            `Moderate response time (${response.responseTime}ms)`);
        } else {
          this.log('fail', `Performance ${path}`, 
            `Slow response (${response.responseTime}ms)`);
        }
        
        // Check for compression
        if (response.headers['content-encoding']) {
          this.log('pass', `Compression ${path}`, 
            `Content compressed (${response.headers['content-encoding']})`);
        } else if (path === '/') {
          this.log('warn', `Compression ${path}`, 'No compression detected');
        }
        
      } catch (error) {
        this.log('fail', `Performance ${path}`, `Request failed: ${error.message}`);
      }
    }
  }

  async checkCORS() {
    try {
      const response = await this.makeRequest('/api/health', {
        headers: {
          'Origin': 'https://example.com',
          'Access-Control-Request-Method': 'GET'
        }
      });
      
      const corsHeaders = response.headers['access-control-allow-origin'];
      if (corsHeaders) {
        if (corsHeaders === '*') {
          this.log('warn', 'CORS Configuration', 'Wildcard CORS enabled (potential security risk)');
        } else {
          this.log('pass', 'CORS Configuration', `Configured for specific origins: ${corsHeaders}`);
        }
      } else {
        this.log('warn', 'CORS Configuration', 'No CORS headers detected');
      }
      
    } catch (error) {
      this.log('warn', 'CORS Configuration', `Could not test CORS: ${error.message}`);
    }
  }

  async checkSSL() {
    if (!this.baseUrl.startsWith('https://')) {
      this.log('fail', 'SSL/TLS', 'Deployment is not using HTTPS');
      return;
    }
    
    try {
      const response = await this.makeRequest('/');
      this.log('pass', 'SSL/TLS', 'HTTPS connection established successfully');
      
      // Additional SSL checks could be added here
      if (response.headers['strict-transport-security']) {
        this.log('pass', 'SSL/TLS HSTS', 'HSTS header enforces HTTPS');
      } else {
        this.log('warn', 'SSL/TLS HSTS', 'HSTS header not found');
      }
      
    } catch (error) {
      this.log('fail', 'SSL/TLS', `HTTPS connection failed: ${error.message}`);
    }
  }

  async runAllChecks() {
    console.log(`🏥 Starting Vercel deployment health check for: ${this.baseUrl}\n`);
    
    await this.checkMainPage();
    await this.checkApiEndpoints();
    await this.checkSecurityHeaders();
    await this.checkPerformance();
    await this.checkCORS();
    await this.checkSSL();
    
    this.generateReport();
    
    return this.results.failed === 0;
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('VERCEL DEPLOYMENT HEALTH CHECK REPORT');
    console.log('='.repeat(60));
    
    console.log(`🎯 Deployment URL: ${this.baseUrl}`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`⚠️  Warnings: ${this.results.warnings}`);
    
    const totalTests = this.results.passed + this.results.failed + this.results.warnings;
    const successRate = totalTests > 0 ? ((this.results.passed / totalTests) * 100).toFixed(1) : 0;
    
    console.log(`📊 Success Rate: ${successRate}%`);
    
    if (this.results.failed === 0) {
      console.log('\n🎉 All critical checks passed! Deployment appears healthy.');
      if (this.results.warnings > 0) {
        console.log('💡 Consider addressing the warnings for optimal performance.');
      }
    } else {
      console.log('\n🚨 Some critical checks failed. Please review and fix the issues.');
    }
    
    console.log('\n' + '='.repeat(60));
  }
}

// CLI execution
if (require.main === module) {
  const deploymentUrl = process.argv[2];
  const checker = new VercelHealthChecker(deploymentUrl);
  
  checker.runAllChecks().then((success) => {
    process.exit(success ? 0 : 1);
  }).catch((error) => {
    console.error('❌ Health check failed with error:', error.message);
    process.exit(1);
  });
}

module.exports = VercelHealthChecker;