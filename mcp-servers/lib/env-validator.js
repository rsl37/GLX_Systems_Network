/**
 * @file lib/env-validator.js
 * Centralized, strict environment variable validation for all MCP servers.
 * Fails fast with clear errors if any required variable is missing or malformed.
 */

const crypto = require('crypto');

/**
 * Define the schema for environment variables.
 * Each server can extend or override this base schema.
 */
const BASE_ENV_SCHEMA = {
  NODE_ENV: {
    type: 'string',
    enum: ['development', 'staging', 'production'],
    required: true,
    default: 'production',
  },
  LOG_LEVEL: {
    type: 'string',
    enum: ['debug', 'info', 'warn', 'error'],
    required: false,
    default: 'info',
  },
  MCP_PORT: {
    type: 'integer',
    min: 1024,
    max: 65535,
    required: false,
    default: 3000,
  },
};

/**
 * Validate and parse environment variables against a schema.
 * @param {Object} schema - Schema definition (see BASE_ENV_SCHEMA for structure)
 * @param {Object} env - Environment object (defaults to process.env)
 * @returns {Object} Validated, typed environment object
 * @throws {Error} If validation fails
 */
function validateEnv(schema, env = process.env) {
  const validated = {};
  const errors = [];

  for (const [key, config] of Object.entries(schema)) {
    const value = env[key];

    // Check required
    if (config.required && !value) {
      errors.push(`Missing required environment variable: ${key}`);
      continue;
    }

    // Use default if not provided
    if (!value) {
      validated[key] = config.default;
      continue;
    }

    // Type validation
    let parsed = value;
    try {
      if (config.type === 'integer') {
        parsed = parseInt(value, 10);
        if (isNaN(parsed)) {
          throw new Error(`Invalid integer: ${value}`);
        }
      } else if (config.type === 'boolean') {
        parsed = ['true', '1', 'yes'].includes(value.toLowerCase());
      } else if (config.type === 'json') {
        parsed = JSON.parse(value);
      }
    } catch (err) {
      errors.push(`Failed to parse ${key}: ${err.message}`);
      continue;
    }

    // Range validation (integers)
    if (config.type === 'integer') {
      if (config.min !== undefined && parsed < config.min) {
        errors.push(`${key} must be >= ${config.min}, got ${parsed}`);
        continue;
      }
      if (config.max !== undefined && parsed > config.max) {
        errors.push(`${key} must be <= ${config.max}, got ${parsed}`);
        continue;
      }
    }

    // Enum validation
    if (config.enum && !config.enum.includes(parsed)) {
      errors.push(`${key} must be one of [${config.enum.join(', ')}], got ${parsed}`);
      continue;
    }

    // Custom validator
    if (config.validate && !config.validate(parsed)) {
      errors.push(`${key} failed custom validation: ${config.validateMsg || ''}`);
      continue;
    }

    validated[key] = parsed;
  }

  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
  }

  return validated;
}

/**
 * Hash a secret for logging purposes (never log the full secret).
 * @param {string} secret - Secret to hash
 * @returns {string} First 8 chars + hash prefix for identification
 */
function hashSecretForLogging(secret) {
  if (!secret || secret.length === 0) return '(empty)';
  const hash = crypto.createHash('sha256').update(secret).digest('hex').substring(0, 8);
  return `${secret.substring(0, 4)}...${hash}`;
}

module.exports = {
  BASE_ENV_SCHEMA,
  validateEnv,
  hashSecretForLogging,
};
