/**
 * GLX: Connect the World - Civic Networking Platform
 * 
 * Copyright (c) 2025 rsl37
 * Dual-licensed under PolyForm Shield 1.0.0 OR PolyForm Noncommercial 1.0.0
 * 
 * ⚠️  TERMS:
 * - Commercial use strictly prohibited without written permission from copyright holder
 * - Forking/derivative works prohibited without written permission
 * - Violations subject to legal action and damages
 * 
 * See LICENSE file in repository root for full terms.
 * Contact: roselleroberts@pm.me for licensing inquiries
 */

/**
 * Environment Variable Validation for Production Deployment
 *
 * This module validates environment variables required for production deployment,
 * particularly for Vercel deployments where missing or incorrect environment
 * variables are a common cause of authentication failures.
 */

import { validateJWTSecret } from './config/security.js';

interface EnvironmentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

interface RequiredEnvVar {
  name: string;
  required: boolean;
  description: string;
  validator?: (value: string) => boolean;
  recommendation?: string;
}

const REQUIRED_ENV_VARS: RequiredEnvVar[] = [
  {
    name: 'NODE_ENV',
    required: true,
    description: 'Application environment (development, production, staging)',
    validator: value => ['development', 'production', 'staging', 'test'].includes(value),
    recommendation: 'Set to "production" for Vercel deployment',
  },
  {
    name: 'JWT_SECRET',
    required: true,
    description: 'JWT signing secret (minimum 32 characters)',
    validator: value => value.length >= 32,
    recommendation: 'Generate with: openssl rand -hex 32',
  },
  {
    name: 'JWT_REFRESH_SECRET',
    required: false,
    description: 'JWT refresh token secret',
    validator: value => value.length >= 32,
    recommendation: 'Generate with: openssl rand -hex 32',
  },
  {
    name: 'CORS_ALLOWED_ORIGINS',
    required: false,
    description: 'Primary configurable CORS origins (comma-separated)',
    validator: value => value.split(',').every(origin => 
      origin.trim().startsWith('https://') || 
      origin.trim().startsWith('http://') || 
      process.env.NODE_ENV === 'development'
    ),
    recommendation: 'Set to your main frontend URLs (e.g., https://app.vercel.app,https://custom.domain)',
  },
  {
    name: 'CLIENT_ORIGIN',
    required: false, // Made optional since CORS_ALLOWED_ORIGINS is now primary
    description: 'Primary CORS origin for the frontend (legacy)',
    validator: value => value.startsWith('https://') || process.env.NODE_ENV === 'development',
    recommendation: 'Use CORS_ALLOWED_ORIGINS for new deployments, or set to your Vercel app URL',
  },
  {
    name: 'CORS_DEVELOPMENT_ORIGINS',
    required: false,
    description: 'Development-specific CORS origins (comma-separated)',
    recommendation: 'Override default localhost origins if needed',
  },
  {
    name: 'CORS_PRODUCTION_ORIGINS',
    required: false,
    description: 'Production-specific CORS origins (comma-separated)',
    recommendation: 'Set production domains explicitly for better security',
  },
  {
    name: 'CORS_TEST_ORIGINS',
    required: false,
    description: 'Test environment CORS origins (comma-separated)',
    recommendation: 'Set test/staging domains for CI/CD',
  },
  {
    name: 'CORS_PATTERN_DOMAINS',
    required: false,
    description: 'Domain patterns for dynamic deployment URLs (comma-separated)',
    recommendation: 'For Vercel branches: glx-civic-networking,myapp (without vercel.app suffix)',
  },
  {
    name: 'CORS_ALLOW_DEVELOPMENT',
    required: false,
    description: 'Enable development CORS origins in non-development environments',
    validator: value => ['true', 'false'].includes(value),
    recommendation: 'Set to true only if needed for specific testing scenarios',
  },
  {
    name: 'DATABASE_URL',
    required: false,
    description: 'Database connection string (recommended for production)',
    validator: value => value.includes('://'),
    recommendation: 'Use PostgreSQL for production (Vercel Postgres)',
  },
  {
    name: 'TRUSTED_ORIGINS',
    required: false,
    description: 'Additional trusted origins (comma-separated)',
    recommendation: 'Include staging domains and custom domains',
  },
  {
    name: 'SMTP_HOST',
    required: false,
    description: 'SMTP server for email functionality',
    recommendation: 'Required for email verification and password reset',
  },
  {
    name: 'SMTP_USER',
    required: false,
    description: 'SMTP username',
    recommendation: 'Required if SMTP_HOST is set',
  },
  {
    name: 'SMTP_PASS',
    required: false,
    description: 'SMTP password or app password',
    recommendation: 'Use app-specific password for Gmail',
  },
];

