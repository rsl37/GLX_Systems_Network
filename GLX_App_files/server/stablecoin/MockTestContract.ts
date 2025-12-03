/*
 * Copyright (c) 2025 GLX Civic Networking App
 *
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

/**
 * Mock Test Contract for CROWDS Stablecoin
 * Simulates blockchain smart contract interactions for reading reserve data
 * Used for development and testing before mainnet deployment
 */

export interface ReserveData {
  totalReserve: number;
  collateralRatio: number;
  reserveAssets: ReserveAsset[];
  lastUpdated: string;
  blockNumber: number;
}

export interface ReserveAsset {
  symbol: string;
  name: string;
  balance: number;
  valueUsd: number;
  percentage: number;
}

export interface ContractState {
  totalSupply: number;
  circulatingSupply: number;
  reserveBalance: number;
  collateralRatio: number;
  targetPrice: number;
  currentPrice: number;
  isPaused: boolean;
  lastRebalance: string;
}

export interface TransactionReceipt {
  transactionHash: string;
  blockNumber: number;
  gasUsed: number;
  status: 'success' | 'failed' | 'pending';
  timestamp: string;
}

/**
 * Mock Test Contract for CROWDS Reserve
 * Simulates on-chain reserve data for development
 */
export class MockCrowdsReserveContract {
  private contractAddress: string;
  private networkId: string;
  private state: ContractState;
  private reserveAssets: ReserveAsset[];
  private mockBlockNumber: number = 1000000;

  constructor(
    contractAddress: string = '0x1234567890abcdef1234567890abcdef12345678',
    networkId: string = 'testnet'
  ) {
    this.contractAddress = contractAddress;
    this.networkId = networkId;
    
    // Initialize mock state
    this.state = {
      totalSupply: 10000000,
      circulatingSupply: 8500000,
      reserveBalance: 2500000,
      collateralRatio: 1.25, // 125% collateralization
      targetPrice: 1.00,
      currentPrice: 0.998,
      isPaused: false,
      lastRebalance: new Date().toISOString(),
    };

    // Initialize mock reserve assets
    this.reserveAssets = [
      {
        symbol: 'USDC',
        name: 'USD Coin',
        balance: 1500000,
        valueUsd: 1500000,
        percentage: 60,
      },
      {
        symbol: 'DAI',
        name: 'Dai Stablecoin',
        balance: 500000,
        valueUsd: 500000,
        percentage: 20,
      },
      {
        symbol: 'USDT',
        name: 'Tether USD',
        balance: 400000,
        valueUsd: 400000,
        percentage: 16,
      },
      {
        symbol: 'ETH',
        name: 'Ethereum',
        balance: 50,
        valueUsd: 100000,
        percentage: 4,
      },
    ];

    console.log(`🔗 MockCrowdsReserveContract initialized`);
    console.log(`   • Contract: ${contractAddress}`);
    console.log(`   • Network: ${networkId}`);
  }

  /**
   * Get contract address
   */
  getAddress(): string {
    return this.contractAddress;
  }

  /**
   * Get network identifier
   */
  getNetwork(): string {
    return this.networkId;
  }

  /**
   * Read current reserve data from mock contract
   */
  async getReserveData(): Promise<ReserveData> {
    // Simulate network latency
    await this.simulateNetworkDelay();

    // Increment mock block number
    this.mockBlockNumber += Math.floor(Math.random() * 3) + 1;

    return {
      totalReserve: this.state.reserveBalance,
      collateralRatio: this.state.collateralRatio,
      reserveAssets: [...this.reserveAssets],
      lastUpdated: new Date().toISOString(),
      blockNumber: this.mockBlockNumber,
    };
  }

  /**
   * Read contract state
   */
  async getContractState(): Promise<ContractState> {
    await this.simulateNetworkDelay();
    
    return { ...this.state };
  }

  /**
   * Get total supply
   */
  async getTotalSupply(): Promise<number> {
    await this.simulateNetworkDelay();
    return this.state.totalSupply;
  }

  /**
   * Get circulating supply
   */
  async getCirculatingSupply(): Promise<number> {
    await this.simulateNetworkDelay();
    return this.state.circulatingSupply;
  }

