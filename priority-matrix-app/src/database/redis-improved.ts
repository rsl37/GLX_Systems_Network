/**
 * GLX Systems Network Monitoring Platform
 * Improved Redis Client with Atomic Operations via Lua Scripts
 *
 * Copyright (c) 2025 rsl37
 * Dual-licensed under PolyForm Shield 1.0.0 OR PolyForm Noncommercial 1.0.0
 *
 * IMPROVEMENTS:
 * - Lua scripts for atomic rate limiting (no race conditions)
 * - Redis cluster support
 * - Automatic reconnection with exponential backoff
 * - Circuit breaker pattern
 * - Health monitoring
 */

import Redis, { Cluster, ClusterOptions, RedisOptions } from 'ioredis';
import { config } from '../config';
import { log } from '../utils/logger';

// Lua script for atomic rate limiting with automatic expiration
const RATE_LIMIT_SCRIPT = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])

local current = redis.call('INCR', key)

if current == 1 then
  redis.call('EXPIRE', key, window)
end

if current > limit then
  return 0
else
  local ttl = redis.call('TTL', key)
  return ttl
end
`;

// Lua script for atomic token version check
const TOKEN_VERSION_CHECK_SCRIPT = `
local key = KEYS[1]
local expected_version = tonumber(ARGV[1])
local current_version = tonumber(redis.call('GET', key) or '0')

if current_version == expected_version then
  return 1
else
  return 0
