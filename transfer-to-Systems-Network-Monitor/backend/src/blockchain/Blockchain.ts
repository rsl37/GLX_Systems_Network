/**
 * GLX Systems Network Monitoring Platform
 * Blockchain Service Layer
 *
 * Copyright (c) 2025 rsl37
 * Dual-licensed under PolyForm Shield 1.0.0 OR PolyForm Noncommercial 1.0.0
 */

import { Block } from './Block';
import { Transaction } from './Transaction';
import { db } from '../database/connection';
import { log } from '../utils/logger';
import { config } from '../config';

export class Blockchain {
  private chain: Block[];
  private pendingTransactions: Transaction[];
  private difficulty: number;
  private static instance: Blockchain;

  private constructor() {
    this.chain = [];
    this.pendingTransactions = [];
    this.difficulty = config.blockchain.difficulty;
  }

  public static getInstance(): Blockchain {
    if (!Blockchain.instance) {
      Blockchain.instance = new Blockchain();
    }
    return Blockchain.instance;
  }

  /**
   * Initialize blockchain from database or create genesis block
   */
  public async initialize(): Promise<void> {
    try {
      // Load existing chain from database
      const result = await db.query(
        'SELECT * FROM blockchain_blocks ORDER BY block_index ASC'
      );

      if (result.rows.length === 0) {
        // Create genesis block
        const genesisBlock = this.createGenesisBlock();
        await this.persistBlock(genesisBlock);
        this.chain.push(genesisBlock);
        log.info('Genesis block created', { hash: genesisBlock.hash });
      } else {
        // Load blocks from database
        for (const row of result.rows) {
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

          const block = new Block({
            index: row.block_index,
            previousHash: row.previous_hash,
            timestamp: new Date(row.timestamp).getTime(),
            transactions,
            nonce: row.nonce,
            difficulty: row.difficulty,
          });

          this.chain.push(block);
        }

        log.info('Blockchain loaded from database', {
          blocks: this.chain.length,
          latestHash: this.getLatestBlock().hash,
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
  private createGenesisBlock(): Block {
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

    block.mine();
    return block;
  }

  /**
   * Get the latest block in the chain
   */
  public getLatestBlock(): Block {
    return this.chain[this.chain.length - 1];
  }

  /**
   * Add a new transaction to pending transactions
   */
  public async addTransaction(transaction: Transaction): Promise<string> {
    if (!transaction.isValid()) {
      throw new Error('Invalid transaction');
    }

    this.pendingTransactions.push(transaction);

    log.blockchain('Transaction added to pending pool', {
      txHash: transaction.hash,
      type: transaction.transactionType,
      entityType: transaction.entityType,
    });

    // Auto-mine if we have enough transactions
    if (this.pendingTransactions.length >= 10) {
      await this.minePendingTransactions();
    }

    return transaction.hash;
  }

  /**
   * Mine pending transactions into a new block
   */
  public async minePendingTransactions(): Promise<Block | null> {
    if (this.pendingTransactions.length === 0) {
      log.warn('No pending transactions to mine');
      return null;
    }

    const startTime = Date.now();

    const block = new Block({
      index: this.chain.length,
      previousHash: this.getLatestBlock().hash,
      timestamp: Date.now(),
      transactions: [...this.pendingTransactions],
      nonce: 0,
      difficulty: this.difficulty,
    });

    log.info('Mining new block...', {
      index: block.index,
      transactions: block.transactions.length,
      difficulty: this.difficulty,
    });

    // Perform Proof-of-Work
    block.mine();

    const miningTime = Date.now() - startTime;

    // Add to chain
    this.chain.push(block);

    // Persist to database
    await this.persistBlock(block);

    // Clear pending transactions
    this.pendingTransactions = [];

    log.blockchain('Block mined successfully', {
      index: block.index,
      hash: block.hash,
      transactions: block.transactions.length,
      miningTime: `${miningTime}ms`,
      nonce: block.nonce,
    });

    log.performance('block_mining_time', miningTime, 'ms', {
      blockIndex: block.index,
      difficulty: this.difficulty,
    });

    return block;
  }

  /**
   * Persist block to database
   */
  private async persistBlock(block: Block): Promise<void> {
    try {
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

        // Insert transactions
        for (const tx of block.transactions) {
          await client.query(
            `INSERT INTO blockchain_transactions
             (id, block_id, transaction_hash, transaction_type, entity_type, entity_id, data, timestamp, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              tx.id,
              blockId,
              tx.hash,
              tx.transactionType,
              tx.entityType,
              tx.entityId,
              JSON.stringify(tx.data),
              new Date(tx.timestamp),
              tx.createdBy,
            ]
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
   * Validate the entire blockchain
   */
  public isChainValid(): boolean {
    // Validate genesis block
    if (!this.chain[0].isValid()) {
      log.error('Invalid genesis block');
      return false;
    }

    // Validate all other blocks
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      if (!currentBlock.isValid(previousBlock)) {
        log.error('Invalid block detected', {
          index: currentBlock.index,
          hash: currentBlock.hash,
        });
        return false;
      }
    }

    return true;
  }

  /**
   * Get transaction by hash
   */
  public async getTransaction(txHash: string): Promise<Transaction | null> {
    try {
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
      const result = await db.query(
        `SELECT * FROM blockchain_transactions
         WHERE entity_type = $1 AND entity_id = $2
         ORDER BY timestamp DESC`,
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
    isValid: boolean;
  }> {
    const txCountResult = await db.query(
      'SELECT COUNT(*) as count FROM blockchain_transactions'
    );

    return {
      totalBlocks: this.chain.length,
      totalTransactions: parseInt(txCountResult.rows[0].count, 10),
      pendingTransactions: this.pendingTransactions.length,
      difficulty: this.difficulty,
      latestBlock: {
        index: this.getLatestBlock().index,
        hash: this.getLatestBlock().hash,
        timestamp: this.getLatestBlock().timestamp,
      },
      isValid: this.isChainValid(),
    };
  }

  /**
   * Get pending transactions
   */
  public getPendingTransactions(): Transaction[] {
    return [...this.pendingTransactions];
  }

  /**
   * Get chain length
   */
  public getChainLength(): number {
    return this.chain.length;
  }
}

// Export singleton instance
export const blockchain = Blockchain.getInstance();
export default blockchain;
