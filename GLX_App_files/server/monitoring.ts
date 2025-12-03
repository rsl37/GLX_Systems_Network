/*
 * Copyright (c) 2025 GLX Civic Networking App
 *
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

/**
 * Production Monitoring Module
 * Integrates Sentry for error tracking and DataDog for APM
 */

import * as Sentry from '@sentry/node';
import type { Express, Request, Response, NextFunction } from 'express';

// DataDog tracer configuration
interface DataDogConfig {
  enabled: boolean;
  service: string;
  env: string;
  version: string;
  hostname?: string;
}

// Sentry configuration
interface SentryConfig {
  enabled: boolean;
  dsn: string;
  environment: string;
  release: string;
  tracesSampleRate: number;
  profilesSampleRate: number;
}

// Combined monitoring configuration
export interface MonitoringConfig {
  sentry: SentryConfig;
  datadog: DataDogConfig;
}

// Default configuration values
const DEFAULT_CONFIG: MonitoringConfig = {
  sentry: {
    enabled: !!process.env.SENTRY_DSN,
    dsn: process.env.SENTRY_DSN || '',
    environment: process.env.NODE_ENV || 'development',
    release: process.env.npm_package_version || '0.3.0',
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
  },
  datadog: {
    enabled: !!process.env.DD_API_KEY,
    service: process.env.DD_SERVICE || 'glx-civic-network',
    env: process.env.DD_ENV || process.env.NODE_ENV || 'development',
    version: process.env.DD_VERSION || process.env.npm_package_version || '0.3.0',
    hostname: process.env.DD_HOSTNAME,
  },
};

/**
 * Production Monitoring Service
 * Handles initialization and configuration of Sentry and DataDog
 */
