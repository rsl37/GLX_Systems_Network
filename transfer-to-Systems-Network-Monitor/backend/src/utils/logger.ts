/**
 * GLX Systems Network Monitoring Platform
 * Structured Logging with Winston
 *
 * Copyright (c) 2025 rsl37
 * Dual-licensed under PolyForm Shield 1.0.0 OR PolyForm Noncommercial 1.0.0
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { config } from '../config';
import fs from 'fs';

// Ensure log directory exists
if (!fs.existsSync(config.logging.dir)) {
  fs.mkdirSync(config.logging.dir, { recursive: true });
}

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Custom format for file output (JSON)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Daily rotate file transport for all logs
const allLogsTransport = new DailyRotateFile({
  filename: path.join(config.logging.dir, 'application-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxFiles: config.logging.maxFiles,
  maxSize: config.logging.maxSize,
  format: fileFormat,
});

// Daily rotate file transport for error logs
const errorLogsTransport = new DailyRotateFile({
  filename: path.join(config.logging.dir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxFiles: config.logging.maxFiles,
  maxSize: config.logging.maxSize,
  level: 'error',
  format: fileFormat,
});

// Daily rotate file transport for security audit logs
const auditLogsTransport = new DailyRotateFile({
  filename: path.join(config.logging.dir, 'audit-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxFiles: '90d', // Keep audit logs longer
  maxSize: config.logging.maxSize,
  format: fileFormat,
});

// Create the logger
const logger = winston.createLogger({
  level: config.logging.level,
  transports: [
    allLogsTransport,
    errorLogsTransport,
  ],
});

// Add console transport in development
if (config.app.env !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
  }));
}

// Separate audit logger
export const auditLogger = winston.createLogger({
  level: 'info',
  format: fileFormat,
  transports: [auditLogsTransport],
});

// Helper methods for structured logging
export const log = {
  info: (message: string, meta?: object) => logger.info(message, meta),
  warn: (message: string, meta?: object) => logger.warn(message, meta),
  error: (message: string, meta?: object) => logger.error(message, meta),
  debug: (message: string, meta?: object) => logger.debug(message, meta),

  // Security-specific logging
  security: (event: string, meta?: object) => {
    const logData = {
      event,
      category: 'security',
      ...meta,
    };
    logger.warn(`[SECURITY] ${event}`, logData);
    auditLogger.info(event, logData);
  },

  // Audit logging for compliance
  audit: (action: string, userId: string | null, meta?: object) => {
    const logData = {
      action,
      userId,
      category: 'audit',
      ...meta,
    };
    auditLogger.info(action, logData);
  },

  // Blockchain transaction logging
  blockchain: (transaction: string, meta?: object) => {
    const logData = {
      transaction,
      category: 'blockchain',
      ...meta,
    };
    logger.info(`[BLOCKCHAIN] ${transaction}`, logData);
  },

  // Performance metrics logging
  performance: (metric: string, value: number, unit: string, meta?: object) => {
    const logData = {
      metric,
      value,
      unit,
      category: 'performance',
      ...meta,
    };
    logger.info(`[PERFORMANCE] ${metric}: ${value}${unit}`, logData);
  },

  // Request logging middleware format
  request: (req: any, res: any, duration: number) => {
    const logData = {
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      userId: req.user?.id || null,
    };
    logger.info(`${req.method} ${req.originalUrl || req.url}`, logData);
  },
};

export default logger;
