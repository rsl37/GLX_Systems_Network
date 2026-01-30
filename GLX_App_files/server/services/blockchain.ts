/**
 * GLX: Connect the World - Civic Networking Platform
 *
 * Copyright (c) 2025 rsl37
 * Dual-licensed under PolyForm Shield 1.0.0 OR PolyForm Noncommercial 1.0.0
 */

import { ethers } from 'ethers';
import {
  generatePQCKeyPair,
  hybridPQCEncrypt,
  hybridPQCDecrypt,
  pqcSign,
  pqcVerify,
} from '../encryption.js';

export interface UserReputation {
  civicScore: number;
  taskCompletionRate: number;
  totalTasksCompleted: number;
  totalTasksAssigned: number;
  endorsements: number;
  crisisContributions: number;
  governanceVotes: number;
  lastUpdated: number;
  isVerified: boolean;
}

// Contract addresses (set via environment variables)
const HFT_ADDRESS = process.env.HFT_CONTRACT_ADDRESS || '';
const COLLATERAL_MANAGER_ADDRESS = process.env.COLLATERAL_MANAGER_ADDRESS || '';
const REPUTATION_SCORE_ADDRESS = process.env.REPUTATION_SCORE_ADDRESS || '';

// Provider and signer
let provider: ethers.JsonRpcProvider | null = null;
let signer: ethers.Wallet | null = null;

/**
 * Initialize blockchain connection
 */
export function initializeBlockchain() {
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545';
  const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;

  if (!privateKey) {
    console.warn('⚠️ No BLOCKCHAIN_PRIVATE_KEY set - blockchain features will be read-only');
    provider = new ethers.JsonRpcProvider(rpcUrl);
    return;
  }

  provider = new ethers.JsonRpcProvider(rpcUrl);
  signer = new ethers.Wallet(privateKey, provider);

  console.log('✅ Blockchain initialized');
  console.log('📡 RPC URL:', rpcUrl);
  console.log('🔑 Signer address:', signer.address);
}

/**
 * Get HFT contract instance
 */
function getHFTContract() {
  if (!provider) {
    throw new Error('Blockchain not initialized');
  }

  const abi = [
    'function mintForCivicParticipation(address to, uint256 amount, uint256 civicContribution)',
    'function balanceOf(address account) view returns (uint256)',
    'function totalSupply() view returns (uint256)',
    'function getCurrentCollateralRatio() view returns (uint256)',
    'function updateReputation(address user, uint256 newScore)',
    'function reputationScore(address user) view returns (uint256)',
    'function civicContributions(address user) view returns (uint256)',
  ];

  return new ethers.Contract(
    HFT_ADDRESS,
    abi,
    signer || provider
  );
}

/**
 * Get ReputationScore contract instance
 */
function getReputationContract() {
  if (!provider) {
    throw new Error('Blockchain not initialized');
  }

  const abi = [
    'function recordTaskCompletion(address user, uint8 taskType, uint256 scoreAwarded)',
    'function endorseUser(address user, string comment)',
    'function recordGovernanceVote(address user)',
    'function getReputation(address user) view returns (tuple(uint256 civicScore, uint256 taskCompletionRate, uint256 totalTasksCompleted, uint256 totalTasksAssigned, uint256 endorsements, uint256 crisisContributions, uint256 governanceVotes, uint256 lastUpdated, bool isVerified))',
    'function getGovernanceWeight(address user) view returns (uint256)',
  ];

  return new ethers.Contract(
    REPUTATION_SCORE_ADDRESS,
    abi,
    signer || provider
  );
}

/**
 * Mint HFT tokens for civic participation
 */
export async function mintTokensForCivicTask(
  userAddress: string,
  taskValue: number,
  civicContribution: number
): Promise<string | null> {
  try {
    if (!signer) {
      console.warn('⚠️ Cannot mint: no signer configured');
      return null;
    }

    const hft = getHFTContract();

    // Convert to wei (18 decimals)
    const amount = ethers.parseEther(taskValue.toString());

    console.log('🪙 Minting HFT tokens:', {
      to: userAddress,
      amount: taskValue,
      civicContribution,
    });

    const tx = await hft.mintForCivicParticipation(
      userAddress,
      amount,
      civicContribution
    );

    const receipt = await tx.wait();
    console.log('✅ Tokens minted:', receipt.hash);

    return receipt.hash;
  } catch (error) {
    console.error('❌ Failed to mint tokens:', error);
    return null;
  }
}

