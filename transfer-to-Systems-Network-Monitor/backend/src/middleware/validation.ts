/**
 * GLX Systems Network Monitoring Platform
 * Input Validation and Sanitization Middleware
 *
 * Copyright (c) 2025 rsl37
 * Dual-licensed under PolyForm Shield 1.0.0 OR PolyForm Noncommercial 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { log } from '../utils/logger';

/**
 * Middleware to check validation results and return errors
 */
export function validateRequest(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map(err => ({
      field: err.type === 'field' ? err.path : 'unknown',
      message: err.msg,
    }));

    log.warn('Validation failed', {
      url: req.originalUrl,
      errors: errorDetails,
      ip: req.ip,
    });

    res.status(400).json({
      error: 'Validation failed',
      details: errorDetails,
    });
    return;
  }

  next();
}

/**
 * Wrapper to run validation chains
 */
export function validate(validations: ValidationChain[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Run all validations
    for (const validation of validations) {
      const result = await validation.run(req);
      if (!result.isEmpty()) {
        break;
      }
    }

    // Check for errors
    validateRequest(req, res, next);
  };
}

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
    .substring(0, 10000); // Limit length
}

/**
 * Validate and sanitize JSON input
 */
export function sanitizeJSON(input: any): any {
  if (typeof input !== 'object' || input === null) {
    return {};
  }

  // Convert to JSON string and parse to remove functions and prototype pollution
  try {
    const jsonString = JSON.stringify(input);
    const parsed = JSON.parse(jsonString);

    // Remove __proto__ and constructor properties
    delete parsed.__proto__;
    delete parsed.constructor;

    return parsed;
  } catch {
    return {};
  }
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

/**
 * Validate phone number format (basic)
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/[\s\-()]/g, ''));
}

/**
 * Validate URL format
 */
export function isValidURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Check for SQL injection patterns
 */
export function containsSQLInjection(input: string): boolean {
  const sqlPatterns = [
    /(\bor\b|\band\b).*?=.*?=/i,
    /union.*select/i,
    /insert.*into/i,
    /delete.*from/i,
    /drop.*table/i,
    /update.*set/i,
    /exec(\s|\+)+(s|x)p\w+/i,
    /';|'--/i,
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Check for command injection patterns
 */
export function containsCommandInjection(input: string): boolean {
  const cmdPatterns = [
    /[;&|`$()]/,
    /\.\.\//,
    /~\//,
    /\/etc\/passwd/i,
    /\/bin\/(bash|sh)/i,
  ];

  return cmdPatterns.some(pattern => pattern.test(input));
}

/**
 * Middleware to detect and block common attack patterns
 */
export function securityScan(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // Check all string inputs for attacks
    const checkObject = (obj: any, path: string = ''): boolean => {
      if (typeof obj === 'string') {
        if (containsSQLInjection(obj)) {
          log.security('SQL injection attempt detected', {
            path,
            value: obj.substring(0, 100),
            ip: req.ip,
            url: req.originalUrl,
          });
          return true;
        }

        if (containsCommandInjection(obj)) {
          log.security('Command injection attempt detected', {
            path,
            value: obj.substring(0, 100),
            ip: req.ip,
            url: req.originalUrl,
          });
          return true;
        }
      } else if (typeof obj === 'object' && obj !== null) {
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            if (checkObject(obj[key], `${path}.${key}`)) {
              return true;
            }
          }
        }
      }

      return false;
    };

    // Scan request body, query, and params
    const hasAttack =
      checkObject(req.body, 'body') ||
      checkObject(req.query, 'query') ||
      checkObject(req.params, 'params');

    if (hasAttack) {
      res.status(400).json({
        error: 'Invalid input detected',
        message: 'Your request contains potentially malicious content',
      });
      return;
    }

    next();
  } catch (error: any) {
    log.error('Security scan error', { error: error.message });
    // Fail securely - block request on error
    res.status(500).json({ error: 'Security check failed' });
  }
}

/**
 * Limit request body size
 */
export function limitBodySize(maxSizeBytes: number = 1024 * 1024) {
  return (req: Request, res: Response, next: NextFunction): void => {
    let size = 0;

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxSizeBytes) {
        log.security('Request body size limit exceeded', {
          size,
          maxSize: maxSizeBytes,
          ip: req.ip,
          url: req.originalUrl,
        });

        res.status(413).json({
          error: 'Payload too large',
          maxSize: `${maxSizeBytes / 1024 / 1024}MB`,
        });

        req.connection.destroy();
      }
    });

    next();
  };
}
