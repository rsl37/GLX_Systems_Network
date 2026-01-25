// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title HFT - Holistically Fungible Token
 * @notice CROWDS stablecoin implementing holistic crisis-aware architecture
 * @dev Implements ERC20 with additional governance, reputation, and crisis response features
 *
 * Core Features:
 * - Over-collateralized stablecoin (150-200% backing requirement)
 * - Civic participation-based minting
 * - Reputation-weighted governance
 * - Crisis detection integration
 * - Emergency pause mechanism
 * - Multi-layer holistic architecture
 */
contract HFT is ERC20, ERC20Burnable, ERC20Pausable, AccessControl, ReentrancyGuard {
    // Role definitions
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant COLLATERAL_MANAGER_ROLE = keccak256("COLLATERAL_MANAGER_ROLE");
    bytes32 public constant CRISIS_RESPONDER_ROLE = keccak256("CRISIS_RESPONDER_ROLE");
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");

    // Token economics
    uint256 public constant INITIAL_SUPPLY = 0; // No initial supply - minted through participation
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1 billion HFT max
    uint256 public constant MIN_COLLATERAL_RATIO = 150; // 150% minimum collateralization
    uint256 public constant TARGET_COLLATERAL_RATIO = 200; // 200% target collateralization

    // Crisis detection state
    enum CrisisLevel { NONE, LOW, MEDIUM, HIGH, CRITICAL }
    CrisisLevel public currentCrisisLevel;
    uint256 public lastCrisisUpdate;

    // Collateral tracking
    uint256 public totalCollateralValue; // In USD cents (to avoid decimals)
    mapping(address => uint256) public userCollateral;

    // Reputation integration
    mapping(address => uint256) public reputationScore;
    mapping(address => uint256) public civicContributions;
    mapping(address => uint256) public lastMintTimestamp;
    uint256 public constant MINT_COOLDOWN = 1 hours;

    // Events
    event CollateralDeposited(address indexed user, uint256 amount, uint256 timestamp);
    event CollateralWithdrawn(address indexed user, uint256 amount, uint256 timestamp);
    event CrisisLevelUpdated(CrisisLevel oldLevel, CrisisLevel newLevel, uint256 timestamp);
    event TokensMinted(address indexed to, uint256 amount, uint256 civicContribution, uint256 timestamp);
    event ReputationUpdated(address indexed user, uint256 oldScore, uint256 newScore, uint256 timestamp);
    event EmergencyPause(address indexed pauser, string reason, uint256 timestamp);
    event EmergencyUnpause(address indexed unpauser, uint256 timestamp);

    /**
     * @notice Constructor initializes the HFT token
     * @param initialAdmin Address that will receive all initial roles
     */
    constructor(address initialAdmin) ERC20("Holistically Fungible Token", "HFT") {
        require(initialAdmin != address(0), "HFT: zero address admin");

        // Grant roles to initial admin
        _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);
        _grantRole(MINTER_ROLE, initialAdmin);
        _grantRole(PAUSER_ROLE, initialAdmin);
        _grantRole(COLLATERAL_MANAGER_ROLE, initialAdmin);
        _grantRole(CRISIS_RESPONDER_ROLE, initialAdmin);
        _grantRole(GOVERNANCE_ROLE, initialAdmin);

        currentCrisisLevel = CrisisLevel.NONE;
        lastCrisisUpdate = block.timestamp;
    }

    /**
     * @notice Mint tokens based on civic participation
     * @param to Address to receive minted tokens
     * @param amount Amount of tokens to mint
     * @param civicContribution Civic contribution score (verified off-chain)
     */
    function mintForCivicParticipation(
        address to,
        uint256 amount,
        uint256 civicContribution
    ) external onlyRole(MINTER_ROLE) nonReentrant whenNotPaused {
        require(to != address(0), "HFT: mint to zero address");
        require(amount > 0, "HFT: zero amount");
        require(totalSupply() + amount <= MAX_SUPPLY, "HFT: exceeds max supply");
        require(
            block.timestamp >= lastMintTimestamp[to] + MINT_COOLDOWN,
            "HFT: mint cooldown active"
        );

        // Check collateralization ratio
        require(isCollateralSufficient(amount), "HFT: insufficient collateral");

        // Update civic contributions and reputation
        civicContributions[to] += civicContribution;
        lastMintTimestamp[to] = block.timestamp;

        _mint(to, amount);
        emit TokensMinted(to, amount, civicContribution, block.timestamp);
    }

    /**
     * @notice Deposit collateral (managed by CollateralManager contract)
     * @param user User depositing collateral
     * @param valueInCents USD value of collateral in cents
     */
    function depositCollateral(
        address user,
        uint256 valueInCents
    ) external onlyRole(COLLATERAL_MANAGER_ROLE) nonReentrant {
        require(user != address(0), "HFT: zero address");
        require(valueInCents > 0, "HFT: zero value");

        userCollateral[user] += valueInCents;
        totalCollateralValue += valueInCents;

        emit CollateralDeposited(user, valueInCents, block.timestamp);
    }

    /**
     * @notice Withdraw collateral (with safety checks)
     * @param user User withdrawing collateral
     * @param valueInCents USD value to withdraw in cents
     */
    function withdrawCollateral(
        address user,
        uint256 valueInCents
    ) external onlyRole(COLLATERAL_MANAGER_ROLE) nonReentrant {
        require(user != address(0), "HFT: zero address");
        require(valueInCents > 0, "HFT: zero value");
        require(userCollateral[user] >= valueInCents, "HFT: insufficient user collateral");

        // Check if withdrawal maintains minimum collateralization
        uint256 newTotalCollateral = totalCollateralValue - valueInCents;
        require(
            isCollateralRatioValid(newTotalCollateral),
            "HFT: withdrawal violates collateral ratio"
        );

        userCollateral[user] -= valueInCents;
        totalCollateralValue -= valueInCents;

        emit CollateralWithdrawn(user, valueInCents, block.timestamp);
    }

    /**
     * @notice Update crisis level (called by crisis detection oracle)
     * @param newLevel New crisis level
     */
    function updateCrisisLevel(
        CrisisLevel newLevel
    ) external onlyRole(CRISIS_RESPONDER_ROLE) {
        require(newLevel != currentCrisisLevel, "HFT: same crisis level");

        CrisisLevel oldLevel = currentCrisisLevel;
        currentCrisisLevel = newLevel;
        lastCrisisUpdate = block.timestamp;

        emit CrisisLevelUpdated(oldLevel, newLevel, block.timestamp);

        // Auto-pause on critical crisis
        if (newLevel == CrisisLevel.CRITICAL) {
            _pause();
            emit EmergencyPause(msg.sender, "Critical crisis detected", block.timestamp);
        }
    }

    /**
     * @notice Update user reputation score
     * @param user User address
     * @param newScore New reputation score
     */
    function updateReputation(
        address user,
        uint256 newScore
    ) external onlyRole(GOVERNANCE_ROLE) {
        require(user != address(0), "HFT: zero address");

        uint256 oldScore = reputationScore[user];
        reputationScore[user] = newScore;

        emit ReputationUpdated(user, oldScore, newScore, block.timestamp);
    }

    /**
     * @notice Pause all token operations (emergency use)
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
        emit EmergencyPause(msg.sender, "Manual pause", block.timestamp);
    }

    /**
     * @notice Unpause token operations
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
        emit EmergencyUnpause(msg.sender, block.timestamp);
    }

    /**
     * @notice Check if collateral is sufficient for new mint
     * @param mintAmount Amount of tokens to mint
     * @return bool True if collateral is sufficient
     */
    function isCollateralSufficient(uint256 mintAmount) public view returns (bool) {
        uint256 newTotalSupply = totalSupply() + mintAmount;
        // totalCollateralValue is in cents, totalSupply is in wei
        // Assuming 1 HFT = $1, convert supply to cents for comparison
        uint256 supplyInCents = (newTotalSupply * 100) / 10**18;

        return (totalCollateralValue * 100) >= (supplyInCents * MIN_COLLATERAL_RATIO);
    }

    /**
     * @notice Check if collateral ratio is valid with new total
     * @param newCollateralValue New total collateral value in cents
     * @return bool True if ratio is valid
     */
    function isCollateralRatioValid(uint256 newCollateralValue) public view returns (bool) {
        if (totalSupply() == 0) return true;

        uint256 supplyInCents = (totalSupply() * 100) / 10**18;
        return (newCollateralValue * 100) >= (supplyInCents * MIN_COLLATERAL_RATIO);
    }

    /**
     * @notice Get current collateralization ratio
     * @return ratio Current ratio (e.g., 200 = 200%)
     */
    function getCurrentCollateralRatio() external view returns (uint256 ratio) {
        if (totalSupply() == 0) return 0;

        uint256 supplyInCents = (totalSupply() * 100) / 10**18;
        if (supplyInCents == 0) return 0;

        return (totalCollateralValue * 100) / supplyInCents;
    }

    /**
     * @notice Get user's civic contribution score
     * @param user User address
     * @return contribution Total civic contribution
     */
    function getCivicContribution(address user) external view returns (uint256 contribution) {
        return civicContributions[user];
    }

    /**
     * @notice Get user's reputation score
     * @param user User address
     * @return score Reputation score
     */
    function getReputationScore(address user) external view returns (uint256 score) {
        return reputationScore[user];
    }

    // Required overrides for multiple inheritance
    function _update(
        address from,
        address to,
        uint256 value
    ) internal override(ERC20, ERC20Pausable) {
        super._update(from, to, value);
    }
}