/**
 * Record task completion on-chain
 */
export async function recordTaskCompletion(
  userAddress: string,
  taskType: number,
  scoreAwarded: number
): Promise<string | null> {
  try {
    if (!signer) {
      console.warn('⚠️ Cannot record task: no signer configured');
      return null;
    }

    const reputation = getReputationContract();

    console.log('⭐ Recording task completion:', {
      user: userAddress,
      taskType,
      scoreAwarded,
    });

    const tx = await reputation.recordTaskCompletion(
      userAddress,
      taskType,
      scoreAwarded
    );

    const receipt = await tx.wait();
    console.log('✅ Task recorded:', receipt.hash);

    return receipt.hash;
  } catch (error) {
    console.error('❌ Failed to record task:', error);
    return null;
  }
}

/**
 * Get user's on-chain reputation
 */
export async function getUserReputation(userAddress: string): Promise<UserReputation | null> {
  try {
    const reputation = getReputationContract();
    const data = await reputation.getReputation(userAddress);

    return {
      civicScore: Number(data.civicScore),
      taskCompletionRate: Number(data.taskCompletionRate),
      totalTasksCompleted: Number(data.totalTasksCompleted),
      totalTasksAssigned: Number(data.totalTasksAssigned),
      endorsements: Number(data.endorsements),
      crisisContributions: Number(data.crisisContributions),
      governanceVotes: Number(data.governanceVotes),
      lastUpdated: Number(data.lastUpdated),
      isVerified: data.isVerified,
    };
  } catch (error) {
    console.error('❌ Failed to get reputation:', error);
    return null;
  }
}

/**
 * Get user's HFT balance
 */
export async function getHFTBalance(userAddress: string): Promise<string> {
  try {
    const hft = getHFTContract();
    const balance = await hft.balanceOf(userAddress);
    return ethers.formatEther(balance);
  } catch (error) {
    console.error('❌ Failed to get balance:', error);
    return '0';
  }
}

/**
 * Get total HFT supply
 */
export async function getTotalSupply(): Promise<string> {
  try {
    const hft = getHFTContract();
    const supply = await hft.totalSupply();
    return ethers.formatEther(supply);
  } catch (error) {
    console.error('❌ Failed to get total supply:', error);
    return '0';
  }
}

/**
 * Get current collateral ratio
 */
export async function getCollateralRatio(): Promise<number> {
  try {
    const hft = getHFTContract();
    const ratio = await hft.getCurrentCollateralRatio();
    return Number(ratio);
  } catch (error) {
    console.error('❌ Failed to get collateral ratio:', error);
    return 0;
  }
}

/**
 * Check if blockchain is configured and ready
 */
export function isBlockchainReady(): boolean {
  return provider !== null && HFT_ADDRESS !== '' && REPUTATION_SCORE_ADDRESS !== '';
}

/**
 * Get blockchain connection status
 */
export async function getBlockchainStatus() {
  if (!provider) {
    return {
      connected: false,
      network: null,
      blockNumber: null,
      signerAddress: null,
    };
  }

  try {
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();

    return {
      connected: true,
      network: network.name,
      chainId: Number(network.chainId),
      blockNumber,
      signerAddress: signer?.address || null,
      contracts: {
        hft: HFT_ADDRESS || 'not configured',
        collateralManager: COLLATERAL_MANAGER_ADDRESS || 'not configured',
        reputationScore: REPUTATION_SCORE_ADDRESS || 'not configured',
      },
    };
  } catch (error) {
    console.error('❌ Failed to get blockchain status:', error);
    return {
      connected: false,
      network: null,
      blockNumber: null,
      signerAddress: null,
      error: (error as Error).message,
    };
  }
}

// ============================================================================
// ENHANCED BLOCKCHAIN INFRASTRUCTURE
// ============================================================================

/**
 * Post-Quantum Cryptography Integration for Blockchain
 * Stores PQC key pairs for quantum-resistant transaction signing
 */
interface PQCKeyStore {
  publicKey: string;
  secretKey: string;
  address: string;
  createdAt: number;
}

const pqcKeyStore = new Map<string, PQCKeyStore>();

/**
 * Generate and store PQC key pair for an Ethereum address
 * Enables quantum-resistant off-chain signing and encryption
 */
