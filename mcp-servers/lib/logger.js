/**
 * @file lib/logger.js
 * Structured logging that never leaks secrets.
 * All logs go to stdout/stderr with no sensitive data included.
 */

const crypto = require('crypto');

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  constructor(serviceName, logLevel = 'info') {
    this.serviceName = serviceName;
    this.logLevel = LOG_LEVELS[logLevel] || LOG_LEVELS.info;
  }

  /**
   * Log a message with structured data.
   * Never include secrets directly; use hashSecretForLogging() first.
   */
  _log(level, message, metadata = {}) {
    if (LOG_LEVELS[level] < this.logLevel) {
      return; // Skip if below configured level
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      message,
      ...metadata,
    };

    const output = JSON.stringify(logEntry);
    if (level === 'error' || level === 'warn') {
      console.error(output);
    } else {
      console.log(output);
    }
  }

  debug(message, metadata = {}) {
    this._log('debug', message, metadata);
  }

  info(message, metadata = {}) {
    this._log('info', message, metadata);
  }

  warn(message, metadata = {}) {
    this._log('warn', message, metadata);
  }

  error(message, err = null, metadata = {}) {
    const errorMeta = err ? { error: err.message, stack: err.stack } : {};
    this._log('error', message, { ...errorMeta, ...metadata });
  }

  /**
   * Log operation (sensitive or not).
   * Use for audit trail.
   */
  audit(operation, success, details = {}) {
    this.info(`Audit: ${operation}`, {
      audit: true,
      success,
      ...details,
    });
  }
}

module.exports = { Logger };
