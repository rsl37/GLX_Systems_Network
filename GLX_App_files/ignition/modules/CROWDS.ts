/**
 * GLX: Connect the World - Civic Networking Platform
 *
 * Copyright (c) 2025 rsl37
 * Dual-licensed under PolyForm Shield 1.0.0 OR PolyForm Noncommercial 1.0.0
 */

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * CROWDS System Deployment Module
 *
 * Deploys the complete CROWDS ecosystem:
 * 1. HFT Token (Holistically Fungible Token)
 * 2. CollateralManager
 * 3. ReputationScore
 */
const CROWDSModule = buildModule("CROWDS", (m) => {
  // Get deployment parameters
  const deployer = m.getAccount(0);

  // Deploy HFT Token
  const hft = m.contract("HFT", [deployer]);

  // Deploy CollateralManager
  const collateralManager = m.contract("CollateralManager", [hft, deployer]);

  // Deploy ReputationScore
  const reputationScore = m.contract("ReputationScore", [hft, deployer]);

  // Grant roles after deployment
  // Grant COLLATERAL_MANAGER_ROLE to CollateralManager contract
  m.call(hft, "grantRole", [
    "0x" + Buffer.from("COLLATERAL_MANAGER_ROLE").toString("hex").padStart(64, "0"),
    collateralManager
  ]);

  // Grant GOVERNANCE_ROLE to ReputationScore contract
  m.call(hft, "grantRole", [
    "0x" + Buffer.from("GOVERNANCE_ROLE").toString("hex").padStart(64, "0"),
    reputationScore
  ]);

  return {
    hft,
    collateralManager,
    reputationScore,
  };
});

export default CROWDSModule;
