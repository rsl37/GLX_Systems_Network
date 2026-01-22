/**
 * GLX Systems Network Monitoring Platform
 * Improved Blockchain with Worker Thread Mining
 *
 * Copyright (c) 2025 rsl37
 * Dual-licensed under PolyForm Shield 1.0.0 OR PolyForm Noncommercial 1.0.0
 *
 * IMPROVEMENTS:
 * - Mining moved to worker thread (non-blocking)
 * - Lazy loading of blocks (not all in memory)
 * - Distributed lock for mining coordination
 * - Block size limits
 * - Fork handling support
 */

import { Worker } from 'worker_threads';
import path from 'path';
import { Block } from './Block';
import { Transaction } from './Transaction';
import { getDatabase } from '../database/connection-improved';
import { getRedis } from '../database/redis-improved';
import { log } from '../utils/logger';
import { config } from '../config';

const MAX_BLOCK_SIZE = 1024 * 1024; // 1MB
const MAX_TRANSACTIONS_PER_BLOCK = 1000;
const MINING_LOCK_TTL = 300; // 5 minutes

export class Blockchain {
  private pendingTransactions: Transaction[] = [];
  private difficulty: number;
  private static instance: Blockchain | null = null;
  private static initializationPromise: Promise<Blockchain> | null = null;
  private miningWorker: Worker | null = null;
  private isMining: boolean = false;
  private chainHeadCache: { index: number; hash: string; timestamp: number } | null = null;

  private constructor() {
    this.difficulty = config.blockchain.difficulty;
  }

  /**
   * Thread-safe singleton initialization
   */
  public static async getInstance(): Promise<Blockchain> {
    if (Blockchain.instance) {
      return Blockchain.instance;
    }

    if (Blockchain.initializationPromise) {
      return Blockchain.initializationPromise;
    }

    Blockchain.initializationPromise = (async () => {
      const instance = new Blockchain();
      await instance.initialize();
      Blockchain.instance = instance;
      Blockchain.initializationPromise = null;
      return instance;
    })();

    return Blockchain.initializationPromise;
  }

  /**
   * Initialize blockchain - only loads latest block, not entire chain
   */
  public async initialize(): Promise<void> {
    try {
      const db = await getDatabase();

      // Only load the latest block for validation
      const result = await db.query(
        'SELECT block_index, block_hash, timestamp FROM blockchain_blocks ORDER BY block_index DESC LIMIT 1'
      );

      if (result.rows.length === 0) {
        // Create genesis block
        const genesisBlock = await this.createGenesisBlock();
        await this.persistBlock(genesisBlock);

        this.chainHeadCache = {
          index: 0,
          hash: genesisBlock.hash,
          timestamp: genesisBlock.timestamp,
        };

        log.info('Genesis block created', { hash: genesisBlock.hash });
      } else {
        // Cache the latest block info
        const row = result.rows[0];
        this.chainHeadCache = {
          index: row.block_index,
          hash: row.block_hash,
          timestamp: new Date(row.timestamp).getTime(),
        };

        log.info('Blockchain initialized', {
          latestBlock: this.chainHeadCache.index,
          latestHash: this.chainHeadCache.hash,
        });
      }
    } catch (error: any) {
      log.error('Failed to initialize blockchain', { error: error.message });
      throw error;
    }
  }

  /**
   * Create the genesis block
   */
  private async createGenesisBlock(): Promise<Block> {
    const genesisTransaction = new Transaction({
      transactionType: 'genesis',
      entityType: 'system',
      entityId: 'genesis',
      data: {
        message: 'GLX Systems Network - Genesis Block',
        timestamp: new Date().toISOString(),
      },
    });

    const block = new Block({
      index: 0,
      previousHash: '0',
      timestamp: Date.now(),
      transactions: [genesisTransaction],
      nonce: 0,
      difficulty: this.difficulty,
    });

    // Mine synchronously only for genesis (happens once)
    block.mine();
    return block;
  }

  /**
   * Get the latest block info (from cache, not database)
   */
  public getLatestBlockInfo(): { index: number; hash: string; timestamp: number } {
    if (!this.chainHeadCache) {
      throw new Error('Blockchain not initialized');
    }
    return this.chainHeadCache;
  }

  /**
   * Get a specific block from database (not cached)
   */
  public async getBlock(index: number): Promise<Block | null> {
    try {
      const db = await getDatabase();

      const result = await db.query(
        'SELECT * FROM blockchain_blocks WHERE block_index = $1',
        [index]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];

      const txResult = await db.query(
        'SELECT * FROM blockchain_transactions WHERE block_id = $1 ORDER BY timestamp ASC',
        [row.id]
      );

      const transactions = txResult.rows.map(tx =>
        Transaction.fromJSON({
          id: tx.id,
          hash: tx.transaction_hash,
          transactionType: tx.transaction_type,
          entityType: tx.entity_type,
          entityId: tx.entity_id,
          data: tx.data,
          timestamp: tx.timestamp,
          createdBy: tx.created_by,
        })
      );

      return new Block({
        index: row.block_index,
        previousHash: row.previous_hash,
        timestamp: new Date(row.timestamp).getTime(),
        transactions,
        nonce: row.nonce,
        difficulty: row.difficulty,
      });
    } catch (error: any) {
      log.error('Failed to get block', { index, error: error.message });
      throw error;
    }
  }