/**
 * Validates environment variables for production deployment
 */
export function validateEnvironment(): EnvironmentValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];
  const isTestOrCI = process.env.NODE_ENV === 'test' || process.env.CI === 'true';

  console.log('🔍 Validating environment variables...');

  for (const envVar of REQUIRED_ENV_VARS) {
    const value = process.env[envVar.name];

    // Skip CLIENT_ORIGIN requirement in test/CI environments
    if (envVar.name === 'CLIENT_ORIGIN' && isTestOrCI && !value) {
      warnings.push(`Optional in test environment: ${envVar.name} - ${envVar.description}`);
      continue;
    }

    if (envVar.required && !value) {
      errors.push(`Missing required environment variable: ${envVar.name} - ${envVar.description}`);
      if (envVar.recommendation) {
        recommendations.push(`${envVar.name}: ${envVar.recommendation}`);
      }
      continue;
    }

    if (value && envVar.validator && !envVar.validator(value)) {
      // Relax validation for test/CI environments
      if (isTestOrCI && (envVar.name === 'JWT_SECRET' || envVar.name === 'DATABASE_URL')) {
        warnings.push(`Test environment value for ${envVar.name}: ${envVar.description}`);
      } else {
        errors.push(`Invalid value for ${envVar.name}: ${envVar.description}`);
        if (envVar.recommendation) {
          recommendations.push(`${envVar.name}: ${envVar.recommendation}`);
        }
      }
      continue;
    }

    if (!value && !envVar.required) {
      warnings.push(
        `Optional environment variable not set: ${envVar.name} - ${envVar.description}`
      );
      if (envVar.recommendation) {
        recommendations.push(`${envVar.name}: ${envVar.recommendation}`);
      }
    }
  }

  // Validate authentication-specific configurations
  validateAuthConfiguration(errors, warnings, recommendations);

  // Validate CORS configuration
  validateCorsConfiguration(errors, warnings, recommendations);

  // Validate production-specific settings
  if (process.env.NODE_ENV === 'production') {
    validateProductionConfiguration(errors, warnings, recommendations);
  }

  const isValid = errors.length === 0;

  if (isValid) {
    console.log('✅ Environment validation passed');
  } else {
    console.error('❌ Environment validation failed');
    errors.forEach(error => console.error(`  - ${error}`));
  }

  if (warnings.length > 0) {
    console.warn('⚠️ Environment warnings:');
    warnings.forEach(warning => console.warn(`  - ${warning}`));
  }

  return {
    isValid,
    errors,
    warnings,
    recommendations,
  };
}

/**
 * Validates authentication-specific configuration
 */