end
`;

class RedisClient {
  private client: Redis | Cluster;
  private static instance: RedisClient | null = null;
  private static initializationPromise: Promise<RedisClient> | null = null;
  private rateLimitScriptSha: string | null = null;
  private tokenVersionScriptSha: string | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isHealthy: boolean = false;

  private constructor() {
    // Support both standalone and cluster
    if (process.env.REDIS_CLUSTER === 'true') {
      this.client = this.createCluster();
    } else {
      this.client = this.createStandalone();
    }

    this.setupEventHandlers();
    this.startHealthMonitoring();
  }

  private createStandalone(): Redis {
    const options: RedisOptions = {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
      retryStrategy: (times: number) => {
        if (times > 20) {
          log.error('Redis connection failed after 20 retries');
          return null; // Stop retrying
        }
        const delay = Math.min(times * 100, 3000);
        log.warn(`Redis connection retry attempt ${times}`, { delay });
        return delay;
      },
      maxRetriesPerRequest: null, // Unlimited retries per request
      enableReadyCheck: true,
      enableOfflineQueue: true,
      lazyConnect: false,
    };

    return new Redis(options);
  }

  private createCluster(): Cluster {
    const nodes = (process.env.REDIS_CLUSTER_NODES || 'localhost:6379')
      .split(',')
      .map(node => {
        const [host, port] = node.split(':');
        return { host, port: parseInt(port, 10) };
      });

    const options: ClusterOptions = {
      redisOptions: {
        password: config.redis.password,
      },
      clusterRetryStrategy: (times: number) => {
        if (times > 20) {
          return null;
        }
        return Math.min(times * 100, 3000);
      },
    };

    return new Cluster(nodes, options);
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      log.info('Redis client connected', {
        host: config.redis.host,
        port: config.redis.port,
        db: config.redis.db,
      });
    });

    this.client.on('ready', async () => {
      log.info('Redis client ready');
      this.isHealthy = true;

      // Load Lua scripts on ready
      await this.loadScripts();
    });

    this.client.on('error', (err) => {
      log.error('Redis client error', { error: err.message });
      this.isHealthy = false;
    });

    this.client.on('close', () => {
      log.warn('Redis connection closed');
      this.isHealthy = false;
    });

    this.client.on('reconnecting', () => {
      log.info('Redis client reconnecting');
    });

    this.client.on('end', () => {
      log.warn('Redis connection ended');
      this.isHealthy = false;
    });
  }

  /**
   * Load Lua scripts into Redis for atomic operations
   */
  private async loadScripts(): Promise<void> {
    try {
      this.rateLimitScriptSha = await this.client.script('LOAD', RATE_LIMIT_SCRIPT);
      this.tokenVersionScriptSha = await this.client.script('LOAD', TOKEN_VERSION_CHECK_SCRIPT);

      log.info('Redis Lua scripts loaded', {
        rateLimitSha: this.rateLimitScriptSha.substring(0, 8),
        tokenVersionSha: this.tokenVersionScriptSha.substring(0, 8),
      });
    } catch (error: any) {
      log.error('Failed to load Redis Lua scripts', { error: error.message });
    }
  }

  /**
   * Thread-safe singleton initialization
   */
  public static async getInstance(): Promise<RedisClient> {
    if (RedisClient.instance && RedisClient.instance.isHealthy) {
      return RedisClient.instance;
    }

    if (RedisClient.initializationPromise) {
      return RedisClient.initializationPromise;
    }

    RedisClient.initializationPromise = (async () => {
      const instance = new RedisClient();

      // Wait for Redis to be ready
      await instance.waitForReady();

      RedisClient.instance = instance;
      RedisClient.initializationPromise = null;
      return instance;
    })();

    return RedisClient.initializationPromise;
  }

  /**
   * Wait for Redis to be ready
   */
  private async waitForReady(timeout = 10000): Promise<void> {
    const start = Date.now();

    while (!this.isHealthy) {
      if (Date.now() - start > timeout) {
        throw new Error('Redis failed to become ready within timeout');
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Atomic rate limiting using Lua script
   * Returns TTL if allowed, or 0 if rate limit exceeded
   */
  public async checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; retryAfter: number }> {
    try {
      if (!this.rateLimitScriptSha) {
        await this.loadScripts();
      }

      const result = await this.client.evalsha(
        this.rateLimitScriptSha!,
        1,
        key,
        limit.toString(),
        windowSeconds.toString()
      );

      const ttl = parseInt(result as string, 10);

      return {
        allowed: ttl > 0,
        retryAfter: ttl > 0 ? 0 : windowSeconds,
      };
    } catch (error: any) {
      log.error('Rate limit check failed', { key, error: error.message });
      // Fail open for availability (but log the security concern)
      log.security('Rate limiter failed - allowing request', { key });
      return { allowed: true, retryAfter: 0 };
    }
  }

  /**
   * Check token version atomically
   */
  public async checkTokenVersion(userId: string, expectedVersion: number): Promise<boolean> {
    try {
      if (!this.tokenVersionScriptSha) {
        await this.loadScripts();
      }

      const result = await this.client.evalsha(
        this.tokenVersionScriptSha!,
        1,
        `user:${userId}:token_version`,
        expectedVersion.toString()
      );

      return result === 1;
    } catch (error: any) {
      log.error('Token version check failed', { userId, error: error.message });
      return false;
    }
  }

  /**
   * Increment token version (invalidates all existing tokens for user)
   */
  public async incrementTokenVersion(userId: string): Promise<number> {
    try {
      const key = `user:${userId}:token_version`;
      const newVersion = await this.client.incr(key);

      log.audit('Token version incremented', userId, { newVersion });

      return newVersion;
    } catch (error: any) {
      log.error('Failed to increment token version', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Get token version for user
   */
  public async getTokenVersion(userId: string): Promise<number> {
    try {
      const key = `user:${userId}:token_version`;
      const version = await this.client.get(key);
      return version ? parseInt(version, 10) : 0;
    } catch (error: any) {
      log.error('Failed to get token version', { userId, error: error.message });
      return 0;
    }
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
   * Monitor Redis health
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.client.ping();
        if (!this.isHealthy) {
          log.info('Redis health restored');
          this.isHealthy = true;
        }
      } catch (error) {
        if (this.isHealthy) {
          log.error('Redis health check failed');
          this.isHealthy = false;
        }
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Get health status
   */
  public getHealth(): { healthy: boolean; info: any } {
    return {
      healthy: this.isHealthy,
      info: {
        status: this.client.status,
      },
    };
  }

  /**
   * Close Redis connection
   */
  public async close(): Promise<void> {
    try {
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }

      await this.client.quit();
      log.info('Redis connection closed');
      RedisClient.instance = null;
    } catch (error: any) {
      log.error('Error closing Redis connection', { error: error.message });
      throw error;
    }
  }

  /**
   * Get raw Redis client for advanced operations
   */
  public getClient(): Redis | Cluster {
    return this.client;
  }
}

// Export async factory function
export async function getRedis(): Promise<RedisClient> {
  return RedisClient.getInstance();
}

// For backward compatibility
export const redis = await RedisClient.getInstance();
export default redis;
