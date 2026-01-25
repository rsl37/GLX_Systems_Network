/**
 * GLX: Connect the World - Civic Networking Platform
 *
 * Copyright (c) 2025 rsl37
 * Dual-licensed under PolyForm Shield 1.0.0 OR PolyForm Noncommercial 1.0.0
 */

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, sepolia, polygon, polygonMumbai, arbitrum, arbitrumSepolia, optimism, optimismSepolia, base, baseSepolia } from 'wagmi/chains';

// Define localhost chain for development
const localhost = {
  id: 1337,
  name: 'Localhost',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
    public: { http: ['http://127.0.0.1:8545'] },
  },
  testnet: true,
} as const;

// Wagmi configuration
export const wagmiConfig = getDefaultConfig({
  appName: 'GLX CROWDS Network',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [
    // Production chains
    mainnet,
    polygon,
    arbitrum,
    optimism,
    base,
    // Testnet chains
    sepolia,
    polygonMumbai,
    arbitrumSepolia,
    optimismSepolia,
    baseSepolia,
    // Local development
    localhost,
  ],
  ssr: false, // Client-side only
});