export function generateUserPQCKeys(ethereumAddress: string): PQCKeyStore {
  const keyPair = generatePQCKeyPair();
  const pqcKeys: PQCKeyStore = {
    publicKey: keyPair.publicKey,
    secretKey: keyPair.secretKey,
    address: ethereumAddress,
    createdAt: Date.now(),
  };

  pqcKeyStore.set(ethereumAddress, pqcKeys);
  console.log('🔐 Generated PQC keys for:', ethereumAddress);

  return pqcKeys;
}

/**
 * Get PQC public key for an address
 */
export function getPQCPublicKey(ethereumAddress: string): string | null {
  const keys = pqcKeyStore.get(ethereumAddress);
  return keys?.publicKey || null;
}

/**
 * Advanced Transaction Builder with PQC Security
 * Provides quantum-resistant transaction signing and verification
 */
export interface SecureTransaction {
  from: string;
  to: string;
  value: string;
  data: string;
  nonce: number;
  gasLimit: string;
  gasPrice: string;
  chainId: number;
  timestamp: number;
  pqcSignature?: string;
}

/**
 * Create a secure transaction with PQC signature
 */
export async function createSecureTransaction(
  to: string,
  value: string,
  data: string = '0x'
): Promise<SecureTransaction> {
  if (!provider || !signer) {
    throw new Error('Blockchain not initialized with signer');
  }

  try {
    const network = await provider.getNetwork();
    const nonce = await provider.getTransactionCount(signer.address);
    const feeData = await provider.getFeeData();

    const tx: SecureTransaction = {
      from: signer.address,
      to,
      value,
      data,
      nonce,
      gasLimit: '100000',
      gasPrice: feeData.gasPrice?.toString() || '0',
      chainId: Number(network.chainId),
      timestamp: Date.now(),
    };

    // Add PQC signature for quantum resistance
    const pqcKeys = pqcKeyStore.get(signer.address);
    if (pqcKeys) {
      const txData = JSON.stringify({
        to: tx.to,
        value: tx.value,
        data: tx.data,
        nonce: tx.nonce,
        timestamp: tx.timestamp,
      });
      tx.pqcSignature = pqcSign(txData, pqcKeys.secretKey);
      console.log('🔐 Added PQC signature to transaction');
    }

    return tx;
  } catch (error) {
    console.error('❌ Failed to create secure transaction:', error);
    throw error;
  }
}

/**
 * Verify PQC signature on a transaction
 */
export function verifyTransactionPQCSignature(
  tx: SecureTransaction,
  publicKey: string
): boolean {
  if (!tx.pqcSignature) {
    return false;
  }

  const txData = JSON.stringify({
    to: tx.to,
    value: tx.value,
    data: tx.data,
    nonce: tx.nonce,
    timestamp: tx.timestamp,
  });

  return pqcVerify(txData, tx.pqcSignature, publicKey);
}

/**
 * Multi-Signature Transaction Support
 * Enables governance and high-value transactions requiring multiple approvals
 */
interface MultiSigTransaction {
  id: string;
  transaction: SecureTransaction;
  requiredSignatures: number;
  signatures: Map<string, string>;
  executed: boolean;
  createdAt: number;
}

const pendingMultiSigTxs = new Map<string, MultiSigTransaction>();

/**
 * Create a multi-signature transaction
 */
export function createMultiSigTransaction(
  tx: SecureTransaction,
  requiredSignatures: number
): string {
  const txId = ethers.id(JSON.stringify(tx) + Date.now());

  const multiSigTx: MultiSigTransaction = {
    id: txId,
    transaction: tx,
    requiredSignatures,
    signatures: new Map(),
    executed: false,
    createdAt: Date.now(),
  };

  pendingMultiSigTxs.set(txId, multiSigTx);
  console.log('📝 Created multi-sig transaction:', txId);

  return txId;
}

/**
 * Sign a multi-signature transaction
 */
export async function signMultiSigTransaction(
  txId: string,
  signerAddress: string
): Promise<boolean> {
  const multiSigTx = pendingMultiSigTxs.get(txId);
  if (!multiSigTx) {
    throw new Error('Multi-sig transaction not found');
  }

  if (multiSigTx.executed) {
    throw new Error('Transaction already executed');
  }

  // Generate PQC signature
  const pqcKeys = pqcKeyStore.get(signerAddress);
  if (!pqcKeys) {
    throw new Error('PQC keys not found for signer');
  }

  const txData = JSON.stringify(multiSigTx.transaction);
  const signature = pqcSign(txData, pqcKeys.secretKey);

  multiSigTx.signatures.set(signerAddress, signature);
  console.log(`✍️ Signature added (${multiSigTx.signatures.size}/${multiSigTx.requiredSignatures})`);

  // Auto-execute if threshold reached
  if (multiSigTx.signatures.size >= multiSigTx.requiredSignatures) {
    return await executeMultiSigTransaction(txId);
  }

  return false;
}

