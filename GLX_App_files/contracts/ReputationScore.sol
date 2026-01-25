// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./HFT.sol";

/**
 * @title ReputationScore
 * @notice On-chain reputation system for civic participation and governance
 * @dev Integrates with HFT token for minting privileges and governance weight
 *
 * Reputation Components:
 * - Civic participation score
 * - Task completion rate
 * - Community endorsements
 * - Crisis response contributions
 * - Governance participation
 */
contract ReputationScore is AccessControl, ReentrancyGuard {
    // Role definitions
    bytes32 public constant SCORER_ROLE = keccak256("SCORER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // HFT token reference
    HFT public immutable hftToken;

    // Reputation metrics
    struct ReputationMetrics {
        uint256 civicScore; // 0-1000
        uint256 taskCompletionRate; // 0-100 (percentage)
        uint256 totalTasksCompleted;
        uint256 totalTasksAssigned;
        uint256 endorsements; // Community endorsements count
        uint256 crisisContributions; // Crisis response participation
        uint256 governanceVotes; // Number of governance votes cast
        uint256 lastUpdated;
        bool isVerified; // KYC verified status
    }

    // Task types
    enum TaskType {
        CIVIC_HELP,
        EMERGENCY_RESPONSE,
        COMMUNITY_SERVICE,
        INFRASTRUCTURE,
        GOVERNANCE,
        EDUCATION,
        HEALTHCARE,
        ENVIRONMENTAL
    }

    // Task completion record
    struct TaskRecord {
        TaskType taskType;
        uint256 timestamp;
        uint256 scoreAwarded;
        address verifier;
        bool verified;
    }

    // Endorsement record
    struct Endorsement {
        address endorser;
        uint256 timestamp;
        string comment;
        uint256 weight; // Based on endorser's reputation
    }

    // Storage
    mapping(address => ReputationMetrics) public userReputation;
    mapping(address => TaskRecord[]) public userTasks;
    mapping(address => Endorsement[]) public userEndorsements;
    mapping(address => mapping(address => bool)) public hasEndorsed;

    // Configuration
    uint256 public constant MAX_CIVIC_SCORE = 1000;
    uint256 public constant MIN_ENDORSEMENT_REP = 100; // Min rep to endorse
    uint256 public constant TASK_DECAY_PERIOD = 90 days; // Reputation decay
    uint256 public constant GOVERNANCE_WEIGHT_MULTIPLIER = 2; // 2x weight for governance

    // Events
    event ReputationUpdated(
        address indexed user,
        uint256 oldScore,
        uint256 newScore,
        uint256 timestamp
    );
    event TaskCompleted(
        address indexed user,
        TaskType taskType,
        uint256 scoreAwarded,
        uint256 timestamp
    );
    event EndorsementReceived(
        address indexed user,
        address indexed endorser,
        uint256 weight,
        uint256 timestamp
    );
    event UserVerified(address indexed user, uint256 timestamp);

    /**
     * @notice Constructor
     * @param _hftToken Address of HFT token contract
     * @param initialAdmin Address of initial admin
     */
    constructor(address _hftToken, address initialAdmin) {
        require(_hftToken != address(0), "ReputationScore: zero HFT address");
        require(initialAdmin != address(0), "ReputationScore: zero admin");

        hftToken = HFT(_hftToken);

        _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);
        _grantRole(ADMIN_ROLE, initialAdmin);
        _grantRole(SCORER_ROLE, initialAdmin);
    }

    /**
     * @notice Record task completion
     * @param user User who completed the task
     * @param taskType Type of task completed
     * @param scoreAwarded Score to award (0-100)
     */
    function recordTaskCompletion(
        address user,
        TaskType taskType,
        uint256 scoreAwarded
    ) external onlyRole(SCORER_ROLE) nonReentrant {
        require(user != address(0), "ReputationScore: zero address");
        require(scoreAwarded <= 100, "ReputationScore: invalid score");

        ReputationMetrics storage metrics = userReputation[user];
        uint256 oldScore = metrics.civicScore;

        // Record task
        userTasks[user].push(TaskRecord({
            taskType: taskType,
            timestamp: block.timestamp,
            scoreAwarded: scoreAwarded,
            verifier: msg.sender,
            verified: true
        }));

        // Update metrics
        metrics.totalTasksCompleted++;
        metrics.totalTasksAssigned++;
        metrics.lastUpdated = block.timestamp;

        // Calculate new civic score (weighted average)
        uint256 newScore = _calculateCivicScore(user, scoreAwarded, taskType);
        metrics.civicScore = newScore;

        // Update task completion rate
        metrics.taskCompletionRate = (metrics.totalTasksCompleted * 100) / metrics.totalTasksAssigned;

        // Update crisis contributions if applicable
        if (taskType == TaskType.EMERGENCY_RESPONSE) {
            metrics.crisisContributions++;
        }

        // Update HFT token with new reputation
        hftToken.updateReputation(user, newScore);

        emit TaskCompleted(user, taskType, scoreAwarded, block.timestamp);
        emit ReputationUpdated(user, oldScore, newScore, block.timestamp);
    }

    /**
     * @notice Endorse another user
     * @param user User to endorse
     * @param comment Endorsement comment
     */
    function endorseUser(
        address user,
        string calldata comment
    ) external nonReentrant {
        require(user != address(0), "ReputationScore: zero address");
        require(user != msg.sender, "ReputationScore: cannot self-endorse");
        require(!hasEndorsed[msg.sender][user], "ReputationScore: already endorsed");

        ReputationMetrics storage endorserMetrics = userReputation[msg.sender];
        require(
            endorserMetrics.civicScore >= MIN_ENDORSEMENT_REP,
            "ReputationScore: insufficient reputation to endorse"
        );

        // Calculate endorsement weight based on endorser's reputation
        uint256 weight = endorserMetrics.civicScore / 100;

        // Record endorsement
        userEndorsements[user].push(Endorsement({
            endorser: msg.sender,
            timestamp: block.timestamp,
            comment: comment,
            weight: weight
        }));

        hasEndorsed[msg.sender][user] = true;

        // Update user's endorsement count
        ReputationMetrics storage userMetrics = userReputation[user];
        uint256 oldScore = userMetrics.civicScore;
        userMetrics.endorsements++;

        // Boost civic score based on endorsement weight
        uint256 scoreBoost = weight / 10; // 10% of weight
        if (userMetrics.civicScore + scoreBoost <= MAX_CIVIC_SCORE) {
            userMetrics.civicScore += scoreBoost;
        } else {
            userMetrics.civicScore = MAX_CIVIC_SCORE;
        }

        userMetrics.lastUpdated = block.timestamp;

        // Update HFT token
        hftToken.updateReputation(user, userMetrics.civicScore);

        emit EndorsementReceived(user, msg.sender, weight, block.timestamp);
        emit ReputationUpdated(user, oldScore, userMetrics.civicScore, block.timestamp);
    }

    /**
     * @notice Record governance vote participation
     * @param user User who voted
     */
    function recordGovernanceVote(address user) external onlyRole(SCORER_ROLE) {
        require(user != address(0), "ReputationScore: zero address");

        ReputationMetrics storage metrics = userReputation[user];
        uint256 oldScore = metrics.civicScore;

        metrics.governanceVotes++;
        metrics.lastUpdated = block.timestamp;

        // Award governance participation score
        uint256 scoreBoost = 5; // 5 points per vote
        if (metrics.civicScore + scoreBoost <= MAX_CIVIC_SCORE) {
            metrics.civicScore += scoreBoost;
        } else {
            metrics.civicScore = MAX_CIVIC_SCORE;
        }

        // Update HFT token
        hftToken.updateReputation(user, metrics.civicScore);

        emit ReputationUpdated(user, oldScore, metrics.civicScore, block.timestamp);
    }

    /**
     * @notice Verify user (KYC)
     * @param user User to verify
     */
    function verifyUser(address user) external onlyRole(ADMIN_ROLE) {
        require(user != address(0), "ReputationScore: zero address");

        userReputation[user].isVerified = true;
        emit UserVerified(user, block.timestamp);
    }

    /**
     * @notice Get user's complete reputation metrics
     * @param user User address
     * @return metrics Complete reputation metrics
     */
    function getReputation(address user) external view returns (ReputationMetrics memory metrics) {
        return userReputation[user];
    }

    /**
     * @notice Get user's governance voting weight
     * @param user User address
     * @return weight Voting weight (reputation-based)
     */
    function getGovernanceWeight(address user) external view returns (uint256 weight) {
        ReputationMetrics storage metrics = userReputation[user];

        if (!metrics.isVerified) {
            return 0; // Unverified users cannot vote
        }

        // Base weight is civic score
        weight = metrics.civicScore;

        // Boost for governance participation
        if (metrics.governanceVotes > 0) {
            weight += (metrics.governanceVotes * GOVERNANCE_WEIGHT_MULTIPLIER);
        }

        // Boost for task completion rate
        weight += metrics.taskCompletionRate;

        // Boost for endorsements
        weight += (metrics.endorsements * 10);

        return weight;
    }

    /**
     * @notice Get user's task history count
     * @param user User address
     * @return count Number of tasks completed
     */
    function getTaskCount(address user) external view returns (uint256 count) {
        return userTasks[user].length;
    }

    /**
     * @notice Get user's endorsement count
     * @param user User address
     * @return count Number of endorsements received
     */
    function getEndorsementCount(address user) external view returns (uint256 count) {
        return userEndorsements[user].length;
    }

    /**
     * @notice Check if user is verified
     * @param user User address
     * @return verified True if verified
     */
    function isUserVerified(address user) external view returns (bool verified) {
        return userReputation[user].isVerified;
    }

    /**
     * @dev Calculate new civic score with decay and weighting
     */
    function _calculateCivicScore(
        address user,
        uint256 newScore,
        TaskType taskType
    ) private view returns (uint256) {
        ReputationMetrics storage metrics = userReputation[user];
        uint256 currentScore = metrics.civicScore;

        // Apply time decay if needed
        if (block.timestamp > metrics.lastUpdated + TASK_DECAY_PERIOD) {
            uint256 periodsElapsed = (block.timestamp - metrics.lastUpdated) / TASK_DECAY_PERIOD;
            uint256 decay = currentScore * (periodsElapsed * 5) / 100; // 5% per period
            currentScore = currentScore > decay ? currentScore - decay : 0;
        }

        // Weight score based on task type
        uint256 weightedScore = newScore;
        if (taskType == TaskType.EMERGENCY_RESPONSE) {
            weightedScore = (newScore * 150) / 100; // 1.5x for emergency
        } else if (taskType == TaskType.GOVERNANCE) {
            weightedScore = (newScore * 120) / 100; // 1.2x for governance
        }

        // Calculate weighted average with existing score
        uint256 totalTasks = metrics.totalTasksCompleted + 1;
        uint256 newAverage = ((currentScore * metrics.totalTasksCompleted) + weightedScore) / totalTasks;

        // Cap at max score
        return newAverage > MAX_CIVIC_SCORE ? MAX_CIVIC_SCORE : newAverage;
    }
}