  /**
   * Get reserve balance
   */
  async getReserveBalance(): Promise<number> {
    await this.simulateNetworkDelay();
    return this.state.reserveBalance;
  }

  /**
   * Get collateral ratio
   */
  async getCollateralRatio(): Promise<number> {
    await this.simulateNetworkDelay();
    return this.state.collateralRatio;
  }

  /**
   * Get current price
   */
  async getCurrentPrice(): Promise<number> {
    await this.simulateNetworkDelay();
    
    // Simulate small price fluctuations
    const fluctuation = (Math.random() - 0.5) * 0.01;
    this.state.currentPrice = Math.max(0.95, Math.min(1.05, this.state.targetPrice + fluctuation));
    
    return this.state.currentPrice;
  }

  /**
   * Get target price (peg)
   */
  async getTargetPrice(): Promise<number> {
    await this.simulateNetworkDelay();
    return this.state.targetPrice;
  }

  /**
   * Get reserve asset breakdown
   */
  async getReserveAssets(): Promise<ReserveAsset[]> {
    await this.simulateNetworkDelay();
    return [...this.reserveAssets];
  }

  /**
   * Check if contract is paused
   */
  async isPaused(): Promise<boolean> {
    await this.simulateNetworkDelay();
    return this.state.isPaused;
  }

  /**
   * Get last rebalance timestamp
   */
  async getLastRebalance(): Promise<string> {
    await this.simulateNetworkDelay();
    return this.state.lastRebalance;
  }

  /**
   * Simulate a deposit to reserves (test function)
   */
  async simulateDeposit(amount: number, asset: string = 'USDC'): Promise<TransactionReceipt> {
    await this.simulateNetworkDelay(100);

    // Update state
    this.state.reserveBalance += amount;
    
    // Update asset balance
    const assetIndex = this.reserveAssets.findIndex(a => a.symbol === asset);
    if (assetIndex !== -1) {
      this.reserveAssets[assetIndex].balance += amount;
      this.reserveAssets[assetIndex].valueUsd += amount;
    }

    // Recalculate collateral ratio
    this.state.collateralRatio = this.state.reserveBalance / this.state.circulatingSupply;

    // Recalculate percentages
    this.recalculatePercentages();

    this.mockBlockNumber++;

    return this.createReceipt('success');
  }

  /**
   * Simulate a withdrawal from reserves (test function)
   */
  async simulateWithdrawal(amount: number, asset: string = 'USDC'): Promise<TransactionReceipt> {
    await this.simulateNetworkDelay(100);

    const assetIndex = this.reserveAssets.findIndex(a => a.symbol === asset);
    if (assetIndex === -1) {
      return this.createReceipt('failed');
    }

    if (this.reserveAssets[assetIndex].balance < amount) {
      return this.createReceipt('failed');
    }

    // Update state
    this.state.reserveBalance -= amount;
    this.reserveAssets[assetIndex].balance -= amount;
    this.reserveAssets[assetIndex].valueUsd -= amount;

    // Recalculate collateral ratio
    this.state.collateralRatio = this.state.reserveBalance / this.state.circulatingSupply;

    // Recalculate percentages
    this.recalculatePercentages();

    this.mockBlockNumber++;

    return this.createReceipt('success');
  }

  /**
   * Simulate minting new CROWDS tokens
   */
  async simulateMint(amount: number): Promise<TransactionReceipt> {
    await this.simulateNetworkDelay(100);

    this.state.totalSupply += amount;
    this.state.circulatingSupply += amount;
    
    // Recalculate collateral ratio
    this.state.collateralRatio = this.state.reserveBalance / this.state.circulatingSupply;

    this.mockBlockNumber++;

    return this.createReceipt('success');
  }

  /**
   * Simulate burning CROWDS tokens
   */
  async simulateBurn(amount: number): Promise<TransactionReceipt> {
    await this.simulateNetworkDelay(100);

    if (amount > this.state.circulatingSupply) {
      return this.createReceipt('failed');
    }

    this.state.totalSupply -= amount;
    this.state.circulatingSupply -= amount;
    
    // Recalculate collateral ratio
    if (this.state.circulatingSupply > 0) {
      this.state.collateralRatio = this.state.reserveBalance / this.state.circulatingSupply;
    }

    this.mockBlockNumber++;

    return this.createReceipt('success');
  }

