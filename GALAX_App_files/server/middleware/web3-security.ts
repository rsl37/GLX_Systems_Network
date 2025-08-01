/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import crypto from 'crypto';

// Constants for voting power calculations
const VOTING_POWER_MULTIPLIER = 10;
const MAX_VOTING_POWER = 100000;

interface Web3SecurityConfig {
  enableTransactionMonitoring: boolean;
  enableSmartContractValidation: boolean;
  maxTransactionValue: number;
  requireMultisigThreshold: number;
  monitoringIntervalMs: number;
  allowedContractAddresses: string[];
  enableGovernanceAudit: boolean;
}

interface TransactionMonitorEvent {
  id: string;
  transactionHash: string;
  fromAddress: string;
  toAddress: string;
  value: string;
  contractAddress?: string;
  functionName?: string;
  gasUsed: number;
  timestamp: Date;
  riskScore: number;
  anomalies: string[];
  isGovernance: boolean;
}

interface SmartContractAudit {
  contractAddress: string;
  codeHash: string;
  auditStatus: 'pending' | 'approved' | 'rejected' | 'needs_review';
  auditReport?: string;
  auditedAt?: Date;
  vulnerabilities: string[];
  securityScore: number;
}

interface GovernanceTransaction {
  proposalId: string;
  voterAddress: string;
  vote: 'for' | 'against' | 'abstain';
  votingPower: number;
  timestamp: Date;
  transactionHash: string;
  anomalies: string[];
}

export class Web3SecurityMiddleware {
  private config: Web3SecurityConfig;
  private transactionEvents: TransactionMonitorEvent[] = [];
  private contractAudits: Map<string, SmartContractAudit> = new Map();
  private governanceTransactions: GovernanceTransaction[] = [];
  private monitoringActive = false;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(config: Web3SecurityConfig) {
    this.config = config;
    this.initializeMonitoring();
  }

  /**
   * Initialize blockchain transaction monitoring
   */
  private initializeMonitoring() {
    if (!this.config.enableTransactionMonitoring) {
      return;
    }

    this.monitoringActive = true;
    console.log('🔗 Web3 security monitoring initialized');

    // Start monitoring interval
    this.monitoringInterval = setInterval(() => {
      this.performSecurityScan();
    }, this.config.monitoringIntervalMs);
  }

  /**
   * Monitor blockchain transaction for suspicious activity
   */
  async monitorTransaction(
    transactionHash: string,
    fromAddress: string,
    toAddress: string,
    value: string,
    contractAddress?: string,
    functionName?: string,
    gasUsed = 0
  ): Promise<{ isSecure: boolean; riskScore: number; anomalies: string[] }> {
    const anomalies: string[] = [];
    let riskScore = 0;

    // Check transaction value against limits
    const valueInEth = parseFloat(value);
    if (valueInEth > this.config.maxTransactionValue) {
      anomalies.push(`Transaction value exceeds limit: ${valueInEth} > ${this.config.maxTransactionValue}`);
      riskScore += 40;
    }

    // Check if contract is approved
    if (contractAddress && !this.config.allowedContractAddresses.includes(contractAddress)) {
      anomalies.push(`Transaction to unapproved contract: ${contractAddress}`);
      riskScore += 60;
    }

    // Check for unusual gas usage
    if (gasUsed > 1000000) { // 1M gas limit threshold
      anomalies.push(`Unusually high gas usage: ${gasUsed}`);
      riskScore += 20;
    }

    // Check for governance-related transactions
    const isGovernance = this.isGovernanceTransaction(functionName, contractAddress);
    if (isGovernance) {
      const governanceRisk = await this.analyzeGovernanceTransaction(
        transactionHash, fromAddress, toAddress, functionName
      );
      riskScore += governanceRisk.riskScore;
      anomalies.push(...governanceRisk.anomalies);
    }

    // Check address reputation
    const addressRisk = this.checkAddressReputation(fromAddress);
    riskScore += addressRisk.riskScore;
    anomalies.push(...addressRisk.anomalies);

    // Log the transaction event
    const event: TransactionMonitorEvent = {
      id: crypto.randomUUID(),
      transactionHash,
      fromAddress,
      toAddress,
      value,
      contractAddress,
      functionName,
      gasUsed,
      timestamp: new Date(),
      riskScore,
      anomalies,
      isGovernance
    };

    this.transactionEvents.push(event);

    // Keep only recent events (last 1000)
    if (this.transactionEvents.length > 1000) {
      this.transactionEvents = this.transactionEvents.slice(-1000);
    }

    const isSecure = riskScore < 50; // Risk threshold

    if (!isSecure) {
      console.warn(`🚨 High-risk Web3 transaction detected:`, {
        hash: transactionHash,
        riskScore,
        anomalies
      });
    }

    return { isSecure, riskScore, anomalies };
  }