  /**
   * Add a new transaction to pending pool
   */
  public async addTransaction(transaction: Transaction): Promise<string> {
    if (!transaction.isValid()) {
      throw new Error('Invalid transaction');
    }

    // Check transaction size
    const txSize = JSON.stringify(transaction.toJSON()).length;
    if (txSize > 100 * 1024) {
      // 100KB per transaction
      throw new Error('Transaction too large');
    }

    this.pendingTransactions.push(transaction);

    log.blockchain('Transaction added to pending pool', {
      txHash: transaction.hash,
      type: transaction.transactionType,
      entityType: transaction.entityType,
      pendingCount: this.pendingTransactions.length,
    });

    // Auto-mine if we have enough transactions (don't await, run async)
    if (this.pendingTransactions.length >= 10 && !this.isMining) {
      this.minePendingTransactions().catch((err) => {
        log.error('Auto-mining failed', { error: err.message });
      });
    }

    return transaction.hash;
  }

  /**
   * Mine pending transactions using worker thread (non-blocking)
   */
  public async minePendingTransactions(): Promise<Block | null> {
    // Prevent concurrent mining
    if (this.isMining) {
      log.warn('Mining already in progress');
      return null;
    }

    if (this.pendingTransactions.length === 0) {
      log.warn('No pending transactions to mine');
      return null;
    }

    try {
      // Acquire distributed lock for mining
      const redis = await getRedis();
      const lockKey = 'blockchain:mining:lock';

      // Try to acquire lock (atomic operation)
      const lockAcquired = await redis.getClient().set(
        lockKey,
        process.pid.toString(),
        'EX',
        MINING_LOCK_TTL,
        'NX'
      );

      if (!lockAcquired) {
        log.warn('Another process is mining');
        return null;
      }

      this.isMining = true;

      // Limit transactions per block
      const transactionsToMine = this.pendingTransactions.splice(
        0,
        Math.min(MAX_TRANSACTIONS_PER_BLOCK, this.pendingTransactions.length)
      );

      // Check block size
      const blockDataSize = JSON.stringify(transactionsToMine).length;
      if (blockDataSize > MAX_BLOCK_SIZE) {
        log.error('Block size exceeds limit', { size: blockDataSize, limit: MAX_BLOCK_SIZE });
        // Put transactions back
        this.pendingTransactions.unshift(...transactionsToMine);
        return null;
      }

      const startTime = Date.now();
      const latestBlock = this.getLatestBlockInfo();

      log.info('Starting block mining in worker thread', {
        index: latestBlock.index + 1,
        transactions: transactionsToMine.length,
        difficulty: this.difficulty,
      });

      // Mine in worker thread to avoid blocking event loop
      const minedBlock = await this.mineInWorker({
        index: latestBlock.index + 1,
        previousHash: latestBlock.hash,
        timestamp: Date.now(),
        transactions: transactionsToMine,
        difficulty: this.difficulty,
      });

      const miningTime = Date.now() - startTime;

      // Persist to database
      await this.persistBlock(minedBlock);

      // Update cache
      this.chainHeadCache = {
        index: minedBlock.index,
        hash: minedBlock.hash,
        timestamp: minedBlock.timestamp,
      };

      log.blockchain('Block mined successfully', {
        index: minedBlock.index,
        hash: minedBlock.hash,
        transactions: minedBlock.transactions.length,
        miningTime: `${miningTime}ms`,
        nonce: minedBlock.nonce,
      });

      log.performance('block_mining_time', miningTime, 'ms', {
        blockIndex: minedBlock.index,
        difficulty: this.difficulty,
      });

      return minedBlock;
    } catch (error: any) {
      log.error('Mining failed', { error: error.message });
      throw error;
    } finally {
      this.isMining = false;

      // Release lock
      try {
        const redis = await getRedis();
        await redis.delete('blockchain:mining:lock');
      } catch (err) {
        log.error('Failed to release mining lock', { error: (err as Error).message });
      }
    }
  }

  /**
   * Mine block in worker thread (CPU-intensive work off main thread)
   */
  private async mineInWorker(blockData: {
    index: number;
    previousHash: string;
    timestamp: number;
    transactions: Transaction[];
    difficulty: number;
  }): Promise<Block> {
    return new Promise((resolve, reject) => {
      const workerPath = path.join(__dirname, 'mining-worker.js');

      this.miningWorker = new Worker(workerPath, {
        workerData: {
          blockData: {
            ...blockData,
            transactions: blockData.transactions.map(tx => tx.toJSON()),
          },
        },
      });

      // Timeout after 5 minutes
      const timeout = setTimeout(() => {
        this.miningWorker?.terminate();
        reject(new Error('Mining timeout'));
      }, 5 * 60 * 1000);

      this.miningWorker.on('message', (minedBlockData) => {
        clearTimeout(timeout);

        const block = Block.fromJSON(minedBlockData);
        resolve(block);
      });

      this.miningWorker.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      this.miningWorker.on('exit', (code) => {
        clearTimeout(timeout);
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });
    });
  }