function validateAuthConfiguration(
  errors: string[],
  warnings: string[],
  recommendations: string[]
): void {
  const jwtSecret = process.env.JWT_SECRET;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';
  const isTestOrCI = process.env.NODE_ENV === 'test' || process.env.CI === 'true';

  // Validate JWT_SECRET with comprehensive security checks
  if (jwtSecret) {
    const validation = validateJWTSecret(jwtSecret, isProduction);

    if (!validation.isValid || validation.severity === 'critical') {
      // In production mode, always enforce strict validation regardless of test environment
      if (isProduction) {
        errors.push(`JWT_SECRET security validation failed: ${validation.recommendations.join(', ')}`);
      } else if (process.env.NODE_ENV === 'test' && jwtSecret.length >= 16) {
        // Only use lenient validation for actual test environment, not development or CI
      } else if (isTestOrCI && jwtSecret.length >= 16) {
      } else if (process.env.NODE_ENV === 'test' && jwtSecret.length >= 16) {
        // Only use lenient validation for actual test environment, not development or CI
        warnings.push(`JWT_SECRET is weak but acceptable for test environment`);
      } else {
        errors.push(
          `JWT_SECRET security validation failed: ${validation.recommendations.join(', ')}`
        );

        if (validation.weakPatterns.length > 0) {
          const criticalPatterns = validation.weakPatterns.filter(p => p.severity === 'critical');
          const highPatterns = validation.weakPatterns.filter(p => p.severity === 'high');

          if (criticalPatterns.length > 0) {
            errors.push(
              `JWT_SECRET contains critical security weaknesses: ${criticalPatterns.map(p => p.description).join(', ')}`
            );
          }
          if (highPatterns.length > 0) {
            errors.push(
              `JWT_SECRET contains high-risk patterns: ${highPatterns.map(p => p.description).join(', ')}`
            );
          }
        }

        recommendations.push(
          'JWT_SECRET: Generate a cryptographically secure random string using: openssl rand -hex 32'
        );
      }
    } else if (validation.severity === 'warning') {
      warnings.push(`JWT_SECRET has security concerns: ${validation.recommendations.join(', ')}`);
      recommendations.push('JWT_SECRET: Consider improving secret strength for enhanced security');
    }
  }

  // Validate JWT_REFRESH_SECRET with the same comprehensive checks
  if (jwtRefreshSecret) {
    const validation = validateJWTSecret(jwtRefreshSecret, isProduction);

    if (!validation.isValid || validation.severity === 'critical') {
      // In production mode, always enforce strict validation regardless of test environment
      if (isProduction) {
        errors.push(
          `JWT_REFRESH_SECRET security validation failed: ${validation.recommendations.join(', ')}`
        );
      } else if (process.env.NODE_ENV === 'test' && jwtRefreshSecret.length >= 16) {
        // Only use lenient validation for actual test environment, not development or CI
        warnings.push(`JWT_REFRESH_SECRET is weak but acceptable for test environment`);
      } else {
        errors.push(
          `JWT_REFRESH_SECRET security validation failed: ${validation.recommendations.join(', ')}`
        );

        if (validation.weakPatterns.length > 0) {
          const criticalPatterns = validation.weakPatterns.filter(p => p.severity === 'critical');
          const highPatterns = validation.weakPatterns.filter(p => p.severity === 'high');

          if (criticalPatterns.length > 0) {
            errors.push(
              `JWT_REFRESH_SECRET contains critical security weaknesses: ${criticalPatterns.map(p => p.description).join(', ')}`
            );
          }
          if (highPatterns.length > 0) {
            errors.push(
              `JWT_REFRESH_SECRET contains high-risk patterns: ${highPatterns.map(p => p.description).join(', ')}`
            );
          }
        }

        recommendations.push(
          'JWT_REFRESH_SECRET: Generate a cryptographically secure random string using: openssl rand -hex 32'
        );
      }
    } else if (validation.severity === 'warning') {
      warnings.push(
        `JWT_REFRESH_SECRET has security concerns: ${validation.recommendations.join(', ')}`
      );
      recommendations.push(
        'JWT_REFRESH_SECRET: Consider improving secret strength for enhanced security'
      );
    }
  }

  // Check if email configuration is complete
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && (!smtpUser || !smtpPass)) {
    warnings.push('Incomplete SMTP configuration - email functionality may not work');
    recommendations.push('SMTP: Set SMTP_USER and SMTP_PASS if SMTP_HOST is configured');
  }
}

/**
 * Validates CORS configuration with new configurable system
 */
