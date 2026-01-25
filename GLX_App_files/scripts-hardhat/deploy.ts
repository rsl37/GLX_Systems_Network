/**
 * GLX: Connect the World - Civic Networking Platform
 *
 * Copyright (c) 2025 rsl37
 * Dual-licensed under PolyForm Shield 1.0.0 OR PolyForm Noncommercial 1.0.0
 */

import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying CROWDS System...\n");

  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Deploy HFT Token
  console.log("🪙 Deploying HFT Token...");
  const HFT = await ethers.getContractFactory("HFT");
  const hft = await HFT.deploy(deployer.address);
  await hft.waitForDeployment();
  const hftAddress = await hft.getAddress();
  console.log("✅ HFT Token deployed to:", hftAddress, "\n");

  // Deploy CollateralManager
  console.log("🏦 Deploying CollateralManager...");
  const CollateralManager = await ethers.getContractFactory("CollateralManager");
  const collateralManager = await CollateralManager.deploy(hftAddress, deployer.address);
  await collateralManager.waitForDeployment();
  const collateralManagerAddress = await collateralManager.getAddress();
  console.log("✅ CollateralManager deployed to:", collateralManagerAddress, "\n");

  // Deploy ReputationScore
  console.log("⭐ Deploying ReputationScore...");
  const ReputationScore = await ethers.getContractFactory("ReputationScore");
  const reputationScore = await ReputationScore.deploy(hftAddress, deployer.address);
  await reputationScore.waitForDeployment();
  const reputationScoreAddress = await reputationScore.getAddress();
  console.log("✅ ReputationScore deployed to:", reputationScoreAddress, "\n");

  // Grant roles
  console.log("🔐 Granting contract roles...");

  const COLLATERAL_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("COLLATERAL_MANAGER_ROLE"));
  const GOVERNANCE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GOVERNANCE_ROLE"));

  const tx1 = await hft.grantRole(COLLATERAL_MANAGER_ROLE, collateralManagerAddress);
  await tx1.wait();
  console.log("✅ Granted COLLATERAL_MANAGER_ROLE to CollateralManager");

  const tx2 = await hft.grantRole(GOVERNANCE_ROLE, reputationScoreAddress);
  await tx2.wait();
  console.log("✅ Granted GOVERNANCE_ROLE to ReputationScore\n");

  // Summary
  console.log("🎉 Deployment Complete!\n");
  console.log("📋 Contract Addresses:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("HFT Token:          ", hftAddress);
  console.log("CollateralManager:  ", collateralManagerAddress);
  console.log("ReputationScore:    ", reputationScoreAddress);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Save deployment info
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      HFT: hftAddress,
      CollateralManager: collateralManagerAddress,
      ReputationScore: reputationScoreAddress,
    },
  };

  console.log("💾 Deployment Info:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
