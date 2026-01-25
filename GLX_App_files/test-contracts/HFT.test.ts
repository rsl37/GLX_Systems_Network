/**
 * GLX: Connect the World - Civic Networking Platform
 *
 * Copyright (c) 2025 rsl37
 * Dual-licensed under PolyForm Shield 1.0.0 OR PolyForm Noncommercial 1.0.0
 */

import { expect } from "chai";
import { ethers } from "hardhat";
import { HFT, CollateralManager, ReputationScore } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("HFT Token", function () {
  let hft: HFT;
  let collateralManager: CollateralManager;
  let reputationScore: ReputationScore;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy HFT
    const HFT = await ethers.getContractFactory("HFT");
    hft = await HFT.deploy(owner.address);
    await hft.waitForDeployment();

    // Deploy CollateralManager
    const CollateralManager = await ethers.getContractFactory("CollateralManager");
    collateralManager = await CollateralManager.deploy(await hft.getAddress(), owner.address);
    await collateralManager.waitForDeployment();

    // Deploy ReputationScore
    const ReputationScore = await ethers.getContractFactory("ReputationScore");
    reputationScore = await ReputationScore.deploy(await hft.getAddress(), owner.address);
    await reputationScore.waitForDeployment();

    // Grant roles
    const COLLATERAL_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("COLLATERAL_MANAGER_ROLE"));
    const GOVERNANCE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GOVERNANCE_ROLE"));

    await hft.grantRole(COLLATERAL_MANAGER_ROLE, await collateralManager.getAddress());
    await hft.grantRole(GOVERNANCE_ROLE, await reputationScore.getAddress());
  });

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await hft.name()).to.equal("Holistically Fungible Token");
      expect(await hft.symbol()).to.equal("HFT");
    });

    it("Should have 18 decimals", async function () {
      expect(await hft.decimals()).to.equal(18);
    });

    it("Should start with zero supply", async function () {
      expect(await hft.totalSupply()).to.equal(0);
    });

    it("Should grant admin role to deployer", async function () {
      const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
      expect(await hft.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
    });
  });

  describe("Collateral Management", function () {
    it("Should accept collateral deposits", async function () {
      const valueInCents = ethers.parseUnits("100000", 0); // $1000

      await hft.depositCollateral(user1.address, valueInCents);

      expect(await hft.totalCollateralValue()).to.equal(valueInCents);
      expect(await hft.userCollateral(user1.address)).to.equal(valueInCents);
    });

    it("Should calculate collateral ratio correctly", async function () {
      // Deposit $2000 worth of collateral
      const collateralValue = ethers.parseUnits("200000", 0);
      await hft.depositCollateral(user1.address, collateralValue);

      // Mint $1000 worth of tokens (should be 200% collateralized)
      const mintAmount = ethers.parseEther("1000");
      const civicContribution = 100;

      await hft.mintForCivicParticipation(user1.address, mintAmount, civicContribution);

      const ratio = await hft.getCurrentCollateralRatio();
      expect(ratio).to.equal(200); // 200% collateralization
    });
  });

  describe("Token Minting", function () {
    beforeEach(async function () {
      // Deposit sufficient collateral for minting
      const collateralValue = ethers.parseUnits("300000", 0); // $3000
      await hft.depositCollateral(user1.address, collateralValue);
    });

    it("Should mint tokens for civic participation", async function () {
      const mintAmount = ethers.parseEther("100");
      const civicContribution = 50;

      await hft.mintForCivicParticipation(user1.address, mintAmount, civicContribution);

      expect(await hft.balanceOf(user1.address)).to.equal(mintAmount);
      expect(await hft.civicContributions(user1.address)).to.equal(civicContribution);
    });

    it("Should enforce collateral requirements", async function () {
      // Try to mint more than collateral allows
      const excessiveAmount = ethers.parseEther("100000"); // $100,000
      const civicContribution = 50;

      await expect(
        hft.mintForCivicParticipation(user1.address, excessiveAmount, civicContribution)
      ).to.be.revertedWith("HFT: insufficient collateral");
    });

    it("Should enforce mint cooldown", async function () {
      const mintAmount = ethers.parseEther("100");
      const civicContribution = 50;

      // First mint succeeds
      await hft.mintForCivicParticipation(user1.address, mintAmount, civicContribution);

      // Immediate second mint fails
      await expect(
        hft.mintForCivicParticipation(user1.address, mintAmount, civicContribution)
      ).to.be.revertedWith("HFT: mint cooldown active");
    });

    it("Should not exceed max supply", async function () {
      const maxSupply = await hft.MAX_SUPPLY();
      const excessiveAmount = maxSupply + ethers.parseEther("1");

      await expect(
        hft.mintForCivicParticipation(user1.address, excessiveAmount, 100)
      ).to.be.revertedWith("HFT: exceeds max supply");
    });
  });

  describe("Crisis Management", function () {
    it("Should update crisis level", async function () {
      const CRISIS_RESPONDER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("CRISIS_RESPONDER_ROLE"));

      // Owner has crisis responder role by default
      await hft.updateCrisisLevel(2); // MEDIUM

      expect(await hft.currentCrisisLevel()).to.equal(2);
    });

    it("Should auto-pause on critical crisis", async function () {
      await hft.updateCrisisLevel(4); // CRITICAL

      expect(await hft.paused()).to.be.true;
    });

    it("Should prevent transfers when paused", async function () {
      // Mint some tokens first
      const collateralValue = ethers.parseUnits("300000", 0);
      await hft.depositCollateral(user1.address, collateralValue);
      await hft.mintForCivicParticipation(user1.address, ethers.parseEther("100"), 50);

      // Trigger critical crisis (auto-pause)
      await hft.updateCrisisLevel(4);

      // Try to transfer - should fail
      await expect(
        hft.connect(user1).transfer(user2.address, ethers.parseEther("10"))
      ).to.be.reverted;
    });
  });

  describe("Reputation Integration", function () {
    it("Should update user reputation", async function () {
      const newScore = 500;

      await hft.updateReputation(user1.address, newScore);

      expect(await hft.reputationScore(user1.address)).to.equal(newScore);
    });
  });

  describe("Access Control", function () {
    it("Should prevent unauthorized minting", async function () {
      const mintAmount = ethers.parseEther("100");

      await expect(
        hft.connect(user1).mintForCivicParticipation(user1.address, mintAmount, 50)
      ).to.be.reverted;
    });

    it("Should prevent unauthorized pause", async function () {
      await expect(
        hft.connect(user1).pause()
      ).to.be.reverted;
    });
  });
});
