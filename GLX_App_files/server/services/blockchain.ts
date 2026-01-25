/**
 * GLX: Connect the World - Civic Networking Platform
 *
 * Copyright (c) 2025 rsl37
 * Dual-licensed under PolyForm Shield 1.0.0 OR PolyForm Noncommercial 1.0.0
 */

import { ethers } from 'ethers';

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
export async function getUserReputation(userAddress: string): Promise<any> {
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