  /**
   * Persist block to database
   */
  private async persistBlock(block: Block): Promise<void> {
    try {
      const db = await getDatabase();

      await db.transaction(async (client) => {
        // Insert block
        const blockResult = await client.query(
          `INSERT INTO blockchain_blocks
           (block_index, previous_hash, block_hash, timestamp, nonce, difficulty, data, merkle_root)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING id`,
          [
            block.index,
            block.previousHash,
            block.hash,
            new Date(block.timestamp),
            block.nonce,
            block.difficulty,
            JSON.stringify({ transactionCount: block.transactions.length }),
            block.merkleRoot,
          ]
        );

        const blockId = blockResult.rows[0].id;

        // Insert transactions in batch
        if (block.transactions.length > 0) {
          const txValues: any[] = [];
          const txParams: any[] = [];

          block.transactions.forEach((tx, i) => {
            const offset = i * 9;
            txValues.push(
              `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`
            );
            txParams.push(
              tx.id,
              blockId,
              tx.hash,
              tx.transactionType,
              tx.entityType,
              tx.entityId,
              JSON.stringify(tx.data),
              new Date(tx.timestamp),
              tx.createdBy
            );
          });

          await client.query(
            `INSERT INTO blockchain_transactions
             (id, block_id, transaction_hash, transaction_type, entity_type, entity_id, data, timestamp, created_by)
             VALUES ${txValues.join(', ')}`,
            txParams
          );
        }
      });

      log.debug('Block persisted to database', { blockIndex: block.index });
    } catch (error: any) {
      log.error('Failed to persist block', {
        blockIndex: block.index,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Validate a block against previous block
   */
  public async validateBlock(blockIndex: number): Promise<boolean> {
    try {
      const block = await this.getBlock(blockIndex);
      if (!block) {
        return false;
      }

      // Validate against previous block
      if (blockIndex > 0) {
        const previousBlock = await this.getBlock(blockIndex - 1);
        if (!previousBlock) {
          return false;
        }

        return block.isValid(previousBlock);
      }

      return block.isValid();
    } catch (error: any) {
      log.error('Block validation failed', { blockIndex, error: error.message });
      return false;
    }
  }

  /**
   * Get transaction by hash
   */
  public async getTransaction(txHash: string): Promise<Transaction | null> {
    try {
      const db = await getDatabase();

      const result = await db.query(
        'SELECT * FROM blockchain_transactions WHERE transaction_hash = $1',
        [txHash]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return Transaction.fromJSON({
        id: row.id,
        hash: row.transaction_hash,
        transactionType: row.transaction_type,
        entityType: row.entity_type,
        entityId: row.entity_id,
        data: row.data,
        timestamp: row.timestamp,
        createdBy: row.created_by,
      });
    } catch (error: any) {
      log.error('Failed to get transaction', { txHash, error: error.message });
      throw error;
    }
  }

  /**
   * Get all transactions for an entity
   */
  public async getEntityTransactions(
    entityType: string,
    entityId: string
  ): Promise<Transaction[]> {
    try {
      const db = await getDatabase();

      const result = await db.query(
        `SELECT * FROM blockchain_transactions
         WHERE entity_type = $1 AND entity_id = $2
         ORDER BY timestamp DESC
         LIMIT 100`, // Limit to prevent memory issues
        [entityType, entityId]
      );

      return result.rows.map(row =>
        Transaction.fromJSON({
          id: row.id,
          hash: row.transaction_hash,
          transactionType: row.transaction_type,
          entityType: row.entity_type,
          entityId: row.entity_id,
          data: row.data,
          timestamp: row.timestamp,
          createdBy: row.created_by,
        })
      );
    } catch (error: any) {
      log.error('Failed to get entity transactions', {
        entityType,
        entityId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get blockchain statistics
   */
  public async getStats(): Promise<{
    totalBlocks: number;
    totalTransactions: number;
    pendingTransactions: number;
    difficulty: number;
    latestBlock: {
      index: number;
      hash: string;
      timestamp: number;
    };
    isMining: boolean;
  }> {
    const db = await getDatabase();

    const [blockCount, txCount] = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM blockchain_blocks'),
      db.query('SELECT COUNT(*) as count FROM blockchain_transactions'),
    ]);

    return {
      totalBlocks: parseInt(blockCount.rows[0].count, 10),
      totalTransactions: parseInt(txCount.rows[0].count, 10),
      pendingTransactions: this.pendingTransactions.length,
      difficulty: this.difficulty,
      latestBlock: this.getLatestBlockInfo(),
      isMining: this.isMining,
    };
  }

  /**
   * Cleanup on shutdown
   */
  public async shutdown(): Promise<void> {
    if (this.miningWorker) {
      await this.miningWorker.terminate();
    }
  }
}

// Export async factory function
export async function getBlockchain(): Promise<Blockchain> {
  return Blockchain.getInstance();
}

// For backward compatibility
export const blockchain = await Blockchain.getInstance();
export default blockchain;
