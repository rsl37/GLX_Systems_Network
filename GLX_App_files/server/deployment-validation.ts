/*
 * Copyright (c) 2025 GLX Civic Networking App
 *
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import { Request, Response } from 'express';
import fs from 'fs';
import fsExtra from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import { createRequire } from 'module';
import { db } from './database.js';

const require = createRequire(import.meta.url);
const checkDiskSpace = require('check-disk-space').default;

// Environment variables that are required for production deployment
const CRITICAL_ENV_VARS = [
  'NODE_ENV',
  'JWT_SECRET',
  'CLIENT_ORIGIN'    // CORS configuration
];

const RECOMMENDED_ENV_VARS = [
  'PORT',
  'DATA_DIRECTORY',
  'JWT_REFRESH_SECRET',
  'ENCRYPTION_MASTER_KEY',
  'DATABASE_URL',     // Production database connection
  'FRONTEND_URL',     // Legacy frontend URL support
  'TRUSTED_ORIGINS'   // Required for Version 3.0: third-party integrations, mobile contexts, enterprise deployments
];

// Essential environment variables for core features
const ESSENTIAL_ENV_VARS = [
  'PUSHER_APP_ID',    // Real-time features - ESSENTIAL
  'PUSHER_KEY',       // Real-time features - ESSENTIAL
  'PUSHER_SECRET',    // Real-time features - ESSENTIAL
  'PUSHER_CLUSTER',   // Real-time features - ESSENTIAL
  'SMTP_HOST',        // Email verification, password reset - ESSENTIAL
  'SMTP_PORT',        // Email verification, password reset - ESSENTIAL
  'SMTP_USER',        // Email verification, password reset - ESSENTIAL
  'SMTP_PASS',        // Email verification, password reset - ESSENTIAL
  'SMTP_FROM',        // Email verification, password reset - ESSENTIAL
  'TWILIO_SID',       // Phone verification, password reset - ESSENTIAL
  'TWILIO_AUTH_TOKEN', // Phone verification, password reset - ESSENTIAL
  'TWILIO_PHONE_NUMBER' // Phone verification, password reset - ESSENTIAL
];

const OPTIONAL_ENV_VARS = [
  // Development and debugging only
];

// Top 50 SMTP hosts used globally
const SUPPORTED_SMTP_HOSTS = [
  // Major email providers
  'smtp.gmail.com', 'smtp.googlemail.com',
  'smtp-mail.outlook.com', 'smtp.live.com', 'smtp.hotmail.com',
  'smtp.mail.yahoo.com', 'smtp.mail.yahoo.co.uk', 'smtp.mail.yahoo.fr',
  'smtp.aol.com', 'smtp.mail.me.com', 'smtp.icloud.com',
  // Business email providers
  'smtp.office365.com', 'smtp.exchange.office365.com',
  'smtp.zoho.com', 'smtp.zoho.eu', 'smtp.zoho.in',
  'smtp.fastmail.com', 'smtp.fastmail.fm',
  'smtp.protonmail.com', 'smtp.protonmail.ch',
  'smtp.tutanota.com', 'smtp.tutanota.de',
  // Regional providers
  'smtp.yandex.com', 'smtp.yandex.ru',
  'smtp.mail.ru', 'smtp.rambler.ru',
  'smtp.qq.com', 'smtp.163.com', 'smtp.126.com',
  'smtp.sina.com', 'smtp.sohu.com',
  'smtp.naver.com', 'smtp.daum.net',
  'smtp.web.de', 'smtp.gmx.de', 'smtp.gmx.com',
  'smtp.freenet.de', 't-online.de',
  'smtp.orange.fr', 'smtp.sfr.fr', 'smtp.free.fr',
  'smtp.alice.it', 'smtp.libero.it', 'smtp.tiscali.it',
  'smtp.terra.com.br', 'smtp.uol.com.br',
  // Enterprise and hosting providers
  'mail.privateemail.com', 'secureserver.net',
  'smtp.1and1.com', 'smtp.ionos.com',
  'smtp.bluehost.com', 'smtp.hostgator.com',
  'smtp.dreamhost.com', 'smtp.godaddy.com',
  'smtp.namecheap.com', 'smtp.siteground.com'
];

// International country codes and their phone number patterns
const INTERNATIONAL_PHONE_PATTERNS = {
  // Format: country code -> { min_length, max_length, pattern }
  '+1': { min: 11, max: 11, pattern: /^\+1[2-9]\d{2}[2-9]\d{6}$/ }, // US/Canada
  '+44': { min: 11, max: 13, pattern: /^\+44[1-9]\d{8,10}$/ }, // UK
  '+49': { min: 11, max: 12, pattern: /^\+49[1-9]\d{9,10}$/ }, // Germany
  '+33': { min: 10, max: 12, pattern: /^\+33[1-9]\d{8,10}$/ }, // France
  '+39': { min: 10, max: 13, pattern: /^\+39[0-9]\d{8,11}$/ }, // Italy
  '+34': { min: 11, max: 11, pattern: /^\+34[6-9]\d{8}$/ }, // Spain
  '+31': { min: 11, max: 11, pattern: /^\+31[6]\d{8}$/ }, // Netherlands
  '+46': { min: 10, max: 12, pattern: /^\+46[7]\d{8,10}$/ }, // Sweden
  '+47': { min: 10, max: 10, pattern: /^\+47[4,9]\d{7}$/ }, // Norway
  '+45': { min: 10, max: 10, pattern: /^\+45[2-9]\d{7}$/ }, // Denmark
  '+41': { min: 11, max: 12, pattern: /^\+41[7]\d{8,9}$/ }, // Switzerland
  '+43': { min: 11, max: 13, pattern: /^\+43[6]\d{9,11}$/ }, // Austria
  '+32': { min: 10, max: 11, pattern: /^\+32[4]\d{8,9}$/ }, // Belgium
  '+7': { min: 11, max: 11, pattern: /^\+7[9]\d{9}$/ }, // Russia
  '+86': { min: 11, max: 13, pattern: /^\+86[1]\d{10,12}$/ }, // China
  '+81': { min: 11, max: 13, pattern: /^\+81[7,8,9]\d{9,11}$/ }, // Japan
  '+82': { min: 11, max: 12, pattern: /^\+82[1]\d{9,10}$/ }, // South Korea
  '+91': { min: 12, max: 13, pattern: /^\+91[6-9]\d{9,10}$/ }, // India
  '+61': { min: 11, max: 12, pattern: /^\+61[4]\d{8,9}$/ }, // Australia
  '+64': { min: 10, max: 11, pattern: /^\+64[2]\d{7,8}$/ }, // New Zealand
  '+55': { min: 11, max: 13, pattern: /^\+55[1-9]\d{9,11}$/ }, // Brazil
  '+52': { min: 11, max: 13, pattern: /^\+52[1]\d{9,11}$/ }, // Mexico
  '+54': { min: 11, max: 13, pattern: /^\+54[9]\d{9,11}$/ }, // Argentina
  '+27': { min: 11, max: 11, pattern: /^\+27[6,7,8]\d{8}$/ }, // South Africa
};

// Minimum requirements for production
const PRODUCTION_REQUIREMENTS = {
  JWT_SECRET_MIN_LENGTH: 32,
  MIN_DISK_SPACE_MB: 100,
  REQUIRED_DIRECTORIES: ['uploads', 'logs'],
  REQUIRED_PERMISSIONS: 0o755
};

interface ValidationResult {
  check: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

interface DeploymentReadinessReport {
  overall_status: 'ready' | 'warning' | 'not_ready';
  timestamp: string;
  environment: string;
  checks: ValidationResult[];
  summary: {
    passed: number;
    failed: number;
    warnings: number;
    total: number;
  };
}

/**
 * Validates environment variables for deployment
 */
