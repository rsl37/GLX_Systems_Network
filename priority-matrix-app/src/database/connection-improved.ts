/**
 * GLX Systems Network Monitoring Platform
 * Improved PostgreSQL Database Connection with Circuit Breaker
 *
 * Copyright (c) 2025 rsl37
 * Dual-licensed under PolyForm Shield 1.0.0 OR PolyForm Noncommercial 1.0.0
 *
 * IMPROVEMENTS:
 * - Increased connection timeout to 10 seconds
 * - Circuit breaker pattern to prevent cascade failures
 * - Connection pool monitoring and alerts
 * - Prepared statement support
 * - Automatic retry with exponential backoff
 */

import { Pool, PoolClient, QueryResult, QueryConfig } from 'pg';
import { config } from '../config';
import { log } from '../utils/logger';

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private readonly threshold: number = 5;
  private readonly timeout: number = 60000; // 60 seconds
  private readonly halfOpenSuccessThreshold: number = 3;

  public async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
        log.info('Circuit breaker entering HALF_OPEN state');
      } else {
        throw new Error('Circuit breaker is OPEN - database unavailable');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.halfOpenSuccessThreshold) {
        this.state = CircuitState.CLOSED;
        log.info('Circuit breaker closed - database recovered');
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.threshold) {
      this.state = CircuitState.OPEN;
      log.error('Circuit breaker opened - too many database failures', {
        failureCount: this.failureCount,
      });
    }
  }

  public getState(): CircuitState {
    return this.state;
  }
}

class Database {
  private pool: Pool;
  private circuitBreaker: CircuitBreaker;
  private preparedStatements: Map<string, boolean> = new Map();
  private static instance: Database | null = null;
  private static initializationPromise: Promise<Database> | null = null;
  private static initializationLock: boolean = false;

