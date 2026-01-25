/**
 * GLX: Connect the World - Civic Networking Platform
 *
 * Copyright (c) 2025 rsl37
 * Dual-licensed under PolyForm Shield 1.0.0 OR PolyForm Noncommercial 1.0.0
 */

// Contract addresses (to be updated after deployment)
export const CONTRACT_ADDRESSES = {
  HFT: import.meta.env.VITE_HFT_ADDRESS || '0x0000000000000000000000000000000000000000',
  COLLATERAL_MANAGER: import.meta.env.VITE_COLLATERAL_MANAGER_ADDRESS || '0x0000000000000000000000000000000000000000',
  REPUTATION_SCORE: import.meta.env.VITE_REPUTATION_SCORE_ADDRESS || '0x0000000000000000000000000000000000000000',
} as const;

// HFT Token ABI (minimal for frontend use)
export const HFT_ABI = [
  // Read functions
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function getCurrentCollateralRatio() view returns (uint256)',
  'function currentCrisisLevel() view returns (uint8)',
  'function reputationScore(address user) view returns (uint256)',
  'function civicContributions(address user) view returns (uint256)',
  'function getCivicContribution(address user) view returns (uint256)',
  'function getReputationScore(address user) view returns (uint256)',

  // Write functions
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',

  // Events
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
  'event TokensMinted(address indexed to, uint256 amount, uint256 civicContribution, uint256 timestamp)',
  'event CrisisLevelUpdated(uint8 oldLevel, uint8 newLevel, uint256 timestamp)',
  'event ReputationUpdated(address indexed user, uint256 oldScore, uint256 newScore, uint256 timestamp)',
] as const;

// CollateralManager ABI (minimal)
export const COLLATERAL_MANAGER_ABI = [
  'function getTotalCollateralValue() view returns (uint256)',
  'function getUserCollateral(address user, bytes32 assetId) view returns (uint256 amount, uint256 valueInCents)',
  'function getSupportedAssets() view returns (bytes32[])',
  'function depositCollateral(bytes32 assetId, uint256 amount)',
  'function withdrawCollateral(bytes32 assetId, uint256 amount)',

  'event CollateralDeposited(address indexed user, bytes32 indexed assetId, uint256 amount, uint256 valueInCents, uint256 timestamp)',
  'event CollateralWithdrawn(address indexed user, bytes32 indexed assetId, uint256 amount, uint256 valueInCents, uint256 timestamp)',
] as const;

// ReputationScore ABI (minimal)
export const REPUTATION_SCORE_ABI = [
  'function getReputation(address user) view returns (tuple(uint256 civicScore, uint256 taskCompletionRate, uint256 totalTasksCompleted, uint256 totalTasksAssigned, uint256 endorsements, uint256 crisisContributions, uint256 governanceVotes, uint256 lastUpdated, bool isVerified))',
  'function getGovernanceWeight(address user) view returns (uint256)',
  'function getTaskCount(address user) view returns (uint256)',
  'function getEndorsementCount(address user) view returns (uint256)',
  'function isUserVerified(address user) view returns (bool)',
  'function endorseUser(address user, string comment)',

  'event ReputationUpdated(address indexed user, uint256 oldScore, uint256 newScore, uint256 timestamp)',
  'event TaskCompleted(address indexed user, uint8 taskType, uint256 scoreAwarded, uint256 timestamp)',
  'event EndorsementReceived(address indexed user, address indexed endorser, uint256 weight, uint256 timestamp)',
] as const;
