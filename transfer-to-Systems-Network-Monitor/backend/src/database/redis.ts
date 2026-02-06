/**
 * GLX Systems Network Monitoring Platform
 * Redis Connection for Session and State Management
 *
 * Copyright (c) 2025 rsl37
 * Dual-licensed under PolyForm Shield 1.0.0 OR PolyForm Noncommercial 1.0.0
 */

import Redis from 'ioredis';
import { config } from '../config';
import { log } from '../utils/logger';

class RedisClient {
  private client: Redis;
  private static instance: RedisClient;

  private constructor() {
    this.client = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        log.warn(`Redis connection retry attempt ${times}`, { delay });
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    // Event handlers
    this.client.on('connect', () => {
      log.info('Redis client connected', {
        host: config.redis.host,
        port: config.redis.port,
        db: config.redis.db,
      });
    });

    this.client.on('ready', () => {
      log.info('Redis client ready');
    });

    this.client.on('error', (err) => {
      log.error('Redis client error', { error: err.message });
    });

    this.client.on('close', () => {
      log.warn('Redis connection closed');
    });

    this.client.on('reconnecting', () => {
      log.info('Redis client reconnecting');
    });
  }

  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  /**
   * Set a key-value pair with optional TTL
   */
  public async set(
    key: string,
    value: string | object,
    ttlSeconds?: number
  ): Promise<void> {
    try {
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : value;

      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, stringValue);
      } else {
        await this.client.set(key, stringValue);
      }

      log.debug('Redis SET operation', { key, ttl: ttlSeconds });
    } catch (error: any) {
      log.error('Redis SET error', { key, error: error.message });
      throw error;
    }
  }

  /**
   * Get a value by key
   */
  public async get<T = string>(key: string, parseJson = false): Promise<T | null> {
    try {
      const value = await this.client.get(key);

      if (value === null) {
        return null;
      }

      if (parseJson) {
        return JSON.parse(value) as T;
      }

      return value as T;
    } catch (error: any) {
      log.error('Redis GET error', { key, error: error.message });
      throw error;
    }
  }

  /**
   * Delete a key
   */
  public async delete(key: string): Promise<void> {
    try {
      await this.client.del(key);
      log.debug('Redis DEL operation', { key });
    } catch (error: any) {
      log.error('Redis DEL error', { key, error: error.message });
      throw error;
    }
  }

  /**
   * Check if a key exists
   */
  public async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error: any) {
      log.error('Redis EXISTS error', { key, error: error.message });
      throw error;
    }
  }

  /**
   * Set expiration on a key
   */
  public async expire(key: string, ttlSeconds: number): Promise<void> {
    try {
      await this.client.expire(key, ttlSeconds);
      log.debug('Redis EXPIRE operation', { key, ttl: ttlSeconds });
    } catch (error: any) {
      log.error('Redis EXPIRE error', { key, error: error.message });
      throw error;
    }
  }

  /**
   * Get TTL for a key
   */
  public async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error: any) {
      log.error('Redis TTL error', { key, error: error.message });
      throw error;
    }
  }

  /**
   * Increment a value
   */
  public async increment(key: string, amount = 1): Promise<number> {
    try {
      return await this.client.incrby(key, amount);
    } catch (error: any) {
      log.error('Redis INCR error', { key, error: error.message });
      throw error;
    }
  }

  /**
   * Add to a set
   */
  public async sadd(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.client.sadd(key, ...members);
    } catch (error: any) {
      log.error('Redis SADD error', { key, error: error.message });
      throw error;
    }
  }

  /**
   * Get all members of a set
   */
  public async smembers(key: string): Promise<string[]> {
    try {
      return await this.client.smembers(key);
    } catch (error: any) {
      log.error('Redis SMEMBERS error', { key, error: error.message });
      throw error;
    }
  }

  /**
   * Remove from a set
   */
  public async srem(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.client.srem(key, ...members);
    } catch (error: any) {
      log.error('Redis SREM error', { key, error: error.message });
      throw error;
    }
  }

  /**
   * Hash set
   */
  public async hset(key: string, field: string, value: string | object): Promise<void> {
    try {
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : value;
      await this.client.hset(key, field, stringValue);
    } catch (error: any) {
      log.error('Redis HSET error', { key, field, error: error.message });
      throw error;
    }
  }

  /**
   * Hash get
   */
  public async hget<T = string>(
    key: string,
    field: string,
    parseJson = false
  ): Promise<T | null> {
    try {
      const value = await this.client.hget(key, field);

      if (value === null) {
        return null;
      }

      if (parseJson) {
        return JSON.parse(value) as T;
      }

      return value as T;
    } catch (error: any) {
      log.error('Redis HGET error', { key, field, error: error.message });
      throw error;
    }
  }

  /**
   * Get all hash fields and values
   */
  public async hgetall(key: string): Promise<Record<string, string>> {
    try {
      return await this.client.hgetall(key);
    } catch (error: any) {
      log.error('Redis HGETALL error', { key, error: error.message });
      throw error;
    }
  }

  /**
   * Test Redis connection
   */
  public async testConnection(): Promise<boolean> {
    try {
      const pong = await this.client.ping();
      log.info('Redis connection test successful', { response: pong });
      return pong === 'PONG';
    } catch (error: any) {
      log.error('Redis connection test failed', { error: error.message });
      return false;
    }
  }

  /**
   * Flush all keys in current database (USE WITH CAUTION)
   */
  public async flushdb(): Promise<void> {
    if (config.app.env === 'production') {
      throw new Error('FLUSHDB is disabled in production');
    }
    try {
      await this.client.flushdb();
      log.warn('Redis database flushed');
    } catch (error: any) {
      log.error('Redis FLUSHDB error', { error: error.message });
      throw error;
    }
  }

  /**
   * Close Redis connection
   */
  public async close(): Promise<void> {
    try {
      await this.client.quit();
      log.info('Redis connection closed');
    } catch (error: any) {
      log.error('Error closing Redis connection', { error: error.message });
      throw error;
    }
  }

  /**
   * Get raw Redis client for advanced operations
   */
  public getClient(): Redis {
    return this.client;
  }
}

// Export singleton instance
export const redis = RedisClient.getInstance();
export default redis;