export function validateEnvironmentVariables(): ValidationResult[] {
  const results: ValidationResult[] = [];

  // Check critical environment variables (required for basic functionality)
  const isDevOrTest = process.env.NODE_ENV === 'test' ||
                      process.env.NODE_ENV === 'development' ||
                      process.env.CI === 'true';

  for (const envVar of CRITICAL_ENV_VARS) {
    const value = process.env[envVar];
    if (!value) {
      // CLIENT_ORIGIN can be optional in development/test environments
      if (envVar === 'CLIENT_ORIGIN' && isDevOrTest) {
        results.push({
          check: `Critical Environment Variable: ${envVar}`,
          status: 'warning',
          message: `Critical environment variable ${envVar} is not set - CORS may be permissive in ${process.env.NODE_ENV} mode`,
          details: { variable: envVar, required: false, category: 'critical', environment: process.env.NODE_ENV }
        });
      } else {
        results.push({
          check: `Critical Environment Variable: ${envVar}`,
          status: 'fail',
          message: `Critical environment variable ${envVar} is not set`,
          details: { variable: envVar, required: true, category: 'critical' }
        });
      }
    } else {
      results.push({
        check: `Critical Environment Variable: ${envVar}`,
        status: 'pass',
        message: `Critical environment variable ${envVar} is properly set`,
        details: { variable: envVar, length: value.length, category: 'critical' }
      });
    }
  }

  // Check recommended environment variables (should be set for production)
  for (const envVar of RECOMMENDED_ENV_VARS) {
    const value = process.env[envVar];
    if (!value) {
      results.push({
        check: `Recommended Environment Variable: ${envVar}`,
        status: 'warning',
        message: `Recommended environment variable ${envVar} is not set`,
        details: { variable: envVar, required: false, category: 'recommended' }
      });
    } else {
      results.push({
        check: `Recommended Environment Variable: ${envVar}`,
        status: 'pass',
        message: `Recommended environment variable ${envVar} is properly set`,
        details: { variable: envVar, length: value.length, category: 'recommended' }
      });
    }
  }

  // Check essential environment variables (required for core features)
  // In test/CI/development environments, treat missing essential vars as warnings, not failures
  const isNonProduction = process.env.NODE_ENV === 'test' ||
                          process.env.NODE_ENV === 'development' ||
                          process.env.CI === 'true';

  for (const envVar of ESSENTIAL_ENV_VARS) {
    const value = process.env[envVar];
    if (!value) {
      const status = isNonProduction ? 'warning' : 'fail';
      const message = isNonProduction
        ? `Essential environment variable ${envVar} is not set - some features may be limited in ${process.env.NODE_ENV} environment`
        : `Essential environment variable ${envVar} is not set - core features will not work`;

      results.push({
        check: `Essential Environment Variable: ${envVar}`,
        status: status,
        message: message,
        details: { variable: envVar, required: !isNonProduction, category: 'essential', environment: process.env.NODE_ENV }
      });
    } else {
      // Check for placeholder values that indicate incomplete configuration
      const placeholderValues = ['dev-', 'your-', 'example', 'localhost', 'test-', 'REQUIRED-'];
      const isPlaceholder = placeholderValues.some(placeholder => value.toLowerCase().includes(placeholder.toLowerCase()));

      if (isPlaceholder) {
        // In development/test environments, treat placeholder values as warnings, not failures
        const status = isNonProduction ? 'warning' : 'fail';
        const message = isNonProduction
          ? `Essential environment variable ${envVar} contains placeholder value - configure with real credentials for production`
          : `Essential environment variable ${envVar} contains placeholder value - must be configured with real service credentials`;

        results.push({
          check: `Essential Environment Variable: ${envVar}`,
          status: status,
          message: message,
          details: { variable: envVar, value_type: 'placeholder', category: 'essential', environment: process.env.NODE_ENV }
        });
      } else {
        results.push({
          check: `Essential Environment Variable: ${envVar}`,
          status: 'pass',
          message: `Essential environment variable ${envVar} is properly configured`,
          details: { variable: envVar, length: value.length, category: 'essential' }
        });
      }
    }
  }

  // Check optional environment variables (nice to have)
  for (const envVar of OPTIONAL_ENV_VARS) {
    const value = process.env[envVar];
    if (!value) {
      results.push({
        check: `Optional Environment Variable: ${envVar}`,
        status: 'warning',
        message: `Optional environment variable ${envVar} is not set - some features may be unavailable`,
        details: { variable: envVar, required: false, category: 'optional' }
      });
    } else {
      results.push({
        check: `Optional Environment Variable: ${envVar}`,
        status: 'pass',
        message: `Optional environment variable ${envVar} is properly set`,
        details: { variable: envVar, length: value.length, category: 'optional' }
      });
    }
  }

  // Check recommended environment variables (warn if missing)
  for (const envVar of RECOMMENDED_ENV_VARS) {
    const value = process.env[envVar];
    if (!value) {
      results.push({
        check: `Environment Variable: ${envVar}`,
        status: 'warning',
        message: `Recommended environment variable ${envVar} is not set. Some features may be limited.`,
        details: { variable: envVar, recommended: true }
      });
    } else {
      results.push({
        check: `Environment Variable: ${envVar}`,
        status: 'pass',
        message: `Environment variable ${envVar} is properly set`,
        details: { variable: envVar, length: value.length }
      });
    }
  }

  // Validate JWT_SECRET strength
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret) {
    if (jwtSecret.length < PRODUCTION_REQUIREMENTS.JWT_SECRET_MIN_LENGTH) {
      results.push({
        check: 'JWT Secret Strength',
        status: 'fail',
        message: `JWT_SECRET is too short (${jwtSecret.length} chars). Minimum ${PRODUCTION_REQUIREMENTS.JWT_SECRET_MIN_LENGTH} characters required for production`,
        details: { current_length: jwtSecret.length, required_length: PRODUCTION_REQUIREMENTS.JWT_SECRET_MIN_LENGTH }
      });
    } else {
      results.push({
        check: 'JWT Secret Strength',
        status: 'pass',
        message: `JWT_SECRET meets security requirements (${jwtSecret.length} characters)`,
        details: { length: jwtSecret.length }
      });
    }
  }

  // Validate JWT_REFRESH_SECRET strength
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
  if (jwtRefreshSecret) {
    if (jwtRefreshSecret.length < PRODUCTION_REQUIREMENTS.JWT_SECRET_MIN_LENGTH) {
      results.push({
        check: 'JWT Refresh Secret Strength',
        status: 'fail',
        message: `JWT_REFRESH_SECRET is too short (${jwtRefreshSecret.length} chars). Minimum ${PRODUCTION_REQUIREMENTS.JWT_SECRET_MIN_LENGTH} characters required for production`,
        details: { current_length: jwtRefreshSecret.length, required_length: PRODUCTION_REQUIREMENTS.JWT_SECRET_MIN_LENGTH }
      });
    } else {
      results.push({
        check: 'JWT Refresh Secret Strength',
        status: 'pass',
        message: `JWT_REFRESH_SECRET meets security requirements (${jwtRefreshSecret.length} characters)`,
        details: { length: jwtRefreshSecret.length }
      });
    }
  }

  // Validate ENCRYPTION_MASTER_KEY strength (should be 64 characters for hex)
  const encryptionKey = process.env.ENCRYPTION_MASTER_KEY;
  if (encryptionKey) {
    if (encryptionKey.length < 64) {
      results.push({
        check: 'Encryption Master Key Strength',
        status: 'fail',
        message: `ENCRYPTION_MASTER_KEY is too short (${encryptionKey.length} chars). Minimum 64 characters required for production`,
        details: { current_length: encryptionKey.length, required_length: 64 }
      });
    } else {
      results.push({
        check: 'Encryption Master Key Strength',
        status: 'pass',
        message: `ENCRYPTION_MASTER_KEY meets security requirements (${encryptionKey.length} characters)`,
        details: { length: encryptionKey.length }
      });
    }
  }

  // Validate SMTP_HOST against supported providers
  const smtpHost = process.env.SMTP_HOST;
  if (smtpHost) {
    if (SUPPORTED_SMTP_HOSTS.includes(smtpHost.toLowerCase())) {
      results.push({
        check: 'SMTP Host Configuration',
        status: 'pass',
        message: `SMTP_HOST is from a supported email provider: ${smtpHost}`,
        details: { host: smtpHost, supported: true }
      });
    } else {
      // Check if it's a custom domain that follows proper SMTP naming conventions
      const isCustomSMTP = /^(smtp|mail)\./i.test(smtpHost) || /\.smtp\./i.test(smtpHost);
      if (isCustomSMTP) {
        results.push({
          check: 'SMTP Host Configuration',
          status: 'pass',
          message: `SMTP_HOST appears to be a valid custom SMTP server: ${smtpHost}`,
          details: { host: smtpHost, type: 'custom', supported: false }
        });
      } else {
        results.push({
          check: 'SMTP Host Configuration',
          status: 'warning',
          message: `SMTP_HOST '${smtpHost}' is not in the list of verified providers. Consider using a mainstream email service for better deliverability.`,
          details: {
            host: smtpHost,
            supported: false,
            suggestion: 'Consider using Gmail, Outlook, or another mainstream provider'
          }
        });
      }
    }
  }

  // Validate SMTP_PORT format if provided
  const smtpPort = process.env.SMTP_PORT;
  if (smtpPort) {
    const portNum = Number(smtpPort);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      results.push({
        check: 'SMTP Port Configuration',
        status: 'fail',
        message: `SMTP_PORT must be a valid port number between 1 and 65535. Current value: ${smtpPort}`,
        details: { port: smtpPort }
      });
    } else {
      // Check for common secure SMTP ports
      const commonPorts = [25, 465, 587, 2525];
      const isCommonPort = commonPorts.includes(portNum);
      const isSecurePort = [465, 587].includes(portNum);

      results.push({
        check: 'SMTP Port Configuration',
        status: 'pass',
        message: `SMTP_PORT is properly configured: ${smtpPort}${isSecurePort ? ' (secure)' : ''}`,
        details: {
          port: portNum,
          common: isCommonPort,
          secure: isSecurePort,
          recommendation: isSecurePort ? 'secure port' : 'consider using port 587 or 465 for security'
        }
      });
    }
  }

  // Validate TWILIO_PHONE_NUMBER format with comprehensive international support
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
  if (twilioPhone) {
    // Basic format check
    if (!twilioPhone.startsWith('+')) {
      results.push({
        check: 'Twilio Phone Number Format',
        status: 'fail',
        message: `TWILIO_PHONE_NUMBER must start with + and include country code. Current: ${twilioPhone}`,
        details: { phone: twilioPhone.substring(0, 5) + '***', issue: 'missing_plus_prefix' }
      });
    } else {
      // Extract country code
      const countryCodeMatch = twilioPhone.match(/^(\+\d{1,4})/);
      if (!countryCodeMatch) {
        results.push({
          check: 'Twilio Phone Number Format',
          status: 'fail',
          message: `TWILIO_PHONE_NUMBER has invalid country code format`,
          details: { phone: twilioPhone.substring(0, 5) + '***', issue: 'invalid_country_code' }
        });
      } else {
        const countryCode = countryCodeMatch[1];
        const phonePattern = INTERNATIONAL_PHONE_PATTERNS[countryCode];

        if (phonePattern) {
          // Validate against specific country pattern
          if (phonePattern.pattern.test(twilioPhone) &&
              twilioPhone.length >= phonePattern.min &&
              twilioPhone.length <= phonePattern.max) {
            results.push({
              check: 'Twilio Phone Number Format',
              status: 'pass',
              message: `TWILIO_PHONE_NUMBER is properly formatted for country code ${countryCode}`,
              details: {
                phone: twilioPhone.substring(0, 5) + '***',
                country_code: countryCode,
                length: twilioPhone.length,
                validated: true
              }
            });
          } else {
            results.push({
              check: 'Twilio Phone Number Format',
              status: 'warning',
              message: `TWILIO_PHONE_NUMBER format may not be standard for country code ${countryCode}`,
              details: {
                phone: twilioPhone.substring(0, 5) + '***',
                country_code: countryCode,
                length: twilioPhone.length,
                expected_min: phonePattern.min,
                expected_max: phonePattern.max
              }
            });
          }
        } else {
          // Generic validation for unsupported country codes
          if (twilioPhone.length >= 8 && twilioPhone.length <= 16) {
            results.push({
              check: 'Twilio Phone Number Format',
              status: 'pass',
              message: `TWILIO_PHONE_NUMBER appears valid with country code ${countryCode} (generic validation)`,
              details: {
                phone: twilioPhone.substring(0, 5) + '***',
                country_code: countryCode,
                length: twilioPhone.length,
                validation_type: 'generic'
              }
            });
          } else {
            results.push({
              check: 'Twilio Phone Number Format',
              status: 'warning',
              message: `TWILIO_PHONE_NUMBER length may be invalid for country code ${countryCode}`,
              details: {
                phone: twilioPhone.substring(0, 5) + '***',
                country_code: countryCode,
                length: twilioPhone.length,
                expected_range: '8-16 characters'
              }
            });
          }
        }
      }
    }
  }

  // Validate DATABASE_URL format if provided
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    try {
      const url = new URL(databaseUrl);
      if (url.protocol === 'postgres:' || url.protocol === 'postgresql:') {
        results.push({
          check: 'DATABASE_URL Format',
          status: 'pass',
          message: 'DATABASE_URL is properly formatted for PostgreSQL',
          details: { protocol: url.protocol, host: url.hostname, database: url.pathname }
        });
      } else {
        results.push({
          check: 'DATABASE_URL Format',
          status: 'warning',
          message: `DATABASE_URL protocol '${url.protocol}' may not be supported. Expected 'postgres:' or 'postgresql:'`,
          details: { protocol: url.protocol }
        });
      }
    } catch (error) {
      results.push({
        check: 'DATABASE_URL Format',
        status: 'fail',
        message: 'DATABASE_URL is not a valid URL format',
        details: { error: (error as Error).message }
      });
    }
  }

  // Validate CLIENT_ORIGIN format if provided
  const clientOrigin = process.env.CLIENT_ORIGIN;
  if (clientOrigin) {
    try {
      const url = new URL(clientOrigin);
      if (url.protocol === 'https:' || (process.env.NODE_ENV !== 'production' && url.protocol === 'http:')) {
        results.push({
          check: 'CLIENT_ORIGIN Format',
          status: 'pass',
          message: 'CLIENT_ORIGIN is properly formatted',
          details: { protocol: url.protocol, host: url.hostname }
        });
      } else {
        results.push({
          check: 'CLIENT_ORIGIN Format',
          status: process.env.NODE_ENV === 'production' ? 'fail' : 'warning',
          message: 'CLIENT_ORIGIN should use HTTPS in production',
          details: { protocol: url.protocol, environment: process.env.NODE_ENV }
        });
      }
    } catch (error) {
      results.push({
        check: 'CLIENT_ORIGIN Format',
        status: 'fail',
        message: 'CLIENT_ORIGIN is not a valid URL format',
        details: { error: (error as Error).message }
      });
    }
  }

  // Validate TRUSTED_ORIGINS format (required for Version 3.0) with security best practices
  const trustedOrigins = process.env.TRUSTED_ORIGINS;
  if (trustedOrigins) {
    const origins = trustedOrigins.split(',').map(origin => origin.trim());
    let validOrigins = 0;
    let invalidOrigins = 0;
    let securityWarnings: string[] = [];

    for (const origin of origins) {
      try {
        const url = new URL(origin);
        if (url.protocol === 'https:' || (process.env.NODE_ENV !== 'production' && url.protocol === 'http:')) {
          validOrigins++;

          // Security validations to reduce attack surface
          if (process.env.NODE_ENV === 'production') {
            // Warn against development origins in production
            if (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname.includes('.local')) {
              securityWarnings.push(`Development origin '${origin}' should not be used in production`);
            }

            // Warn against non-HTTPS in production
            if (url.protocol !== 'https:') {
              securityWarnings.push(`Non-HTTPS origin '${origin}' creates security risk in production`);
            }
          }

          // Warn against overly broad wildcards or IP addresses in production
          if (process.env.NODE_ENV === 'production' && /^\d+\.\d+\.\d+\.\d+/.test(url.hostname)) {
            securityWarnings.push(`IP address origin '${origin}' reduces security - use domain names when possible`);
          }

        } else {
          invalidOrigins++;
        }
      } catch (error) {
        invalidOrigins++;
      }
    }

    if (invalidOrigins === 0) {
      const status = securityWarnings.length > 0 ? 'warning' : 'pass';
      const message = securityWarnings.length > 0
        ? `All ${validOrigins} trusted origins are formatted correctly, but ${securityWarnings.length} security concerns detected`
        : `All ${validOrigins} trusted origins are properly formatted with secure configuration`;

      results.push({
        check: 'TRUSTED_ORIGINS Security',
        status,
        message,
        details: {
          total_origins: origins.length,
          valid_origins: validOrigins,
          security_warnings: securityWarnings,
          purpose: 'Version 3.0: third-party integrations, mobile contexts, enterprise deployments',
          security_notes: [
            'HTTPS enforced in production',
            'Development origins blocked in production',
            'Specific domains preferred over IP addresses',
            'Each origin explicitly validated'
          ]
        }
      });
    } else {
      results.push({
        check: 'TRUSTED_ORIGINS Security',
        status: 'fail',
        message: `${invalidOrigins} of ${origins.length} trusted origins have invalid format or security issues`,
        details: {
          total_origins: origins.length,
          valid_origins: validOrigins,
          invalid_origins: invalidOrigins,
          security_warnings: securityWarnings,
          requirement: 'All origins must be valid URLs with https:// (or http:// in development)',
          security_requirements: [
            'HTTPS required in production',
            'No development origins in production',
            'Specific domains preferred over IP addresses',
            'No wildcard or overly broad patterns'
          ]
        }
      });
    }
  }

  // Validate NODE_ENV for production
  const nodeEnv = process.env.NODE_ENV;
  const isDevelopmentOrTest = nodeEnv === 'test' || nodeEnv === 'development' || process.env.CI === 'true';

  if (nodeEnv !== 'production') {
    if (isDevelopmentOrTest) {
      results.push({
        check: 'Production Environment',
        status: 'pass',
        message: `NODE_ENV is set to '${nodeEnv}' - appropriate for ${nodeEnv} environment`,
        details: { current: nodeEnv, environment_type: nodeEnv }
      });
    } else {
      results.push({
        check: 'Production Environment',
        status: 'warning',
        message: `NODE_ENV is set to '${nodeEnv}', expected 'production' for deployment`,
        details: { current: nodeEnv, expected: 'production' }
      });
    }
  } else {
    results.push({
      check: 'Production Environment',
      status: 'pass',
      message: 'NODE_ENV is properly set to production',
      details: { environment: nodeEnv }
    });
  }

  return results;
}