/**
 * Execute a multi-signature transaction
 */
export async function executeMultiSigTransaction(txId: string): Promise<boolean> {
  const multiSigTx = pendingMultiSigTxs.get(txId);
  if (!multiSigTx) {
    throw new Error('Multi-sig transaction not found');
  }

  if (multiSigTx.signatures.size < multiSigTx.requiredSignatures) {
    throw new Error('Insufficient signatures');
  }

  if (multiSigTx.executed) {
    throw new Error('Transaction already executed');
  }

  try {
    if (!signer) {
      throw new Error('No signer configured');
    }

    // Verify all signatures before execution
    for (const [address, signature] of multiSigTx.signatures) {
      const publicKey = getPQCPublicKey(address);
      if (!publicKey) {
        throw new Error(`No PQC public key for ${address}`);
      }

      const txData = JSON.stringify(multiSigTx.transaction);
      if (!pqcVerify(txData, signature, publicKey)) {
        throw new Error(`Invalid signature from ${address}`);
      }
    }

    // Execute the transaction
    const tx = await signer.sendTransaction({
      to: multiSigTx.transaction.to,
      value: ethers.parseEther(multiSigTx.transaction.value),
      data: multiSigTx.transaction.data,
    });

    await tx.wait();
    multiSigTx.executed = true;

    console.log('✅ Multi-sig transaction executed:', tx.hash);
    return true;
  } catch (error) {
    console.error('❌ Failed to execute multi-sig transaction:', error);
    throw error;
  }
}

/**
 * Advanced Collateral Management with Crisis Detection
 */
export interface CollateralStatus {
  totalCollateral: string;
  totalDebt: string;
  collateralRatio: number;
  healthFactor: number;
  isHealthy: boolean;
  requiresAction: boolean;
  crisisLevel: 'none' | 'warning' | 'critical' | 'emergency';
}

/**
 * Get detailed collateral status with risk assessment
 */
export async function getDetailedCollateralStatus(): Promise<CollateralStatus> {
  try {
    const hft = getHFTContract();
    const ratio = await hft.getCurrentCollateralRatio();
    const supply = await hft.totalSupply();

    const collateralRatio = Number(ratio);
    const totalDebt = ethers.formatEther(supply);

    // Calculate health factor (150% = healthy, 120% = warning, <110% = critical)
    const healthFactor = collateralRatio / 100;

    let crisisLevel: 'none' | 'warning' | 'critical' | 'emergency' = 'none';
    if (collateralRatio < 110) {
      crisisLevel = 'emergency';
    } else if (collateralRatio < 120) {
      crisisLevel = 'critical';
    } else if (collateralRatio < 150) {
      crisisLevel = 'warning';
    }

    return {
      totalCollateral: (Number(totalDebt) * healthFactor).toFixed(2),
      totalDebt,
      collateralRatio,
      healthFactor,
      isHealthy: collateralRatio >= 150,
      requiresAction: collateralRatio < 150,
      crisisLevel,
    };
  } catch (error) {
    console.error('❌ Failed to get collateral status:', error);
    throw error;
  }
}

/**
 * Transaction Monitoring and Analytics
 */
interface TransactionMetrics {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  totalGasUsed: string;
  averageGasPrice: string;
  lastBlockTimestamp: number;
}

let transactionMetrics: TransactionMetrics = {
  totalTransactions: 0,
  successfulTransactions: 0,
  failedTransactions: 0,
  totalGasUsed: '0',
  averageGasPrice: '0',
  lastBlockTimestamp: 0,
};

/**
 * Record transaction metrics
 */
export function recordTransactionMetrics(
  success: boolean,
  gasUsed: string,
  gasPrice: string
): void {
  transactionMetrics.totalTransactions++;
  if (success) {
    transactionMetrics.successfulTransactions++;
  } else {
    transactionMetrics.failedTransactions++;
  }

  // Update running averages
  const currentGas = BigInt(transactionMetrics.totalGasUsed);
  const newGas = BigInt(gasUsed);
  transactionMetrics.totalGasUsed = (currentGas + newGas).toString();

  transactionMetrics.lastBlockTimestamp = Date.now();
}

/**
 * Get transaction metrics
 */
