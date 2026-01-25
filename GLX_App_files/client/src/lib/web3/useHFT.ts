/**
 * GLX: Connect the World - Civic Networking Platform
 *
 * Copyright (c) 2025 rsl37
 * Dual-licensed under PolyForm Shield 1.0.0 OR PolyForm Noncommercial 1.0.0
 */

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACT_ADDRESSES, HFT_ABI } from './contracts';
import { formatUnits, parseUnits } from 'viem';

/**
 * Hook to read HFT token balance
 */
export function useHFTBalance(address?: `0x${string}`) {
  const { data: balance, isLoading, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.HFT as `0x${string}`,
    abi: HFT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  return {
    balance: balance ? formatUnits(balance as bigint, 18) : '0',
    balanceRaw: balance as bigint | undefined,
    isLoading,
    refetch,
  };
}

/**
 * Hook to read HFT total supply
 */
export function useHFTTotalSupply() {
  const { data: totalSupply, isLoading, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.HFT as `0x${string}`,
    abi: HFT_ABI,
    functionName: 'totalSupply',
  });

  return {
    totalSupply: totalSupply ? formatUnits(totalSupply as bigint, 18) : '0',
    totalSupplyRaw: totalSupply as bigint | undefined,
    isLoading,
    refetch,
  };
}

/**
 * Hook to read current collateral ratio
 */
export function useCollateralRatio() {
  const { data: ratio, isLoading, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.HFT as `0x${string}`,
    abi: HFT_ABI,
    functionName: 'getCurrentCollateralRatio',
  });

  return {
    ratio: ratio ? Number(ratio) : 0,
    isLoading,
    refetch,
  };
}

/**
 * Hook to read current crisis level
 */
export function useCrisisLevel() {
  const { data: level, isLoading, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.HFT as `0x${string}`,
    abi: HFT_ABI,
    functionName: 'currentCrisisLevel',
  });

  const crisisLevels = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

  return {
    level: level !== undefined ? crisisLevels[Number(level)] : 'UNKNOWN',
    levelNumber: level !== undefined ? Number(level) : 0,
    isLoading,
    refetch,
  };
}

/**
 * Hook to read user's reputation score
 */
export function useReputationScore(address?: `0x${string}`) {
  const { data: score, isLoading, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.HFT as `0x${string}`,
    abi: HFT_ABI,
    functionName: 'getReputationScore',
    args: address ? [address] : undefined,
  });

  return {
    score: score ? Number(score) : 0,
    isLoading,
    refetch,
  };
}

/**
 * Hook to read user's civic contributions
 */
export function useCivicContributions(address?: `0x${string}`) {
  const { data: contributions, isLoading, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.HFT as `0x${string}`,
    abi: HFT_ABI,
    functionName: 'getCivicContribution',
    args: address ? [address] : undefined,
  });

  return {
    contributions: contributions ? Number(contributions) : 0,
    isLoading,
    refetch,
  };
}

/**
 * Hook to transfer HFT tokens
 */
export function useHFTTransfer() {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const transfer = (to: `0x${string}`, amount: string) => {
    writeContract({
      address: CONTRACT_ADDRESSES.HFT as `0x${string}`,
      abi: HFT_ABI,
      functionName: 'transfer',
      args: [to, parseUnits(amount, 18)],
    });
  };

  return {
    transfer,
    isPending,
    isConfirming,
    isSuccess,
    hash,
  };
}

/**
 * Hook to approve HFT tokens
 */
export function useHFTApprove() {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const approve = (spender: `0x${string}`, amount: string) => {
    writeContract({
      address: CONTRACT_ADDRESSES.HFT as `0x${string}`,
      abi: HFT_ABI,
      functionName: 'approve',
      args: [spender, parseUnits(amount, 18)],
    });
  };

  return {
    approve,
    isPending,
    isConfirming,
    isSuccess,
    hash,
  };
}