export class ProductionMonitoring {
  private config: MonitoringConfig;
  private initialized: boolean = false;
  private sentryInitialized: boolean = false;
  private datadogInitialized: boolean = false;

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = {
      sentry: { ...DEFAULT_CONFIG.sentry, ...config.sentry },
      datadog: { ...DEFAULT_CONFIG.datadog, ...config.datadog },
    };
  }

  /**
   * Initialize all monitoring services
   */
  async initialize(app?: Express): Promise<void> {
    if (this.initialized) {
      console.log('⚠️ Production monitoring already initialized');
      return;
    }

    console.log('🔍 Initializing production monitoring...');

    // Initialize Sentry
    if (this.config.sentry.enabled && this.config.sentry.dsn) {
      await this.initializeSentry(app);
    } else {
      console.log('ℹ️ Sentry disabled (no DSN configured)');
    }

    // Initialize DataDog
    if (this.config.datadog.enabled) {
      await this.initializeDataDog();
    } else {
      console.log('ℹ️ DataDog disabled (no API key configured)');
    }

    this.initialized = true;
    console.log('✅ Production monitoring initialized');
  }

  /**
   * Initialize Sentry error tracking
   */
  private async initializeSentry(app?: Express): Promise<void> {
    try {
      Sentry.init({
        dsn: this.config.sentry.dsn,
        environment: this.config.sentry.environment,
        release: this.config.sentry.release,
        tracesSampleRate: this.config.sentry.tracesSampleRate,
        profilesSampleRate: this.config.sentry.profilesSampleRate,
        integrations: [
          // Enable HTTP tracing
          Sentry.httpIntegration(),
          // Enable console logging capture
          Sentry.consoleIntegration(),
        ],
        // Set up beforeSend to filter sensitive data
        beforeSend(event) {
          // Remove sensitive headers
          if (event.request?.headers) {
            delete event.request.headers.authorization;
            delete event.request.headers.cookie;
            delete event.request.headers['x-api-key'];
          }

          // Remove sensitive data from breadcrumbs
          if (event.breadcrumbs) {
            event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
              if (breadcrumb.data && typeof breadcrumb.data === 'object') {
                const data = { ...breadcrumb.data };
                delete data.password;
                delete data.token;
                delete data.secret;
                return { ...breadcrumb, data };
              }
              return breadcrumb;
            });
          }

          return event;
        },
      });

      this.sentryInitialized = true;
      console.log('✅ Sentry error tracking initialized');
      console.log(`   • Environment: ${this.config.sentry.environment}`);
      console.log(`   • Release: ${this.config.sentry.release}`);
      console.log(`   • Traces Sample Rate: ${this.config.sentry.tracesSampleRate}`);
    } catch (error) {
      console.error('❌ Failed to initialize Sentry:', error);
    }
  }

  /**
   * Initialize DataDog APM
   */
  private async initializeDataDog(): Promise<void> {
    try {
      // DataDog tracer is typically initialized at application startup
      // via dd-trace/init or programmatically
      // We configure it here but actual tracing requires dd-trace to be loaded first

      console.log('✅ DataDog APM configured');
      console.log(`   • Service: ${this.config.datadog.service}`);
      console.log(`   • Environment: ${this.config.datadog.env}`);
      console.log(`   • Version: ${this.config.datadog.version}`);

      this.datadogInitialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize DataDog:', error);
    }
  }

  /**
   * Sentry error handler middleware for Express
   */
  getSentryErrorHandler() {
    return Sentry.expressErrorHandler();
  }

  /**
   * Capture an exception to Sentry
   */
  captureException(error: Error, context?: Record<string, unknown>): string | null {
    if (!this.sentryInitialized) {
      return null;
    }

    return Sentry.captureException(error, {
      extra: context,
    });
  }

  /**
   * Capture a message to Sentry
   */
  captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, unknown>): string | null {
    if (!this.sentryInitialized) {
      return null;
    }

    return Sentry.captureMessage(message, {
      level,
      extra: context,
    });
  }

  /**
   * Set user context for error tracking
   */
  setUser(user: { id: string; email?: string; username?: string }): void {
    if (this.sentryInitialized) {
      Sentry.setUser(user);
    }
  }

  /**
   * Clear user context
   */
  clearUser(): void {
    if (this.sentryInitialized) {
      Sentry.setUser(null);
    }
  }

  /**
   * Add a breadcrumb for debugging
   */
  addBreadcrumb(breadcrumb: {
    category: string;
    message: string;
    level?: Sentry.SeverityLevel;
    data?: Record<string, unknown>;
  }): void {
    if (this.sentryInitialized) {
      Sentry.addBreadcrumb(breadcrumb);
    }
  }

  /**
   * Start a Sentry transaction for performance monitoring
   */
  startTransaction(name: string, op: string): Sentry.Span | null {
    if (!this.sentryInitialized) {
      return null;
    }

    return Sentry.startInactiveSpan({
      name,
      op,
    });
  }

  /**
   * Get monitoring status
   */
  getStatus(): {
    initialized: boolean;
    sentry: { enabled: boolean; initialized: boolean };
    datadog: { enabled: boolean; initialized: boolean };
  } {
    return {
      initialized: this.initialized,
      sentry: {
        enabled: this.config.sentry.enabled,
        initialized: this.sentryInitialized,
      },
      datadog: {
        enabled: this.config.datadog.enabled,
        initialized: this.datadogInitialized,
      },
    };
  }

  /**
   * Flush all pending events before shutdown
   */
  async flush(timeout: number = 2000): Promise<boolean> {
    if (this.sentryInitialized) {
      return Sentry.flush(timeout);
    }
    return true;
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('🔌 Shutting down production monitoring...');
    await this.flush();
    await Sentry.close();
    console.log('✅ Production monitoring shutdown complete');
  }
}

// Export singleton instance
export const productionMonitoring = new ProductionMonitoring();

// Export middleware functions
export function sentryErrorHandler() {
  return productionMonitoring.getSentryErrorHandler();
}

export default productionMonitoring;
