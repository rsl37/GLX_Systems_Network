#!/usr/bin/env node

/**
 * Vercel Environment Validation Script
 * 
 * Validates that all required environment variables are properly configured
 * for Vercel deployment and checks for common configuration issues.
 */

const fs = require('fs');
const path = require('path');

// Required environment variables for Vercel deployment
const REQUIRED_ENV_VARS = [
  'NODE_ENV',
  'JWT_SECRET',
  'CLIENT_ORIGIN',
  'PUSHER_APP_ID',
  'PUSHER_KEY',
  'PUSHER_SECRET',
  'PUSHER_CLUSTER'
];

// Recommended environment variables
const RECOMMENDED_ENV_VARS = [
  'DATABASE_URL',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'TRUSTED_ORIGINS'
];

// Security validation patterns
const SECURITY_PATTERNS = {
  JWT_SECRET: {
    minLength: 32,
    pattern: /^[a-zA-Z0-9+/=_-]+$/,
    description: 'Must be at least 32 characters long and contain only valid characters'
  },
  CLIENT_ORIGIN: {
    pattern: /^https:\/\/.+\.vercel\.app$|^https:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    description: 'Must be a valid HTTPS URL (Vercel or custom domain)'
  },
  NODE_ENV: {
    allowedValues: ['production', 'development', 'staging', 'test'],
    description: 'Must be one of: production, development, staging, test'
  }
};

class VercelEnvValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.envVars = {};
  }

  log(level, message) {
    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '❌' : level === 'warning' ? '⚠️' : '✅';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  loadEnvironmentVariables() {
    // Check for .env files
    const envFiles = ['.env', '.env.production', '.env.vercel'];
    
    for (const envFile of envFiles) {
      const envPath = path.join(__dirname, '..', envFile);
      if (fs.existsSync(envPath)) {
        this.log('info', `Found environment file: ${envFile}`);
        
        const content = fs.readFileSync(envPath, 'utf8');
        const lines = content.split('\n');
        
        for (const line of lines) {
          const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
          if (match) {
            const [, key, value] = match;
            this.envVars[key] = value.replace(/^["']|["']$/g, ''); // Remove quotes
          }
        }
      }
    }

    // Also check process.env for runtime validation
    for (const key of [...REQUIRED_ENV_VARS, ...RECOMMENDED_ENV_VARS]) {
      if (process.env[key] && !this.envVars[key]) {
        this.envVars[key] = process.env[key];
      }
    }
  }

  validateRequiredVariables() {
    this.log('info', 'Validating required environment variables...');
    
    for (const varName of REQUIRED_ENV_VARS) {
      if (!this.envVars[varName] || this.envVars[varName].trim() === '') {
        this.errors.push(`Required environment variable ${varName} is missing or empty`);
      } else {
        this.log('info', `✓ ${varName} is configured`);
      }
    }
  }

  validateRecommendedVariables() {
    this.log('info', 'Checking recommended environment variables...');
    
    for (const varName of RECOMMENDED_ENV_VARS) {
      if (!this.envVars[varName] || this.envVars[varName].trim() === '') {
        this.warnings.push(`Recommended environment variable ${varName} is missing`);
      } else {
        this.log('info', `✓ ${varName} is configured`);
      }
    }
  }

  validateSecurityPatterns() {
    this.log('info', 'Validating security patterns...');
    
    for (const [varName, rules] of Object.entries(SECURITY_PATTERNS)) {
      const value = this.envVars[varName];
      
      if (!value) continue; // Skip if not set (handled by required validation)
      
      // Check minimum length
      if (rules.minLength && value.length < rules.minLength) {
        this.errors.push(`${varName} must be at least ${rules.minLength} characters long`);
        continue;
      }
      
      // Check pattern
      if (rules.pattern && !rules.pattern.test(value)) {
        this.errors.push(`${varName} format is invalid: ${rules.description}`);
        continue;
      }
      
      // Check allowed values
      if (rules.allowedValues && !rules.allowedValues.includes(value)) {
        this.errors.push(`${varName} must be one of: ${rules.allowedValues.join(', ')}`);
        continue;
      }
      
      this.log('info', `✓ ${varName} security validation passed`);
    }
  }

  validateVercelSpecific() {
    this.log('info', 'Validating Vercel-specific configuration...');
    
    // Check CLIENT_ORIGIN matches expected Vercel patterns
    const clientOrigin = this.envVars.CLIENT_ORIGIN;
    if (clientOrigin) {
      if (clientOrigin.includes('vercel.app')) {
        this.log('info', '✓ CLIENT_ORIGIN configured for Vercel domain');
      } else if (clientOrigin.includes('localhost') || clientOrigin.includes('127.0.0.1')) {
        this.warnings.push('CLIENT_ORIGIN appears to be set for local development');
      }
    }
    
    // Check for NODE_ENV production
    if (this.envVars.NODE_ENV === 'production') {
      this.log('info', '✓ NODE_ENV set to production');
    } else {
      this.warnings.push('NODE_ENV is not set to production');
    }
    
    // Check for secure JWT secret
    const jwtSecret = this.envVars.JWT_SECRET;
    if (jwtSecret) {
      if (jwtSecret.includes('change-this') || jwtSecret.includes('your-secret')) {
        this.errors.push('JWT_SECRET appears to be using a placeholder value');
      } else if (jwtSecret.length >= 64) {
        this.log('info', '✓ JWT_SECRET has strong length');
      } else if (jwtSecret.length >= 32) {
        this.warnings.push('JWT_SECRET meets minimum requirements but could be longer');
      }
    }
  }

  validateDatabaseConfiguration() {
    this.log('info', 'Validating database configuration...');
    
    const databaseUrl = this.envVars.DATABASE_URL;
    if (databaseUrl) {
      if (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://')) {
        this.log('info', '✓ PostgreSQL database URL configured');
      } else if (databaseUrl.includes('sqlite')) {
        this.warnings.push('SQLite database detected - PostgreSQL is recommended for production');
      } else {
        this.warnings.push('Unrecognized database URL format');
      }
    } else {
      this.warnings.push('DATABASE_URL not configured - will fall back to SQLite');
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('VERCEL ENVIRONMENT VALIDATION REPORT');
    console.log('='.repeat(60));
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      this.log('info', 'All environment variables are properly configured! 🎉');
      console.log('\n✅ Ready for Vercel deployment');
      return true;
    }
    
    if (this.errors.length > 0) {
      console.log('\n❌ ERRORS (must be fixed):');
      this.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS (recommended to fix):');
      this.warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. ${warning}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    
    if (this.errors.length > 0) {
      console.log('❌ Environment validation failed');
      console.log('Please fix the errors above before deploying to Vercel');
      return false;
    } else {
      console.log('⚠️  Environment validation passed with warnings');
      console.log('Consider addressing the warnings for optimal configuration');
      return true;
    }
  }

  validate() {
    console.log('🔍 Starting Vercel environment validation...\n');
    
    this.loadEnvironmentVariables();
    this.validateRequiredVariables();
    this.validateRecommendedVariables();
    this.validateSecurityPatterns();
    this.validateVercelSpecific();
    this.validateDatabaseConfiguration();
    
    return this.generateReport();
  }
}

// CLI execution
if (require.main === module) {
  const validator = new VercelEnvValidator();
  const isValid = validator.validate();
  
  // Exit with appropriate code
  process.exit(isValid ? 0 : 1);
}

module.exports = VercelEnvValidator;