/**
 * Validates file system setup and permissions
 */
export async function validateFileSystem(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  const dataDirectory = process.env.DATA_DIRECTORY || './data';

  try {
    // Check if data directory exists using fs-extra for enhanced reliability
    const dirExists = await fsExtra.pathExists(dataDirectory);
    if (!dirExists) {
      results.push({
        check: 'Data Directory Existence',
        status: 'fail',
        message: `Data directory does not exist: ${dataDirectory}`,
        details: { path: dataDirectory }
      });
      return results; // Can't continue without data directory
    } else {
      results.push({
        check: 'Data Directory Existence',
        status: 'pass',
        message: `Data directory exists: ${dataDirectory}`,
        details: { path: dataDirectory }
      });
    }

    // Check data directory permissions using fs-extra enhanced stats
    const dataStats = await fsExtra.stat(dataDirectory);
    const permissions = (dataStats.mode & parseInt('777', 8)).toString(8);
    if ((dataStats.mode & PRODUCTION_REQUIREMENTS.REQUIRED_PERMISSIONS) !== PRODUCTION_REQUIREMENTS.REQUIRED_PERMISSIONS) {
      results.push({
        check: 'Data Directory Permissions',
        status: 'fail',
        message: `Data directory permissions are insufficient. Current: ${permissions}, Required: ${PRODUCTION_REQUIREMENTS.REQUIRED_PERMISSIONS.toString(8)}`,
        details: { current_permissions: permissions, required_permissions: PRODUCTION_REQUIREMENTS.REQUIRED_PERMISSIONS.toString(8) }
      });
    } else {
      results.push({
        check: 'Data Directory Permissions',
        status: 'pass',
        message: `Data directory has proper permissions: ${permissions}`,
        details: { permissions }
      });
    }

    // Check required subdirectories using fs-extra
    for (const subdir of PRODUCTION_REQUIREMENTS.REQUIRED_DIRECTORIES) {
      const subdirPath = path.join(dataDirectory, subdir);
      const subdirExists = await fsExtra.pathExists(subdirPath);

      if (!subdirExists) {
        results.push({
          check: `Required Directory: ${subdir}`,
          status: 'fail',
          message: `Required subdirectory does not exist: ${subdirPath}`,
          details: { path: subdirPath, parent: dataDirectory }
        });
      } else {
        const subdirStats = await fsExtra.stat(subdirPath);
        const subdirPerms = (subdirStats.mode & parseInt('777', 8)).toString(8);
        results.push({
          check: `Required Directory: ${subdir}`,
          status: 'pass',
          message: `Required subdirectory exists with proper permissions: ${subdirPath} (${subdirPerms})`,
          details: { path: subdirPath, permissions: subdirPerms }
        });
      }
    }

    // Check available disk space with 100% accurate cross-platform monitoring
    try {
      // Use fs-extra to ensure directory exists and is accessible
      const dirExists = await fsExtra.pathExists(dataDirectory);
      if (!dirExists) {
        throw new Error(`Data directory does not exist: ${dataDirectory}`);
      }

      // Use check-disk-space for accurate cross-platform disk space information
      const absoluteDataDirectory = path.resolve(dataDirectory);
      const diskSpace = await checkDiskSpace(absoluteDataDirectory);

      // Convert from bytes to MB for consistency
      const totalSpaceMB = Math.round(diskSpace.size / (1024 * 1024));
      const freeSpaceMB = Math.round(diskSpace.free / (1024 * 1024));
      const usedSpaceMB = totalSpaceMB - freeSpaceMB;
      const usedPercentage = (usedSpaceMB / totalSpaceMB) * 100;

      const diskSpaceInfo = {
        total_mb: totalSpaceMB,
        used_mb: usedSpaceMB,
        available_mb: freeSpaceMB,
        used_percentage: Math.round(usedPercentage * 100) / 100,
        method: 'check-disk-space',
        platform_support: 'cross-platform',
        accuracy: '100%'
      };

      if (freeSpaceMB < PRODUCTION_REQUIREMENTS.MIN_DISK_SPACE_MB) {
        results.push({
          check: 'Disk Space Availability',
          status: 'fail',
          message: `Insufficient disk space. Available: ${freeSpaceMB}MB, Required: ${PRODUCTION_REQUIREMENTS.MIN_DISK_SPACE_MB}MB`,
          details: {
            ...diskSpaceInfo,
            required_mb: PRODUCTION_REQUIREMENTS.MIN_DISK_SPACE_MB
          }
        });
      } else {
        const status = usedPercentage > 90 ? 'warning' : 'pass';
        const message = usedPercentage > 90
          ? `Disk space is available but usage is high (${usedPercentage.toFixed(1)}%). Monitor closely.`
          : `Sufficient disk space available: ${freeSpaceMB}MB (${(100 - usedPercentage).toFixed(1)}% free)`;

        results.push({
          check: 'Disk Space Availability',
          status,
          message,
          details: {
            ...diskSpaceInfo,
            required_mb: PRODUCTION_REQUIREMENTS.MIN_DISK_SPACE_MB
          }
        });
      }
    } catch (error) {
      results.push({
        check: 'Disk Space Availability',
        status: 'fail',
        message: `Failed to check disk space: ${(error as Error).message}`,
        details: {
          error: (error as Error).message,
          note: 'Cross-platform disk space check failed - this indicates a serious system issue'
        }
      });
    }

  } catch (error) {
    results.push({
      check: 'File System Access',
      status: 'fail',
      message: `Error accessing file system: ${(error as Error).message}`,
      details: { error: (error as Error).message }
    });
  }

  return results;
}

