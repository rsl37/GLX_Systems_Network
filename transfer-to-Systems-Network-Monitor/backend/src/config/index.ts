/**
 * GLX Systems Network Monitoring Platform
 * Configuration Management
 *
 * Copyright (c) 2025 rsl37
 * Dual-licensed under PolyForm Shield 1.0.0 OR PolyForm Noncommercial 1.0.0
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

interface Config {
  app: {
    name: string;
    env: string;
    port: number;
  };
  database: {
    url: string;
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    pool: {
      min: number;
      max: number;
    };
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    ttl: number;
  };
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };
  security: {
    bcryptRounds: number;
    rateLimit: {
      windowMs: number;
      maxRequests: number;
    };
    corsOrigins: string[];
  };
  blockchain: {
    enabled: boolean;
    consensusThreshold: number;
    difficulty: number;
  };
  pqc: {
    enabled: boolean;
    keyRotationDays: number;
  };
  logging: {
    level: string;
    dir: string;
    maxFiles: string;
    maxSize: string;
  };
  monitoring: {
    healthCheckInterval: number;
    metricsEnabled: boolean;
  };
}

function validateConfig(): void {
  const required = ['JWT_SECRET', 'DATABASE_URL'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate JWT secret strength
  const jwtSecret = process.env.JWT_SECRET || '';
  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long for security');
  }

  if (jwtSecret === 'default-secret' || jwtSecret === 'CHANGE_THIS_TO_A_SECURE_RANDOM_STRING_AT_LEAST_64_CHARACTERS_LONG') {
    throw new Error('JWT_SECRET must be changed from default value in production');
  }
}

// Validate configuration on load
validateConfig();

export const config: Config = {
  app: {
    name: process.env.APP_NAME || 'GLX Systems Network Monitoring Platform',
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
  },
  database: {
    url: process.env.DATABASE_URL || '',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'glx_systems',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || '2', 10),
      max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    },
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    ttl: parseInt(process.env.REDIS_TTL || '3600', 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    },
    corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
  },
  blockchain: {
    enabled: process.env.BLOCKCHAIN_ENABLED === 'true',
    consensusThreshold: parseFloat(process.env.BLOCKCHAIN_CONSENSUS_THRESHOLD || '0.51'),
    difficulty: parseInt(process.env.BLOCKCHAIN_DIFFICULTY || '4', 10),
  },
  pqc: {
    enabled: process.env.PQC_ENABLED === 'true',
    keyRotationDays: parseInt(process.env.PQC_KEY_ROTATION_DAYS || '90', 10),
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || path.join(process.cwd(), 'logs'),
    maxFiles: process.env.LOG_MAX_FILES || '14d',
    maxSize: process.env.LOG_MAX_SIZE || '20m',
  },
  monitoring: {
    healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10),
    metricsEnabled: process.env.METRICS_ENABLED === 'true',
  },
};

export default config;
