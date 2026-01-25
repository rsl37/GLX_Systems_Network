// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./HFT.sol";

/**
 * @title CollateralManager
 * @notice Manages multi-asset collateral backing for HFT stablecoin
 * @dev Supports precious metals, energy credits, agricultural commodities, and crypto assets
 *
 * Collateral Types:
 * - Precious Metals (Gold, Silver, Platinum)
 * - Energy Credits (Renewable energy certificates)
 * - Agricultural Commodities (Grain, Livestock credits)
 * - Crypto Assets (ETH, WBTC, stablecoins)
 * - Real Estate Tokens
 */
contract CollateralManager is AccessControl, ReentrancyGuard, Pausable {
    // Role definitions
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant LIQUIDATOR_ROLE = keccak256("LIQUIDATOR_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // HFT token reference
    HFT public immutable hftToken;

    // Collateral types
    enum CollateralType {
        PRECIOUS_METAL,
        ENERGY_CREDIT,
        AGRICULTURAL,
        CRYPTO_ASSET,
        REAL_ESTATE,
        OTHER
    }

    // Collateral asset structure
    struct CollateralAsset {
        string name;
        CollateralType assetType;
        address tokenAddress; // ERC20 token address (0x0 for non-tokenized)
        uint256 priceInCents; // Current price in USD cents
        uint256 lastPriceUpdate;
        uint256 totalDeposited; // Total amount deposited
        uint256 totalValueCents; // Total value in USD cents
        bool isActive;
        uint256 haircut; // Discount percentage (e.g., 10 = 10% discount)
    }

    // User collateral deposits
    struct UserDeposit {
        uint256 amount;
        uint256 depositTimestamp;
        uint256 valueAtDepositCents;
    }

    // Storage
    mapping(bytes32 => CollateralAsset) public collateralAssets;
    mapping(address => mapping(bytes32 => UserDeposit)) public userDeposits;
    bytes32[] public assetIds;

    // Emergency withdrawal limit
    uint256 public constant EMERGENCY_WITHDRAWAL_LIMIT_PERCENT = 20; // Max 20% per day
    mapping(address => uint256) public lastWithdrawalTimestamp;
    mapping(address => uint256) public dailyWithdrawalAmount;

    // Events
    event AssetAdded(
        bytes32 indexed assetId,
        string name,
        CollateralType assetType,
        uint256 timestamp
    );
    event AssetPriceUpdated(
        bytes32 indexed assetId,
        uint256 oldPrice,
        uint256 newPrice,
        uint256 timestamp
    );
    event CollateralDeposited(
        address indexed user,
        bytes32 indexed assetId,
        uint256 amount,
        uint256 valueInCents,
        uint256 timestamp
    );
    event CollateralWithdrawn(
        address indexed user,
        bytes32 indexed assetId,
        uint256 amount,
        uint256 valueInCents,
        uint256 timestamp
    );
    event AssetLiquidated(
        bytes32 indexed assetId,
        uint256 amount,
        uint256 valueInCents,
        uint256 timestamp
    );

    /**
     * @notice Constructor
     * @param _hftToken Address of HFT token contract
     * @param initialAdmin Address of initial admin
     */
    constructor(address _hftToken, address initialAdmin) {
        require(_hftToken != address(0), "CollateralManager: zero HFT address");
        require(initialAdmin != address(0), "CollateralManager: zero admin address");

        hftToken = HFT(_hftToken);

        _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);
        _grantRole(ADMIN_ROLE, initialAdmin);
        _grantRole(ORACLE_ROLE, initialAdmin);
        _grantRole(LIQUIDATOR_ROLE, initialAdmin);

        // Initialize default collateral assets
        _addDefaultAssets();
    }

    /**
     * @notice Add a new collateral asset type
     * @param assetId Unique identifier for the asset
     * @param name Asset name
     * @param assetType Type of collateral
     * @param tokenAddress ERC20 token address (0x0 if not tokenized)
     * @param priceInCents Initial price in USD cents
     * @param haircut Discount percentage (e.g., 10 = 10%)
     */
    function addCollateralAsset(
        bytes32 assetId,
        string memory name,
        CollateralType assetType,
        address tokenAddress,
        uint256 priceInCents,
        uint256 haircut
    ) external onlyRole(ADMIN_ROLE) {
        require(assetId != bytes32(0), "CollateralManager: zero asset ID");
        require(!collateralAssets[assetId].isActive, "CollateralManager: asset exists");
        require(priceInCents > 0, "CollateralManager: zero price");
        require(haircut <= 100, "CollateralManager: invalid haircut");

        collateralAssets[assetId] = CollateralAsset({
            name: name,
            assetType: assetType,
            tokenAddress: tokenAddress,
            priceInCents: priceInCents,
            lastPriceUpdate: block.timestamp,
            totalDeposited: 0,
            totalValueCents: 0,
            isActive: true,
            haircut: haircut
        });

        assetIds.push(assetId);

        emit AssetAdded(assetId, name, assetType, block.timestamp);
    }

    /**
     * @notice Update asset price (oracle function)
     * @param assetId Asset identifier
     * @param newPriceInCents New price in USD cents
     */
    function updateAssetPrice(
        bytes32 assetId,
        uint256 newPriceInCents
    ) external onlyRole(ORACLE_ROLE) {
        require(collateralAssets[assetId].isActive, "CollateralManager: asset not active");
        require(newPriceInCents > 0, "CollateralManager: zero price");

        uint256 oldPrice = collateralAssets[assetId].priceInCents;
        collateralAssets[assetId].priceInCents = newPriceInCents;
        collateralAssets[assetId].lastPriceUpdate = block.timestamp;

        // Update total value
        uint256 totalDeposited = collateralAssets[assetId].totalDeposited;
        uint256 adjustedPrice = (newPriceInCents * (100 - collateralAssets[assetId].haircut)) / 100;
        collateralAssets[assetId].totalValueCents = (totalDeposited * adjustedPrice) / 10**18;

        emit AssetPriceUpdated(assetId, oldPrice, newPriceInCents, block.timestamp);
    }

    /**
     * @notice Deposit collateral
     * @param assetId Asset identifier
     * @param amount Amount to deposit (in asset's base units)
     */
    function depositCollateral(
        bytes32 assetId,
        uint256 amount
    ) external nonReentrant whenNotPaused {
        require(collateralAssets[assetId].isActive, "CollateralManager: asset not active");
        require(amount > 0, "CollateralManager: zero amount");

        CollateralAsset storage asset = collateralAssets[assetId];

        // Calculate value with haircut applied
        uint256 adjustedPrice = (asset.priceInCents * (100 - asset.haircut)) / 100;
        uint256 valueInCents = (amount * adjustedPrice) / 10**18;

        // Update user deposit
        UserDeposit storage userDeposit = userDeposits[msg.sender][assetId];
        userDeposit.amount += amount;
        userDeposit.depositTimestamp = block.timestamp;
        userDeposit.valueAtDepositCents += valueInCents;

        // Update asset totals
        asset.totalDeposited += amount;
        asset.totalValueCents += valueInCents;

        // Notify HFT token of collateral deposit
        hftToken.depositCollateral(msg.sender, valueInCents);

        emit CollateralDeposited(msg.sender, assetId, amount, valueInCents, block.timestamp);
    }

    /**
     * @notice Withdraw collateral
     * @param assetId Asset identifier
     * @param amount Amount to withdraw
     */
    function withdrawCollateral(
        bytes32 assetId,
        uint256 amount
    ) external nonReentrant whenNotPaused {
        require(collateralAssets[assetId].isActive, "CollateralManager: asset not active");
        require(amount > 0, "CollateralManager: zero amount");

        UserDeposit storage userDeposit = userDeposits[msg.sender][assetId];
        require(userDeposit.amount >= amount, "CollateralManager: insufficient balance");

        // Check daily withdrawal limit
        _checkWithdrawalLimit(msg.sender, amount);

        CollateralAsset storage asset = collateralAssets[assetId];

        // Calculate value with current price and haircut
        uint256 adjustedPrice = (asset.priceInCents * (100 - asset.haircut)) / 100;
        uint256 valueInCents = (amount * adjustedPrice) / 10**18;

        // Notify HFT token to check if withdrawal maintains collateral ratio
        hftToken.withdrawCollateral(msg.sender, valueInCents);

        // Update user deposit
        userDeposit.amount -= amount;
        userDeposit.valueAtDepositCents -= valueInCents;

        // Update asset totals
        asset.totalDeposited -= amount;
        asset.totalValueCents -= valueInCents;

        emit CollateralWithdrawn(msg.sender, assetId, amount, valueInCents, block.timestamp);
    }

    /**
     * @notice Get total collateral value across all assets
     * @return totalValue Total value in USD cents
     */
    function getTotalCollateralValue() external view returns (uint256 totalValue) {
        for (uint256 i = 0; i < assetIds.length; i++) {
            CollateralAsset storage asset = collateralAssets[assetIds[i]];
            if (asset.isActive) {
                totalValue += asset.totalValueCents;
            }
        }
        return totalValue;
    }

    /**
     * @notice Get user's collateral value for specific asset
     * @param user User address
     * @param assetId Asset identifier
     * @return amount User's deposit amount
     * @return valueInCents Current value in USD cents
     */
    function getUserCollateral(
        address user,
        bytes32 assetId
    ) external view returns (uint256 amount, uint256 valueInCents) {
        UserDeposit storage userDeposit = userDeposits[user][assetId];
        CollateralAsset storage asset = collateralAssets[assetId];

        amount = userDeposit.amount;

        if (amount > 0 && asset.isActive) {
            uint256 adjustedPrice = (asset.priceInCents * (100 - asset.haircut)) / 100;
            valueInCents = (amount * adjustedPrice) / 10**18;
        } else {
            valueInCents = 0;
        }

        return (amount, valueInCents);
    }

    /**
     * @notice Get list of all supported assets
     * @return ids Array of asset IDs
     */
    function getSupportedAssets() external view returns (bytes32[] memory ids) {
        return assetIds;
    }

    /**
     * @notice Pause contract (emergency)
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause contract
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Check daily withdrawal limit
     */
    function _checkWithdrawalLimit(address user, uint256 amount) private {
        // Reset daily counter if 24 hours passed
        if (block.timestamp >= lastWithdrawalTimestamp[user] + 1 days) {
            dailyWithdrawalAmount[user] = 0;
            lastWithdrawalTimestamp[user] = block.timestamp;
        }

        // Check limit
        uint256 userTotalValue = 0;
        for (uint256 i = 0; i < assetIds.length; i++) {
            UserDeposit storage deposit = userDeposits[user][assetIds[i]];
            userTotalValue += deposit.valueAtDepositCents;
        }

        uint256 maxDaily = (userTotalValue * EMERGENCY_WITHDRAWAL_LIMIT_PERCENT) / 100;
        require(
            dailyWithdrawalAmount[user] + amount <= maxDaily,
            "CollateralManager: daily limit exceeded"
        );

        dailyWithdrawalAmount[user] += amount;
    }

    /**
     * @dev Initialize default collateral assets
     */
    function _addDefaultAssets() private {
        // Gold (tokenized)
        bytes32 goldId = keccak256("GOLD");
        collateralAssets[goldId] = CollateralAsset({
            name: "Tokenized Gold",
            assetType: CollateralType.PRECIOUS_METAL,
            tokenAddress: address(0), // To be set when token deployed
            priceInCents: 200000, // $2000 per oz
            lastPriceUpdate: block.timestamp,
            totalDeposited: 0,
            totalValueCents: 0,
            isActive: true,
            haircut: 10 // 10% haircut
        });
        assetIds.push(goldId);

        // Renewable Energy Credits
        bytes32 recId = keccak256("REC");
        collateralAssets[recId] = CollateralAsset({
            name: "Renewable Energy Credits",
            assetType: CollateralType.ENERGY_CREDIT,
            tokenAddress: address(0),
            priceInCents: 5000, // $50 per credit
            lastPriceUpdate: block.timestamp,
            totalDeposited: 0,
            totalValueCents: 0,
            isActive: true,
            haircut: 15 // 15% haircut
        });
        assetIds.push(recId);
    }
}