  /**
   * Simulate a rebalance operation
   */
  async simulateRebalance(): Promise<TransactionReceipt> {
    await this.simulateNetworkDelay(200);

    // Simulate rebalancing logic
    const deviation = Math.abs(this.state.currentPrice - this.state.targetPrice) / this.state.targetPrice;
    
    if (deviation > 0.02) { // 2% deviation threshold
      // Adjust supply based on price deviation
      if (this.state.currentPrice > this.state.targetPrice) {
        // Price too high - expand supply
        const expansion = this.state.circulatingSupply * deviation * 0.5;
        this.state.circulatingSupply += expansion;
        this.state.totalSupply += expansion;
      } else {
        // Price too low - contract supply
        const contraction = Math.min(
          this.state.circulatingSupply * deviation * 0.5,
          this.state.circulatingSupply * 0.05 // Max 5% contraction
        );
        this.state.circulatingSupply -= contraction;
        this.state.totalSupply -= contraction;
      }
    }

    // Update collateral ratio
    this.state.collateralRatio = this.state.reserveBalance / this.state.circulatingSupply;
    this.state.lastRebalance = new Date().toISOString();

    this.mockBlockNumber++;

    return this.createReceipt('success');
  }

  /**
   * Get comprehensive reserve health metrics
   */
  async getReserveHealth(): Promise<{
    isHealthy: boolean;
    collateralizationStatus: 'overcollateralized' | 'healthy' | 'undercollateralized' | 'critical';
    metrics: {
      collateralRatio: number;
      targetRatio: number;
      deviation: number;
      reserveValue: number;
      supplyValue: number;
    };
    recommendations: string[];
  }> {
    await this.simulateNetworkDelay();

    const targetRatio = 1.2; // 120% target
    const currentRatio = this.state.collateralRatio;
    const deviation = (currentRatio - targetRatio) / targetRatio;

    let status: 'overcollateralized' | 'healthy' | 'undercollateralized' | 'critical';
    const recommendations: string[] = [];

    if (currentRatio >= 1.5) {
      status = 'overcollateralized';
      recommendations.push('Consider using excess reserves for yield generation');
    } else if (currentRatio >= 1.1) {
      status = 'healthy';
    } else if (currentRatio >= 1.0) {
      status = 'undercollateralized';
      recommendations.push('Increase reserve ratio through deposits');
      recommendations.push('Consider limiting new minting');
    } else {
      status = 'critical';
      recommendations.push('URGENT: Add reserves immediately');
      recommendations.push('Pause minting operations');
      recommendations.push('Initiate supply contraction');
    }

    return {
      isHealthy: status === 'healthy' || status === 'overcollateralized',
      collateralizationStatus: status,
      metrics: {
        collateralRatio: currentRatio,
        targetRatio,
        deviation,
        reserveValue: this.state.reserveBalance,
        supplyValue: this.state.circulatingSupply * this.state.currentPrice,
      },
      recommendations,
    };
  }

  /**
   * Helper: Simulate network delay
   */
  private async simulateNetworkDelay(ms: number = 50): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms + Math.random() * ms));
  }

  /**
   * Helper: Create transaction receipt
   */
  private createReceipt(status: 'success' | 'failed' | 'pending'): TransactionReceipt {
    return {
      transactionHash: `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      blockNumber: this.mockBlockNumber,
      gasUsed: Math.floor(Math.random() * 100000) + 50000,
      status,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Helper: Recalculate asset percentages
   */
  private recalculatePercentages(): void {
    const totalValue = this.reserveAssets.reduce((sum, asset) => sum + asset.valueUsd, 0);
    for (const asset of this.reserveAssets) {
      asset.percentage = totalValue > 0 ? (asset.valueUsd / totalValue) * 100 : 0;
    }
  }
}

// Export singleton instance for default usage
export const mockCrowdsContract = new MockCrowdsReserveContract();

export default MockCrowdsReserveContract;