function validateCorsConfiguration(
  errors: string[],
  warnings: string[],
  recommendations: string[]
): void {
  const isTestOrCI = process.env.NODE_ENV === 'test' || process.env.CI === 'true';
  const isProduction = process.env.NODE_ENV === 'production';

  // Primary CORS configuration check
  const corsAllowedOrigins = process.env.CORS_ALLOWED_ORIGINS;
  const clientOrigin = process.env.CLIENT_ORIGIN;
  const frontendUrl = process.env.FRONTEND_URL;
  const trustedOrigins = process.env.TRUSTED_ORIGINS;

  // Check if any CORS configuration is present
  const hasCorsConfiguration = corsAllowedOrigins || clientOrigin || frontendUrl || trustedOrigins;

  if (!hasCorsConfiguration && !isTestOrCI) {
    errors.push('No CORS origins configured - API requests will fail');
    recommendations.push('CORS: Set CORS_ALLOWED_ORIGINS with your frontend URLs (preferred)');
    recommendations.push('CORS: Or use legacy CLIENT_ORIGIN for single domain');
  } else if (!hasCorsConfiguration && isTestOrCI) {
    warnings.push('No CORS origins configured for test environment');
    recommendations.push('CORS: Consider setting CORS_TEST_ORIGINS for explicit test configuration');
  }

  // Validate CORS_ALLOWED_ORIGINS format
  if (corsAllowedOrigins) {
    const origins = corsAllowedOrigins.split(',').map(o => o.trim());
    origins.forEach(origin => {
      if (!origin.startsWith('http://') && !origin.startsWith('https://')) {
        errors.push(`Invalid CORS origin format: ${origin} - must start with http:// or https://`);
      }
      if (isProduction && origin.startsWith('http://') && !origin.includes('localhost')) {
        warnings.push(`HTTP origin in production: ${origin} - consider using HTTPS`);
      }
    });
  }

  // Validate environment-specific origins
  const envSpecificOrigins = [
    { name: 'CORS_DEVELOPMENT_ORIGINS', value: process.env.CORS_DEVELOPMENT_ORIGINS },
    { name: 'CORS_PRODUCTION_ORIGINS', value: process.env.CORS_PRODUCTION_ORIGINS },
    { name: 'CORS_TEST_ORIGINS', value: process.env.CORS_TEST_ORIGINS },
  ];

  envSpecificOrigins.forEach(({ name, value }) => {
    if (value) {
      const origins = value.split(',').map(o => o.trim());
      origins.forEach(origin => {
        if (!origin.startsWith('http://') && !origin.startsWith('https://')) {
          errors.push(`Invalid ${name} format: ${origin} - must start with http:// or https://`);
        }
      });
    }
  });

  // Legacy configuration validation (for backward compatibility)
  if (isProduction) {
    if (clientOrigin && !clientOrigin.startsWith('https://')) {
      errors.push('CLIENT_ORIGIN must use HTTPS in production');
    }
    if (frontendUrl && !frontendUrl.startsWith('https://')) {
      warnings.push('FRONTEND_URL should use HTTPS in production');
    }
  }

  // Provide recommendations for optimization
  if (corsAllowedOrigins && (clientOrigin || frontendUrl)) {
    recommendations.push('CORS: You have both new (CORS_ALLOWED_ORIGINS) and legacy (CLIENT_ORIGIN/FRONTEND_URL) configuration. Consider using only CORS_ALLOWED_ORIGINS for cleaner setup');
  }

  if (!corsAllowedOrigins && (clientOrigin || frontendUrl)) {
    recommendations.push('CORS: Consider migrating to CORS_ALLOWED_ORIGINS for better flexibility');
  }

  // Validate pattern domains
  if (process.env.CORS_PATTERN_DOMAINS) {
    const patterns = process.env.CORS_PATTERN_DOMAINS.split(',').map(p => p.trim());
    patterns.forEach(pattern => {
      if (pattern.includes('.') || pattern.includes('/')) {
        warnings.push(`CORS_PATTERN_DOMAINS should contain base domain names only: ${pattern}`);
        recommendations.push('CORS_PATTERN_DOMAINS: Use base names like "myapp,staging-app" (without .vercel.app)');
      }
    });
  }
}