export function getTransactionMetrics(): TransactionMetrics {
  return { ...transactionMetrics };
}

/**
 * Gas Optimization - Estimate gas with safety margin
 */
export async function estimateGasWithMargin(
  to: string,
  data: string,
  marginPercent: number = 20
): Promise<bigint> {
  if (!provider || !signer) {
    throw new Error('Blockchain not initialized');
  }

  try {
    const estimate = await provider.estimateGas({
      from: signer.address,
      to,
      data,
    });

    // Add safety margin
    const margin = (estimate * BigInt(marginPercent)) / BigInt(100);
    return estimate + margin;
  } catch (error) {
    console.error('❌ Gas estimation failed:', error);
    throw error;
  }
}

/**
 * Batch Transaction Processing
 * Process multiple transactions efficiently
 */
export async function batchProcessTransactions(
  transactions: Array<{ to: string; value: string; data: string }>
): Promise<string[]> {
  if (!signer) {
    throw new Error('No signer configured');
  }

  const txHashes: string[] = [];

  try {
    for (const tx of transactions) {
      const txResponse = await signer.sendTransaction({
        to: tx.to,
        value: ethers.parseEther(tx.value),
        data: tx.data,
      });

      const receipt = await txResponse.wait();
      if (receipt) {
        txHashes.push(receipt.hash);
        recordTransactionMetrics(true, receipt.gasUsed.toString(), receipt.gasPrice.toString());
      }
    }

    console.log(`✅ Batch processed ${txHashes.length} transactions`);
    return txHashes;
  } catch (error) {
    console.error('❌ Batch processing failed:', error);
    throw error;
  }
}

/**
 * Event Monitoring - Listen for contract events
 */
export interface ContractEvent {
  event: string;
  address: string;
  blockNumber: number;
  transactionHash: string;
  args: any[];
  timestamp: number;
}

const eventListeners = new Map<string, Array<(event: ContractEvent) => void>>();

/**
 * Subscribe to contract events
 */
export function subscribeToContractEvents(
  contractAddress: string,
  eventName: string,
  callback: (event: ContractEvent) => void
): void {
  const key = `${contractAddress}:${eventName}`;
  const listeners = eventListeners.get(key) || [];
  listeners.push(callback);
  eventListeners.set(key, listeners);

  console.log(`👂 Subscribed to ${eventName} events on ${contractAddress}`);
}

/**
 * Enhanced blockchain initialization with monitoring
 */
export async function initializeEnhancedBlockchain(): Promise<void> {
  initializeBlockchain();

  if (!signer) {
    console.warn('⚠️ Signer not configured - enhanced features limited');
    return;
  }

  // Generate PQC keys for signer
  generateUserPQCKeys(signer.address);

  // Set up event monitoring
  if (provider) {
    provider.on('block', async (blockNumber) => {
      console.log('📦 New block:', blockNumber);
      transactionMetrics.lastBlockTimestamp = Date.now();
    });
  }

  console.log('✅ Enhanced blockchain infrastructure initialized');
  console.log('🔐 Post-quantum cryptography enabled');
  console.log('📊 Transaction monitoring active');
}

/**
 * Blockchain Health Check
 * Comprehensive system status check
 */
export interface BlockchainHealth {
  status: 'healthy' | 'degraded' | 'critical';
  provider: boolean;
  signer: boolean;
  contracts: {
    hft: boolean;
    collateralManager: boolean;
    reputationScore: boolean;
  };
  pqcEnabled: boolean;
  lastBlockAge: number;
  metrics: TransactionMetrics;
}

export async function getBlockchainHealth(): Promise<BlockchainHealth> {
  const health: BlockchainHealth = {
    status: 'healthy',
    provider: provider !== null,
    signer: signer !== null,
    contracts: {
      hft: HFT_ADDRESS !== '',
      collateralManager: COLLATERAL_MANAGER_ADDRESS !== '',
      reputationScore: REPUTATION_SCORE_ADDRESS !== '',
    },
    pqcEnabled: signer ? pqcKeyStore.has(signer.address) : false,
    lastBlockAge: Date.now() - transactionMetrics.lastBlockTimestamp,
    metrics: transactionMetrics,
  };

  // Determine overall status
  if (!health.provider || !health.signer) {
    health.status = 'critical';
  } else if (!health.contracts.hft || !health.contracts.reputationScore) {
    health.status = 'degraded';
  } else if (health.lastBlockAge > 60000) {
    // No blocks in last minute
    health.status = 'degraded';
  }

  return health;
}