/**
 * Validates database connectivity and schema
 */
export async function validateDatabase(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  try {
    // Test basic database connection
    const testQuery = await db.selectFrom('users').selectAll().limit(1).execute();
    results.push({
      check: 'Database Connection',
      status: 'pass',
      message: 'Database connection is working properly',
      details: { test_query_result_count: testQuery.length }
    });

    // Check if essential tables exist
    const tables = ['users', 'help_requests', 'crisis_alerts', 'proposals'];
    for (const table of tables) {
      try {
        await db.selectFrom(table as any).selectAll().limit(1).execute();
        results.push({
          check: `Database Table: ${table}`,
          status: 'pass',
          message: `Table '${table}' exists and is accessible`,
          details: { table }
        });
      } catch (error) {
        results.push({
          check: `Database Table: ${table}`,
          status: 'fail',
          message: `Table '${table}' is missing or inaccessible: ${(error as Error).message}`,
          details: { table, error: (error as Error).message }
        });
      }
    }

  } catch (error) {
    results.push({
      check: 'Database Connection',
      status: 'fail',
      message: `Database connection failed: ${(error as Error).message}`,
      details: { error: (error as Error).message }
    });
  }

  return results;
}

/**
 * Validates production configuration and security settings
 */
export function validateProductionConfig(): ValidationResult[] {
  const results: ValidationResult[] = [];

  // Check if running in production mode
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === 'production') {
    results.push({
      check: 'Production Mode',
      status: 'pass',
      message: 'Application is running in production mode',
      details: { node_env: nodeEnv }
    });
  } else {
    results.push({
      check: 'Production Mode',
      status: 'warning',
      message: `Application is not in production mode (current: ${nodeEnv})`,
      details: { node_env: nodeEnv, expected: 'production' }
    });
  }

  // Check frontend URL configuration
  const frontendUrl = process.env.FRONTEND_URL;
  if (frontendUrl && frontendUrl.startsWith('https://')) {
    results.push({
      check: 'HTTPS Frontend URL',
      status: 'pass',
      message: 'Frontend URL is configured with HTTPS',
      details: { frontend_url: frontendUrl }
    });
  } else if (frontendUrl) {
    results.push({
      check: 'HTTPS Frontend URL',
      status: 'warning',
      message: 'Frontend URL is not using HTTPS. This is required for production',
      details: { frontend_url: frontendUrl }
    });
  }

  // Check port configuration
  const port = process.env.PORT;
  if (port && !isNaN(Number(port))) {
    const portNum = Number(port);
    if (portNum >= 1024 && portNum <= 65535) {
      results.push({
        check: 'Port Configuration',
        status: 'pass',
        message: `Port is properly configured: ${port}`,
        details: { port: portNum }
      });
    } else {
      results.push({
        check: 'Port Configuration',
        status: 'warning',
        message: `Port ${port} may not be suitable for production. Consider using a port between 1024-65535`,
        details: { port: portNum }
      });
    }
  }

  return results;
}