/**
 * Validates production-specific configuration
 */
function validateProductionConfiguration(
  errors: string[],
  warnings: string[],
  recommendations: string[]
): void {
  // Check database configuration
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    warnings.push('No database URL configured - using SQLite fallback');
    recommendations.push(
      'DATABASE_URL: Use PostgreSQL for production (Vercel Postgres recommended)'
    );
  } else if (databaseUrl.includes('sqlite') || databaseUrl.includes('file:')) {
    warnings.push('Using SQLite in production - PostgreSQL recommended');
    recommendations.push(
      'DATABASE_URL: Switch to PostgreSQL for better performance and reliability'
    );
  }

  // Check security settings
  if (process.env.ALLOW_NO_ORIGIN_IN_PRODUCTION === 'true') {
    warnings.push('Allowing requests with no origin in production - security risk');
    recommendations.push('ALLOW_NO_ORIGIN_IN_PRODUCTION: Set to false for better security');
  }

  // Check if common production URLs are configured
  const hasVercelDomain =
    process.env.CLIENT_ORIGIN?.includes('vercel.app') ||
    process.env.FRONTEND_URL?.includes('vercel.app');

  if (!hasVercelDomain) {
    warnings.push('No Vercel domain detected in CORS configuration');
    recommendations.push(
      'CORS: Ensure your Vercel app URL is included in CLIENT_ORIGIN or TRUSTED_ORIGINS'
    );
  }
}

/**
 * Generates a deployment checklist based on validation results
 */
export function generateDeploymentChecklist(
  validationResult: EnvironmentValidationResult
): string[] {
  const checklist: string[] = [
    '# Vercel Deployment Checklist',
    '',
    '## Environment Variables (Set in Vercel Dashboard)',
    '1. Go to Project Settings → Environment Variables',
    '2. Set the following required variables:',
    '',
  ];

  REQUIRED_ENV_VARS.forEach(envVar => {
    const status = process.env[envVar.name] ? '✅' : '❌';
    checklist.push(`   ${status} ${envVar.name} - ${envVar.description}`);
    if (envVar.recommendation) {
      checklist.push(`      Recommendation: ${envVar.recommendation}`);
    }
    checklist.push('');
  });

  if (validationResult.errors.length > 0) {
    checklist.push('## ❌ Issues to Fix:');
    validationResult.errors.forEach(error => {
      checklist.push(`- ${error}`);
    });
    checklist.push('');
  }

  if (validationResult.warnings.length > 0) {
    checklist.push('## ⚠️ Warnings:');
    validationResult.warnings.forEach(warning => {
      checklist.push(`- ${warning}`);
    });
    checklist.push('');
  }

  if (validationResult.recommendations.length > 0) {
    checklist.push('## 💡 Recommendations:');
    validationResult.recommendations.forEach(rec => {
      checklist.push(`- ${rec}`);
    });
    checklist.push('');
  }

  checklist.push('## Additional Steps:');
  checklist.push('3. Redeploy after setting environment variables');
  checklist.push('4. Test authentication flow in production');
  checklist.push('5. Monitor logs for any remaining issues');

  return checklist;
}

/**
 * Logs environment validation results
 */
export function logEnvironmentStatus(): void {
  const validation = validateEnvironment();

  if (!validation.isValid) {
    console.error('\n🚨 DEPLOYMENT ERROR: Environment validation failed');
    console.error('The following issues must be resolved before deployment:\n');
    validation.errors.forEach(error => console.error(`❌ ${error}`));

    if (validation.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      validation.recommendations.forEach(rec => console.log(`  - ${rec}`));
    }

    console.log('\n📋 For a complete deployment checklist, run: npm run deployment:check');
  }
}
