// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TalesRegistry
 * @dev The core social media contract for Tales protocol. Handles posts, interactions, and rewards.
 */
contract TalesRegistry is Ownable {
    // --- State Variables ---
    uint256 public taleCount;
    address public rewardManager;
    address public userRegistry;

    // --- Mappings ---
    mapping(uint256 => Tale) public tales;
    mapping(address => mapping(uint256 => bool)) public hasAppreciated;
    mapping(address => mapping(uint256 => bool)) public hasRetold;

    // --- Structs ---
    struct Tale {
        address author;
        string contentHash; // IPFS CID for post content
        uint256 timestamp;
        uint256 parentId;   // 0 = original post, >0 = comment/reply
        uint256 appreciationCount;
        uint256 retellCount;
        uint256 replyCount;
    }

    // --- Events ---
    event TaleCreated(
        uint256 indexed taleId,
        address indexed author,
        string contentHash,
        uint256 timestamp,
        uint256 indexed parentId
    );
    event TaleAppreciated(
        uint256 indexed taleId,
        address indexed author,
        address indexed appreciator
    );
    event TaleRetold(
        uint256 indexed taleId,
        address indexed author,
        address indexed reteller
    );

    // --- Modifiers ---
    modifier onlyRegisteredUser() {
        // This would check with userRegistry if the user is registered
        // For now, we'll keep it simple
        _;
    }

    modifier onlyRewardManager() {
        require(msg.sender == rewardManager, "Caller is not the RewardManager");
        _;
    }

    // --- Constructor ---
    constructor() Ownable() {}

    // --- Core Functions ---

    /**
     * @dev Creates a new tale (post)
     * @param _contentHash IPFS CID of the tale content
     */
    function createTale(string calldata _contentHash) external onlyRegisteredUser returns (uint256) {
        taleCount++;
        uint256 newTaleId = taleCount;

        tales[newTaleId] = Tale({
            author: msg.sender,
            contentHash: _contentHash,
            timestamp: block.timestamp,
            parentId: 0, // 0 signifies original post
            appreciationCount: 0,
            retellCount: 0,
            replyCount: 0
        });

        emit TaleCreated(newTaleId, msg.sender, _contentHash, block.timestamp, 0);
        return newTaleId;
    }

    /**
     * @dev Creates a reply to an existing tale
     * @param _parentId ID of the tale being replied to
     * @param _contentHash IPFS CID of the reply content
     */
    function createReply(uint256 _parentId, string calldata _contentHash) external onlyRegisteredUser returns (uint256) {
        require(_parentId > 0 && _parentId <= taleCount, "Invalid parent tale ID");
        
        taleCount++;
        uint256 newReplyId = taleCount;

        tales[newReplyId] = Tale({
            author: msg.sender,
            contentHash: _contentHash,
            timestamp: block.timestamp,
            parentId: _parentId,
            appreciationCount: 0,
            retellCount: 0,
            replyCount: 0
        });

        // Increment reply count on parent tale
        tales[_parentId].replyCount++;

        emit TaleCreated(newReplyId, msg.sender, _contentHash, block.timestamp, _parentId);
        return newReplyId;
    }

    /**
     * @dev Appreciate (like) a tale
     * @param _taleId ID of the tale to appreciate
     */
    function appreciateTale(uint256 _taleId) external onlyRegisteredUser {
        require(_taleId > 0 && _taleId <= taleCount, "Invalid tale ID");
        require(!hasAppreciated[msg.sender][_taleId], "Already appreciated this tale");

        Tale storage tale = tales[_taleId];
        hasAppreciated[msg.sender][_taleId] = true;
        tale.appreciationCount++;

        emit TaleAppreciated(_taleId, tale.author, msg.sender);

        // Trigger rewards if reward manager is set
        if (rewardManager != address(0)) {
            IRewardManager(rewardManager).afterAppreciate(tale.author, msg.sender, _taleId);
        }
    }

    /**
     * @dev Retell (repost) a tale
     * @param _taleId ID of the tale to retell
     */
    function retellTale(uint256 _taleId) external onlyRegisteredUser {
        require(_taleId > 0 && _taleId <= taleCount, "Invalid tale ID");
        require(!hasRetold[msg.sender][_taleId], "Already retold this tale");

        Tale storage tale = tales[_taleId];
        hasRetold[msg.sender][_taleId] = true;
        tale.retellCount++;

        emit TaleRetold(_taleId, tale.author, msg.sender);

        // Trigger rewards if reward manager is set
        if (rewardManager != address(0)) {
            IRewardManager(rewardManager).afterRetell(tale.author, msg.sender, _taleId);
        }
    }

    // --- View Functions ---

    /**
     * @dev Get tale details
     * @param _taleId ID of the tale to retrieve
     */
    function getTale(uint256 _taleId) external view returns (
        address author,
        string memory contentHash,
        uint256 timestamp,
        uint256 parentId,
        uint256 appreciationCount,
        uint256 retellCount,
        uint256 replyCount
    ) {
        require(_taleId > 0 && _taleId <= taleCount, "Invalid tale ID");
        Tale storage t = tales[_taleId];
        return (
            t.author,
            t.contentHash,
            t.timestamp,
            t.parentId,
            t.appreciationCount,
            t.retellCount,
            t.replyCount
        );
    }

    /**
     * @dev Get tales by author with pagination
     * @param _author Address of the author
     * @param _start Starting index (0-based)
     * @param _count Number of tales to return
     */
    function getTalesByAuthor(address _author, uint256 _start, uint256 _count) external view returns (uint256[] memory) {
        uint256[] memory result = new uint256[](_count);
        uint256 resultIndex = 0;
        
        for (uint256 i = _start + 1; i <= taleCount && resultIndex < _count; i++) {
            if (tales[i].author == _author) {
                result[resultIndex] = i;
                resultIndex++;
            }
        }
        
        return result;
    }

    // --- Admin Functions ---

    /**
     * @dev Set the reward manager contract
     * @param _rewardManager Address of the reward manager
     */
    function setRewardManager(address _rewardManager) external onlyOwner {
        rewardManager = _rewardManager;
    }

    /**
     * @dev Set the user registry contract
     * @param _userRegistry Address of the user registry
     */
    function setUserRegistry(address _userRegistry) external onlyOwner {
        userRegistry = _userRegistry;
    }
}

// Interface for RewardManager
interface IRewardManager {
    function afterAppreciate(address _author, address _appreciator, uint256 _taleId) external;
    function afterRetell(address _author, address _reteller, uint256 _taleId) external;
}