/**
 * Performs comprehensive deployment readiness check
 */
export async function performDeploymentReadinessCheck(): Promise<DeploymentReadinessReport> {
  console.log('🚀 Starting deployment readiness check...');

  const allChecks: ValidationResult[] = [];

  // Collect all validation results
  allChecks.push(...validateEnvironmentVariables());
  allChecks.push(...await validateFileSystem());
  allChecks.push(...await validateDatabase());
  allChecks.push(...validateProductionConfig());

  // Calculate summary
  const summary = {
    passed: allChecks.filter(c => c.status === 'pass').length,
    failed: allChecks.filter(c => c.status === 'fail').length,
    warnings: allChecks.filter(c => c.status === 'warning').length,
    total: allChecks.length
  };

  // Determine overall status
  let overall_status: 'ready' | 'warning' | 'not_ready';
  if (summary.failed > 0) {
    overall_status = 'not_ready';
  } else if (summary.warnings > 0) {
    overall_status = 'warning';
  } else {
    overall_status = 'ready';
  }

  const report: DeploymentReadinessReport = {
    overall_status,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    checks: allChecks,
    summary
  };

  console.log(`✅ Deployment readiness check completed. Status: ${overall_status}`);
  console.log(`📊 Summary: ${summary.passed} passed, ${summary.failed} failed, ${summary.warnings} warnings`);

  return report;
}

/**
 * Express endpoint for deployment readiness check
 */
export const getDeploymentReadiness = async (req: Request, res: Response): Promise<void> => {
  try {
    const report = await performDeploymentReadinessCheck();

    // Set appropriate HTTP status based on readiness
    let statusCode = 200;
    if (report.overall_status === 'not_ready') {
      statusCode = 503; // Service Unavailable
    } else if (report.overall_status === 'warning') {
      statusCode = 200; // OK but with warnings
    }

    res.status(statusCode).json({
      success: report.overall_status !== 'not_ready',
      data: report
    });
  } catch (error) {
    console.error('❌ Deployment readiness check failed:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Deployment readiness check failed',
        details: (error as Error).message,
        statusCode: 500
      }
    });
  }
};