/**
 * GLX Systems Network Monitoring Platform
 * Blockchain Block Implementation
 *
 * Copyright (c) 2025 rsl37
 * Dual-licensed under PolyForm Shield 1.0.0 OR PolyForm Noncommercial 1.0.0
 */

import crypto from 'crypto';
import { Transaction } from './Transaction';

export interface BlockData {
  index: number;
  previousHash: string;
  timestamp: number;
  transactions: Transaction[];
  nonce: number;
  difficulty: number;
}

export class Block {
  public index: number;
  public previousHash: string;
  public timestamp: number;
  public transactions: Transaction[];
  public nonce: number;
  public hash: string;
  public difficulty: number;
  public merkleRoot: string;

  constructor(data: BlockData) {
    this.index = data.index;
    this.previousHash = data.previousHash;
    this.timestamp = data.timestamp;
    this.transactions = data.transactions;
    this.nonce = data.nonce;
    this.difficulty = data.difficulty;
    this.merkleRoot = this.calculateMerkleRoot();
    this.hash = this.calculateHash();
  }

  /**
   * Calculate SHA-256 hash of the block
   */
  public calculateHash(): string {
    const blockData = JSON.stringify({
      index: this.index,
      previousHash: this.previousHash,
      timestamp: this.timestamp,
      merkleRoot: this.merkleRoot,
      nonce: this.nonce,
      difficulty: this.difficulty,
    });

    return crypto.createHash('sha256').update(blockData).digest('hex');
  }

  /**
   * Calculate Merkle root of all transactions
   */
  private calculateMerkleRoot(): string {
    if (this.transactions.length === 0) {
      return crypto.createHash('sha256').update('').digest('hex');
    }

    let hashes = this.transactions.map(tx => tx.hash);

    while (hashes.length > 1) {
      const newHashes: string[] = [];

      for (let i = 0; i < hashes.length; i += 2) {
        const left = hashes[i];
        const right = i + 1 < hashes.length ? hashes[i + 1] : left;
        const combined = crypto.createHash('sha256')
          .update(left + right)
          .digest('hex');
        newHashes.push(combined);
      }

      hashes = newHashes;
    }

    return hashes[0];
  }

  /**
   * Mine the block using Proof-of-Work
   */
  public mine(): void {
    const target = '0'.repeat(this.difficulty);

    while (!this.hash.startsWith(target)) {
      this.nonce++;
      this.hash = this.calculateHash();
    }
  }

  /**
   * Validate block integrity
   */
  public isValid(previousBlock?: Block): boolean {
    // Check if hash is correct
    if (this.hash !== this.calculateHash()) {
      return false;
    }

    // Check if Merkle root is correct
    if (this.merkleRoot !== this.calculateMerkleRoot()) {
      return false;
    }

    // Check Proof-of-Work
    const target = '0'.repeat(this.difficulty);
    if (!this.hash.startsWith(target)) {
      return false;
    }

    // Check if previous hash matches
    if (previousBlock && this.previousHash !== previousBlock.hash) {
      return false;
    }

    // Validate all transactions
    for (const tx of this.transactions) {
      if (!tx.isValid()) {
        return false;
      }
    }

    return true;
  }

  /**
   * Serialize block for storage
   */
  public toJSON() {
    return {
      index: this.index,
      previousHash: this.previousHash,
      hash: this.hash,
      timestamp: this.timestamp,
      transactions: this.transactions.map(tx => tx.toJSON()),
      nonce: this.nonce,
      difficulty: this.difficulty,
      merkleRoot: this.merkleRoot,
    };
  }

  /**
   * Deserialize block from JSON
   */
  public static fromJSON(json: any): Block {
    const block = new Block({
      index: json.index,
      previousHash: json.previousHash,
      timestamp: json.timestamp,
      transactions: json.transactions.map((tx: any) => Transaction.fromJSON(tx)),
      nonce: json.nonce,
      difficulty: json.difficulty,
    });

    // Verify hash matches
    if (block.hash !== json.hash) {
      throw new Error('Block hash mismatch during deserialization');
    }

    return block;
  }
}