  /**
   * Validate smart contract before deployment
   */
  async validateSmartContract(
    contractCode: string,
    contractAddress: string
  ): Promise<{ isValid: boolean; vulnerabilities: string[]; securityScore: number }> {
    const vulnerabilities: string[] = [];
    let securityScore = 100; // Start with perfect score, deduct for issues

    if (!this.config.enableSmartContractValidation) {
      return { isValid: true, vulnerabilities: [], securityScore: 100 };
    }

    // Basic static analysis patterns
    const securityPatterns = [
      {
        pattern: /selfdestruct\s*\(/gi,
        vulnerability: 'Potential selfdestruct vulnerability',
        severity: 30
      },
      {
        pattern: /delegatecall\s*\(/gi,
        vulnerability: 'Potential delegatecall vulnerability',
        severity: 25
      },
      {
        pattern: /tx\.origin/gi,
        vulnerability: 'tx.origin authentication vulnerability',
        severity: 35
      },
      {
        pattern: /block\.timestamp/gi,
        vulnerability: 'Timestamp dependence vulnerability',
        severity: 15
      },
      {
        pattern: /random\(\)|rand\(\)/gi,
        vulnerability: 'Weak randomness vulnerability',
        severity: 20
      },
      {
        pattern: /\.transfer\s*\(/gi,
        vulnerability: 'Potential reentrancy with transfer',
        severity: 10
      },
      {
        pattern: /\.call\.value/gi,
        vulnerability: 'Potential reentrancy with call.value',
        severity: 40
      }
    ];

    // Check for known vulnerability patterns
    for (const { pattern, vulnerability, severity } of securityPatterns) {
      if (pattern.test(contractCode)) {
        vulnerabilities.push(vulnerability);
        securityScore -= severity;
      }
    }

    // Check for governance-specific vulnerabilities
    if (this.isGovernanceContract(contractCode)) {
      const govVulns = this.checkGovernanceVulnerabilities(contractCode);
      vulnerabilities.push(...govVulns);
      securityScore -= govVulns.length * 15;
    }

    // Check for proper access controls
    if (!this.hasProperAccessControls(contractCode)) {
      vulnerabilities.push('Missing or inadequate access controls');
      securityScore -= 25;
    }

    // Ensure minimum security score
    securityScore = Math.max(0, securityScore);

    // Store audit result
    const audit: SmartContractAudit = {
      contractAddress,
      codeHash: crypto.createHash('sha256').update(contractCode).digest('hex'),
      auditStatus: securityScore >= 70 ? 'approved' : 'needs_review',
      vulnerabilities,
      securityScore,
      auditedAt: new Date()
    };

    this.contractAudits.set(contractAddress, audit);

    const isValid = securityScore >= 70 && vulnerabilities.length === 0;

    console.log(`🔍 Smart contract audit completed for ${contractAddress}: Score ${securityScore}/100`);

    return { isValid, vulnerabilities, securityScore };
  }

  /**
   * Analyze governance transaction for anomalies
   */
  private async analyzeGovernanceTransaction(
    transactionHash: string,
    voterAddress: string,
    targetAddress: string,
    functionName?: string
  ): Promise<{ riskScore: number; anomalies: string[] }> {
    const anomalies: string[] = [];
    let riskScore = 0;

    // Check for rapid voting patterns (potential bot activity)
    const recentVotes = this.governanceTransactions.filter(
      tx => tx.voterAddress === voterAddress && 
      (Date.now() - tx.timestamp.getTime()) < 60000 // Last minute
    );

    if (recentVotes.length > 5) {
      anomalies.push('Rapid voting pattern detected - potential bot activity');
      riskScore += 30;
    }

    // Check for unusual voting power concentration
    const voterHistory = this.governanceTransactions.filter(
      tx => tx.voterAddress === voterAddress
    );

    if (voterHistory.length > 0) {
      const avgVotingPower = voterHistory.reduce((sum, tx) => sum + tx.votingPower, 0) / voterHistory.length;
      
      // If this voter typically has very low voting power but suddenly has high power
      if (avgVotingPower < 1000 && this.estimateVotingPower(voterAddress) > 10000) {
        anomalies.push('Unusual voting power increase detected');
        riskScore += 25;
      }
    }

    // Check for coordinated voting (same block timestamp)
    const sameBlockVotes = this.governanceTransactions.filter(
      tx => Math.abs(tx.timestamp.getTime() - Date.now()) < 15000 // Same 15-second window
    );

    if (sameBlockVotes.length > 10) {
      anomalies.push('Potential coordinated voting detected');
      riskScore += 35;
    }

    // Record governance transaction
    const govTx: GovernanceTransaction = {
      proposalId: this.extractProposalId(functionName),
      voterAddress,
      vote: this.extractVoteType(functionName),
      votingPower: this.estimateVotingPower(voterAddress),
      timestamp: new Date(),
      transactionHash,
      anomalies
    };

    this.governanceTransactions.push(govTx);

    return { riskScore, anomalies };
  }

  /**
   * Check if transaction is governance-related
   */
  private isGovernanceTransaction(functionName?: string, contractAddress?: string): boolean {
    if (!functionName) return false;

    const governanceFunctions = [
      'vote', 'propose', 'execute', 'queue', 'cancel',
      'castVote', 'propose', 'executeProposal'
    ];

    return governanceFunctions.some(fn => functionName.toLowerCase().includes(fn.toLowerCase()));
  }

  /**
   * Check if contract contains governance functionality
   */
  private isGovernanceContract(contractCode: string): boolean {
    const governancePatterns = [
      /function\s+vote\s*\(/gi,
      /function\s+propose\s*\(/gi,
      /function\s+execute\s*\(/gi,
      /Governance|Governor|Voting/gi
    ];

    return governancePatterns.some(pattern => pattern.test(contractCode));
  }

  /**
   * Check for governance-specific vulnerabilities
   */
  private checkGovernanceVulnerabilities(contractCode: string): string[] {
    const vulnerabilities: string[] = [];

    // Check for proper voting period validation
    if (!/votingPeriod|timelock/gi.test(contractCode)) {
      vulnerabilities.push('Missing voting period or timelock protection');
    }

    // Check for quorum requirements
    if (!/quorum|minimumVotes/gi.test(contractCode)) {
      vulnerabilities.push('Missing quorum requirements');
    }

    // Check for proposal threshold
    if (!/proposalThreshold|minimumTokens/gi.test(contractCode)) {
      vulnerabilities.push('Missing proposal threshold');
    }

    return vulnerabilities;
  }

  /**
   * Check for proper access controls in contract
   */
  private hasProperAccessControls(contractCode: string): boolean {
    const accessPatterns = [
      /onlyOwner|onlyAdmin/gi,
      /require\s*\(\s*msg\.sender/gi,
      /modifier\s+\w+\s*\(/gi,
      /AccessControl|Ownable/gi
    ];

    return accessPatterns.some(pattern => pattern.test(contractCode));
  }

  /**
   * Check address reputation
   */
  private checkAddressReputation(address: string): { riskScore: number; anomalies: string[] } {
    const anomalies: string[] = [];
    let riskScore = 0;

    // Check transaction frequency
    const addressTransactions = this.transactionEvents.filter(
      event => event.fromAddress === address
    );

    if (addressTransactions.length > 100) {
      anomalies.push('High transaction frequency from address');
      riskScore += 15;
    }

    // Check for previous high-risk transactions
    const highRiskTransactions = addressTransactions.filter(
      event => event.riskScore > 50
    );

    if (highRiskTransactions.length > 0) {
      anomalies.push(`Address has ${highRiskTransactions.length} previous high-risk transactions`);
      riskScore += 20;
    }

    return { riskScore, anomalies };
  }

  /**
   * Extract proposal ID from function call
   */
  private extractProposalId(functionName?: string): string {
    // Simplified extraction - in real implementation would parse call data
    return functionName ? `proposal_${crypto.randomUUID().split('-')[0]}` : 'unknown';
  }

  /**
   * Extract vote type from function call
   */
  private extractVoteType(functionName?: string): 'for' | 'against' | 'abstain' {
    if (!functionName) return 'abstain';
    
    const lowerFn = functionName.toLowerCase();
    if (lowerFn.includes('against') || lowerFn.includes('no')) return 'against';
    if (lowerFn.includes('for') || lowerFn.includes('yes')) return 'for';
    return 'abstain';
  }

  /**
   * Estimate voting power for address
   */
  private estimateVotingPower(address: string): number {
    // Simplified estimation - in real implementation would query blockchain
    const recentTxs = this.transactionEvents.filter(
      event => event.fromAddress === address
    ).length;
    
    const MAX_VOTING_POWER = 100; // Maximum voting power cap
    const VOTING_POWER_MULTIPLIER = 2; // Multiplier for transaction-based voting power
    return Math.min(MAX_VOTING_POWER, recentTxs * VOTING_POWER_MULTIPLIER); // Cap at max voting power
  }

  /**
   * Perform periodic security scan
   */
  private performSecurityScan() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    // Analyze recent transactions
    const recentTransactions = this.transactionEvents.filter(
      event => event.timestamp.getTime() > oneHourAgo
    );

    // Check for unusual patterns
    const highRiskCount = recentTransactions.filter(tx => tx.riskScore > 50).length;
    const governanceCount = recentTransactions.filter(tx => tx.isGovernance).length;

    if (highRiskCount > 10) {
      console.warn(`🚨 High number of risky transactions in the last hour: ${highRiskCount}`);
    }

    if (governanceCount > 20) {
      console.warn(`🚨 High governance activity detected: ${governanceCount} transactions`);
    }

    // Clean up old events
    this.cleanupOldEvents(24); // Keep 24 hours of history
  }

  /**
   * Get security metrics and status
   */
  getSecurityMetrics() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    const recentTransactions = this.transactionEvents.filter(
      event => event.timestamp.getTime() > oneHourAgo
    );

    const dailyTransactions = this.transactionEvents.filter(
      event => event.timestamp.getTime() > oneDayAgo
    );

    const highRiskTransactions = recentTransactions.filter(tx => tx.riskScore > 50);
    const governanceTransactions = recentTransactions.filter(tx => tx.isGovernance);

    return {
      monitoring: {
        active: this.monitoringActive,
        intervalMs: this.config.monitoringIntervalMs
      },
      transactions: {
        total: this.transactionEvents.length,
        lastHour: recentTransactions.length,
        lastDay: dailyTransactions.length,
        highRiskLastHour: highRiskTransactions.length
      },
      governance: {
        transactionsLastHour: governanceTransactions.length,
        totalGovernanceVotes: this.governanceTransactions.length
      },
      contracts: {
        totalAudited: this.contractAudits.size,
        approved: Array.from(this.contractAudits.values()).filter(a => a.auditStatus === 'approved').length,
        needsReview: Array.from(this.contractAudits.values()).filter(a => a.auditStatus === 'needs_review').length
      },
      lastUpdate: new Date().toISOString()
    };
  }

  /**
   * Get high-risk transactions
   */
  getHighRiskTransactions(minRiskScore = 50): TransactionMonitorEvent[] {
    return this.transactionEvents.filter(event => event.riskScore >= minRiskScore);
  }

  /**
   * Get contract audit results
   */
  getContractAudits(): SmartContractAudit[] {
    return Array.from(this.contractAudits.values());
  }

  /**
   * Clean up old events
   */
  private cleanupOldEvents(hoursToKeep = 24) {
    const cutoff = Date.now() - (hoursToKeep * 60 * 60 * 1000);
    
    const initialCount = this.transactionEvents.length;
    this.transactionEvents = this.transactionEvents.filter(
      event => event.timestamp.getTime() > cutoff
    );

    const govInitialCount = this.governanceTransactions.length;
    this.governanceTransactions = this.governanceTransactions.filter(
      tx => tx.timestamp.getTime() > cutoff
    );

    const removedEvents = initialCount - this.transactionEvents.length;
    const removedGovTxs = govInitialCount - this.governanceTransactions.length;

    if (removedEvents > 0 || removedGovTxs > 0) {
      console.log(`🧹 Cleaned up ${removedEvents} transaction events and ${removedGovTxs} governance transactions`);
    }
  }

  /**
   * Stop monitoring (for cleanup)
   */
  stopMonitoring() {
    this.monitoringActive = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    console.log('🔗 Web3 security monitoring stopped');
  }
}

// Default Web3 security configuration
export const defaultWeb3SecurityConfig: Web3SecurityConfig = {
  enableTransactionMonitoring: true,
  enableSmartContractValidation: true,
  maxTransactionValue: 1000, // ETH
  requireMultisigThreshold: 2,
  monitoringIntervalMs: 30000, // 30 seconds
  allowedContractAddresses: [
    // Add approved contract addresses here
  ],
  enableGovernanceAudit: true
};

export default Web3SecurityMiddleware;