  private constructor() {
    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
      min: config.database.pool.min,
      max: config.database.pool.max,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000, // Increased from 2s to 10s
      statement_timeout: 30000, // 30 second query timeout
      query_timeout: 30000,
    });

    this.circuitBreaker = new CircuitBreaker();

    // Pool error handling
    this.pool.on('error', (err) => {
      log.error('Unexpected database pool error', { error: err.message, stack: err.stack });
    });

    this.pool.on('connect', () => {
      log.debug('New database client connected to pool');
    });

    this.pool.on('acquire', () => {
      log.debug('Database client acquired from pool');
    });

    this.pool.on('remove', () => {
      log.debug('Database client removed from pool');
    });

    // Monitor pool health
    this.startPoolMonitoring();

    log.info('Database connection pool initialized', {
      host: config.database.host,
      database: config.database.name,
      poolMin: config.database.pool.min,
      poolMax: config.database.pool.max,
    });
  }

  /**
   * Thread-safe singleton initialization
   */
  public static async getInstance(): Promise<Database> {
    // Fast path - already initialized
    if (Database.instance) {
      return Database.instance;
    }

    // Wait for ongoing initialization
    if (Database.initializationPromise) {
      return Database.initializationPromise;
    }

    // Prevent concurrent initialization
    if (Database.initializationLock) {
      // Wait a bit and retry
      await new Promise(resolve => setTimeout(resolve, 100));
      return Database.getInstance();
    }

    // Start initialization
    Database.initializationLock = true;
    Database.initializationPromise = (async () => {
      try {
        const instance = new Database();

        // Test connection
        await instance.testConnection();

        Database.instance = instance;
        return instance;
      } finally {
        Database.initializationLock = false;
        Database.initializationPromise = null;
      }
    })();

    return Database.initializationPromise;
  }

  /**
   * Execute a query with circuit breaker protection
   */
  public async query<T = any>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    return this.circuitBreaker.execute(async () => {
      const start = Date.now();
      try {
        const result = await this.pool.query<T>(text, params);
        const duration = Date.now() - start;

        log.debug('Database query executed', {
          duration,
          rows: result.rowCount,
          command: result.command,
        });

        if (duration > 1000) {
          log.warn('Slow query detected', {
            duration,
            query: text.substring(0, 100),
          });
        }

        return result;
      } catch (error: any) {
        log.error('Database query error', {
          error: error.message,
          query: text.substring(0, 100),
          params: params?.map(p => typeof p === 'string' && p.length > 50 ? p.substring(0, 50) + '...' : p),
        });
        throw error;
      }
    });
  }

  /**
   * Execute a prepared statement (prevents SQL injection and improves performance)
   */
  public async queryPrepared<T = any>(
    name: string,
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    return this.circuitBreaker.execute(async () => {
      const start = Date.now();

      try {
        // Prepare statement if not already prepared
        if (!this.preparedStatements.has(name)) {
          await this.pool.query({ name, text });
          this.preparedStatements.set(name, true);
          log.debug('Prepared statement created', { name });
        }

        // Execute prepared statement
        const result = await this.pool.query<T>({ name, values: params });
        const duration = Date.now() - start;

        log.debug('Prepared statement executed', {
          name,
          duration,
          rows: result.rowCount,
        });

        return result;
      } catch (error: any) {
        log.error('Prepared statement error', {
          name,
          error: error.message,
        });
        throw error;
      }
    });
  }

  /**
   * Get a client from the pool for transaction management
   */
  public async getClient(): Promise<PoolClient> {
    return this.circuitBreaker.execute(async () => {
      try {
        const client = await this.pool.connect();
        log.debug('Database client acquired');

        // Track if client is in transaction
        (client as any).__inTransaction = false;

        return client;
      } catch (error: any) {
        log.error('Failed to acquire database client', { error: error.message });
        throw error;
      }
    });
  }

  /**
   * Execute a transaction with automatic rollback on error
   * Prevents nested transactions
   */
  public async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.getClient();

    // Check if already in transaction
    if ((client as any).__inTransaction) {
      throw new Error('Nested transactions are not supported');
    }

    try {
      await client.query('BEGIN');
      (client as any).__inTransaction = true;
      log.debug('Transaction started');

      const result = await callback(client);

      await client.query('COMMIT');
      log.debug('Transaction committed');

      return result;
    } catch (error: any) {
      await client.query('ROLLBACK');
      log.warn('Transaction rolled back', { error: error.message });
      throw error;
    } finally {
      (client as any).__inTransaction = false;
      client.release();
      log.debug('Database client released');
    }
  }

  /**
   * Test database connection with retry
   */
  public async testConnection(retries = 3): Promise<boolean> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await this.pool.query('SELECT NOW() as now, version() as version');
        log.info('Database connection test successful', {
          timestamp: result.rows[0].now,
          version: result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1],
        });
        return true;
      } catch (error: any) {
        log.error(`Database connection test failed (attempt ${attempt}/${retries})`, {
          error: error.message,
        });

        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    return false;
  }

  /**
   * Get pool status for monitoring
   */
  public getPoolStatus(): {
    total: number;
    idle: number;
    waiting: number;
    circuitState: CircuitState;
  } {
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
      circuitState: this.circuitBreaker.getState(),
    };
  }

  /**
   * Monitor pool health and alert on issues
   */
  private startPoolMonitoring(): void {
    setInterval(() => {
      const status = this.getPoolStatus();

      // Alert if pool is exhausted
      if (status.waiting > 5) {
        log.warn('Database connection pool under pressure', {
          waiting: status.waiting,
          idle: status.idle,
          total: status.total,
        });
      }

      // Alert if circuit is open
      if (status.circuitState !== CircuitState.CLOSED) {
        log.warn('Database circuit breaker not closed', {
          state: status.circuitState,
        });
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Gracefully close the database pool
   */
  public async close(): Promise<void> {
    try {
      await this.pool.end();
      log.info('Database connection pool closed');
      Database.instance = null;
    } catch (error: any) {
      log.error('Error closing database pool', { error: error.message });
      throw error;
    }
  }
}

// Export async factory function
export async function getDatabase(): Promise<Database> {
  return Database.getInstance();
}

// For backward compatibility, export a promise that resolves to the instance
export const db = await Database.getInstance();
export default db;
