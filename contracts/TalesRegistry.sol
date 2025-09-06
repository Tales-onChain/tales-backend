// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19; // Base recommended version

/**
 * @title TalesRegistry
 * @dev Optimized for Base L2 deployment
 * Gas optimized social media contract implementing batch operations and L2-specific optimizations
 */

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
        uint32 timestamp;
        uint32 parentId;   // 0 = original post, >0 = comment/reply
        uint32 appreciationCount;
        uint32 retellCount;
        uint32 replyCount;
        uint32 reserved;  // for future use and optimal packing
    }

    // --- Events ---
    event TaleCreated(
        uint256 indexed taleId,
        address indexed author,
        string contentHash,
        uint32 timestamp,
        uint256 indexed parentId
    );
    event BatchTalesCreated(
        uint256[] taleIds,
        address indexed author,
        uint32 timestamp
    );
    event TaleAppreciated(
        uint256 indexed taleId,
        address indexed author,
        address indexed appreciator
    );
    event BatchTalesAppreciated(
        uint256[] taleIds,
        address indexed appreciator
    );
    event TaleRetold(
        uint256 indexed taleId,
        address indexed author,
        address indexed reteller
    );
    event BatchTalesRetold(
        uint256[] taleIds,
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

    // Allow read-only reentrancy for view functions (L2 optimization)
    modifier readOnlyReentrant() {
        require(msg.sender == address(this) || msg.sender.code.length == 0, "Only EOA or self-calls");
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
        unchecked {
            taleCount++;
        }
        uint256 newTaleId = taleCount;

        tales[newTaleId] = Tale({
            author: msg.sender,
            contentHash: _contentHash,
            timestamp: uint32(block.timestamp),
            parentId: 0, // 0 signifies original post
            appreciationCount: 0,
            retellCount: 0,
            replyCount: 0,
            reserved: 0
        });

        emit TaleCreated(newTaleId, msg.sender, _contentHash, uint32(block.timestamp), 0);
        return newTaleId;
    }

    /**
     * @dev Creates a reply to an existing tale
     * @param _parentId ID of the tale being replied to
     * @param _contentHash IPFS CID of the reply content
     */
    function createReply(uint256 _parentId, string calldata _contentHash) external onlyRegisteredUser returns (uint256) {
        require(_parentId > 0 && _parentId <= taleCount, "Invalid parent tale ID");
        
        unchecked {
            taleCount++;
        }
        uint256 newReplyId = taleCount;

        tales[newReplyId] = Tale({
            author: msg.sender,
            contentHash: _contentHash,
            timestamp: uint32(block.timestamp),
            parentId: uint32(_parentId),
            appreciationCount: 0,
            retellCount: 0,
            replyCount: 0,
            reserved: 0
        });

        // Increment reply count on parent tale
        tales[_parentId].replyCount++;

        emit TaleCreated(newReplyId, msg.sender, _contentHash, uint32(block.timestamp), _parentId);
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
        unchecked {
            tale.appreciationCount++;
        }

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
        unchecked {
            tale.retellCount++;
        }

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
        uint32 timestamp,
        uint32 parentId,
        uint32 appreciationCount,
        uint32 retellCount,
        uint32 replyCount
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
        
        for (uint256 i = _start + 1; i <= taleCount && resultIndex < _count;) {
            if (tales[i].author == _author) {
                result[resultIndex] = i;
                unchecked {
                    resultIndex++;
                }
            }
            unchecked {
                i++;
            }
        }
        
        return result;
    }

    /**
     * @dev Batch get multiple tales at once
     * @param _taleIds Array of tale IDs to fetch
     */
    function batchGetTales(uint256[] calldata _taleIds) external view readOnlyReentrant returns (
        Tale[] memory tales_
    ) {
        uint256 length = _taleIds.length;
        require(length > 0 && length <= 100, "Invalid batch size");

        tales_ = new Tale[](length);

        for (uint256 i = 0; i < length;) {
            uint256 taleId = _taleIds[i];
            require(taleId > 0 && taleId <= taleCount, "Invalid tale ID");
            tales_[i] = tales[taleId];
            unchecked {
                i++;
            }
        }
    }

    /**
     * @dev Batch retell multiple tales at once
     * @param _taleIds Array of tale IDs to retell
     */
    function batchRetellTales(uint256[] calldata _taleIds) external onlyRegisteredUser {
        uint256 length = _taleIds.length;
        require(length > 0 && length <= 50, "Invalid batch size");

        for (uint256 i = 0; i < length;) {
            uint256 taleId = _taleIds[i];
            require(taleId > 0 && taleId <= taleCount, "Invalid tale ID");
            require(!hasRetold[msg.sender][taleId], "Already retold");

            Tale storage tale = tales[taleId];
            hasRetold[msg.sender][taleId] = true;
            unchecked {
                tale.retellCount++;
                i++;
            }

            emit TaleRetold(taleId, tale.author, msg.sender);

            if (rewardManager != address(0)) {
                IRewardManager(rewardManager).afterRetell(tale.author, msg.sender, taleId);
            }
        }

        emit BatchTalesRetold(_taleIds, msg.sender);
    }

    // --- Batch Operations ---

    /**
     * @dev Batch appreciate multiple tales at once
     * @param _taleIds Array of tale IDs to appreciate
     */
    function batchAppreciateTales(uint256[] calldata _taleIds) external onlyRegisteredUser {
        uint256 length = _taleIds.length;
        require(length > 0 && length <= 50, "Invalid batch size");

        for (uint256 i = 0; i < length;) {
            uint256 taleId = _taleIds[i];
            require(taleId > 0 && taleId <= taleCount, "Invalid tale ID");
            require(!hasAppreciated[msg.sender][taleId], "Already appreciated");

            Tale storage tale = tales[taleId];
            hasAppreciated[msg.sender][taleId] = true;
            unchecked {
                tale.appreciationCount++;
                i++;
            }

            emit TaleAppreciated(taleId, tale.author, msg.sender);

            if (rewardManager != address(0)) {
                IRewardManager(rewardManager).afterAppreciate(tale.author, msg.sender, taleId);
            }
        }
    }

    /**
     * @dev Batch create multiple tales at once
     * @param _contentHashes Array of IPFS CIDs for tale contents
     */
    function batchCreateTales(string[] calldata _contentHashes) external onlyRegisteredUser returns (uint256[] memory) {
        uint256 length = _contentHashes.length;
        require(length > 0 && length <= 20, "Invalid batch size");

        uint256[] memory newTaleIds = new uint256[](length);

        for (uint256 i = 0; i < length;) {
            unchecked {
                taleCount++;
                newTaleIds[i] = taleCount;
                i++;
            }

            tales[newTaleIds[i-1]] = Tale({
                author: msg.sender,
                contentHash: _contentHashes[i-1],
                timestamp: uint32(block.timestamp),
                parentId: 0,
                appreciationCount: 0,
                retellCount: 0,
                replyCount: 0,
                reserved: 0
            });

            // Individual tale events are still emitted for indexing purposes
            emit TaleCreated(newTaleIds[i-1], msg.sender, _contentHashes[i-1], uint32(block.timestamp), 0);
        }

        return newTaleIds;
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