/**
 * GLX Systems Network Monitoring Platform
 * Mining Worker Thread
 *
 * Copyright (c) 2025 rsl37
 * Dual-licensed under PolyForm Shield 1.0.0 OR PolyForm Noncommercial 1.0.0
 *
 * This worker runs CPU-intensive Proof-of-Work mining in a separate thread
 * to avoid blocking the main event loop.
 */

import { parentPort, workerData } from 'worker_threads';
import { Block } from './Block';
import { Transaction } from './Transaction';

if (!parentPort) {
  throw new Error('This file must be run as a Worker thread');
}

interface MiningWorkerData {
  blockData: {
    index: number;
    previousHash: string;
    timestamp: number;
    transactions: any[];
    difficulty: number;
  };
}

const { blockData } = workerData as MiningWorkerData;

try {
  // Reconstruct transactions
  const transactions = blockData.transactions.map(tx => Transaction.fromJSON(tx));

  // Create block
  const block = new Block({
    index: blockData.index,
    previousHash: blockData.previousHash,
    timestamp: blockData.timestamp,
    transactions,
    nonce: 0,
    difficulty: blockData.difficulty,
  });

  // Mine the block (CPU-intensive work)
  block.mine();

  // Send mined block back to main thread
  parentPort.postMessage(block.toJSON());
} catch (error: any) {
  throw error;
}
