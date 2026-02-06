/**
 * GLX Systems Network Monitoring Platform
 * PostgreSQL Database Connection Pool
 *
 * Copyright (c) 2025 rsl37
 * Dual-licensed under PolyForm Shield 1.0.0 OR PolyForm Noncommercial 1.0.0
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import { config } from '../config';
import { log } from '../utils/logger';

class Database {
  private pool: Pool;
  private static instance: Database;

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
      connectionTimeoutMillis: 2000,
    });

    // Pool error handling
    this.pool.on('error', (err) => {
      log.error('Unexpected database pool error', { error: err.message, stack: err.stack });
    });

    // Pool connection event
    this.pool.on('connect', () => {
      log.debug('New database client connected to pool');
    });

    // Pool acquisition event
    this.pool.on('acquire', () => {
      log.debug('Database client acquired from pool');
    });

    // Pool removal event
    this.pool.on('remove', () => {
      log.debug('Database client removed from pool');
    });

    log.info('Database connection pool initialized', {
      host: config.database.host,
      database: config.database.name,
      poolMin: config.database.pool.min,
      poolMax: config.database.pool.max,
    });
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  /**
   * Execute a query with automatic connection management
   */
  public async query<T = any>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
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
        params,
      });
      throw error;
    }
  }

  /**
   * Get a client from the pool for transaction management
   */
  public async getClient(): Promise<PoolClient> {
    try {
      const client = await this.pool.connect();
      log.debug('Database client acquired');
      return client;
    } catch (error: any) {
      log.error('Failed to acquire database client', { error: error.message });
      throw error;
    }
  }

  /**
   * Execute a transaction with automatic rollback on error
   */
  public async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
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
      client.release();
      log.debug('Database client released');
    }
  }

  /**
   * Test database connection
   */
  public async testConnection(): Promise<boolean> {
    try {
      const result = await this.query('SELECT NOW() as now, version() as version');
      log.info('Database connection test successful', {
        timestamp: result.rows[0].now,
        version: result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1],
      });
      return true;
    } catch (error: any) {
      log.error('Database connection test failed', { error: error.message });
      return false;
    }
  }

  /**
   * Get pool status
   */
  public getPoolStatus(): {
    total: number;
    idle: number;
    waiting: number;
  } {
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
    };
  }

  /**
   * Gracefully close the database pool
   */
  public async close(): Promise<void> {
    try {
      await this.pool.end();
      log.info('Database connection pool closed');
    } catch (error: any) {
      log.error('Error closing database pool', { error: error.message });
      throw error;
    }
  }
}

// Export singleton instance
export const db = Database.getInstance();
export default db;
