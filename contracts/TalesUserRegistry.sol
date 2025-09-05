// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IENSRegistry.sol";
import "./interfaces/IENSResolver.sol";

/**
 * @title TalesUserRegistry
 * @dev Handles decentralized user onboarding and ENS identity management for Tales Social.
 * Implements FR1.1, FR1.2, FR1.3, and FR1.4 requirements.
 */
contract TalesUserRegistry is Ownable {
    // --- Constants ---
    IENSRegistry public constant ENS_REGISTRY = IENSRegistry(0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e);
    
    // --- State Variables ---
    IENSResolver public ensResolver;
    bytes32 public immutable baseDomainNode; // namehash of 'tales.eth'
    
    // --- Mappings ---
    mapping(string => bool) public isSubnameClaimed; // Tracks claimed subnames (FR1.3)
    mapping(address => string) public userToSubname; // Maps address to their subname
    
    // --- Events ---
    event UserRegistered(address indexed user, string ensName); // FR1.3
    event ProfileUpdated(address indexed user, string key, string value); // FR1.4
    
    /**
     * @dev Constructor initializes the ENS resolver and base domain.
     * @param _resolverAddress Address of the ENS Public Resolver.
     * @param _baseDomainNode Namehash of the base domain (e.g., namehash('tales.eth')).
     */
    constructor(address _resolverAddress, bytes32 _baseDomainNode) Ownable(msg.sender) {
        ensResolver = IENSResolver(_resolverAddress);
        baseDomainNode = _baseDomainNode;
    }
    
    // --- FR1.3: Claim ENS Subname Function ---
    
    /**
     * @dev Allows a user to claim a free ENS subname under tales.eth domain.
     * @param _subname The desired subname (e.g., 'kofi' for 'kofi.tales.eth').
     */
    function claimSubname(string calldata _subname) external {
        require(!isSubnameClaimed[_subname], "Tales: Subname already claimed");
        require(_isValidSubname(_subname), "Tales: Invalid subname format");
        require(bytes(_subname).length >= 3, "Tales: Subname too short");
        
        // Mark as claimed first to prevent reentrancy
        isSubnameClaimed[_subname] = true;
        userToSubname[msg.sender] = _subname;
        
        // Calculate the label hash and full subname node
        bytes32 labelHash = keccak256(abi.encodePacked(_subname));
        bytes32 subnode = keccak256(abi.encodePacked(baseDomainNode, labelHash));
        
        // Create the subdomain and set this contract as temporary owner
        ENS_REGISTRY.setSubnodeOwner(baseDomainNode, labelHash, address(this));
        
        // Set the resolver for the new subdomain
        ENS_REGISTRY.setResolver(subnode, address(ensResolver));
        
        // Set the address record to point to the user's wallet
        ensResolver.setAddr(subnode, msg.sender);
        
        // Transfer ownership to the user (final step)
        ENS_REGISTRY.setOwner(subnode, msg.sender);
        
        // Emit registration event
        string memory fullName = string(abi.encodePacked(_subname, ".tales.eth"));
        emit UserRegistered(msg.sender, fullName);
    }
    
    // --- FR1.4: Profile Management Functions ---
    
    /**
     * @dev Allows a user to set a profile text record for their ENS name.
     * @param _ensNode The namehash of the user's ENS name.
     * @param _key The record key (e.g., 'avatar', 'description', 'url').
     * @param _value The record value.
     */
    function setProfileTextRecord(bytes32 _ensNode, string calldata _key, string calldata _value) external {
        // Verify that the caller owns the ENS name or is the resolver
        require(_ownsENSName(msg.sender, _ensNode), "Tales: Not ENS owner");
        
        // Set the text record via the resolver
        ensResolver.setText(_ensNode, _key, _value);
        
        emit ProfileUpdated(msg.sender, _key, _value);
    }
    
    /**
     * @dev Batch set multiple profile records in one transaction.
     * @param _ensNode The namehash of the user's ENS name.
     * @param _keys Array of record keys.
     * @param _values Array of record values.
     */
    function setProfileTextRecords(
        bytes32 _ensNode,
        string[] calldata _keys,
        string[] calldata _values
    ) external {
        require(_ownsENSName(msg.sender, _ensNode), "Tales: Not ENS owner");
        require(_keys.length == _values.length, "Tales: Array length mismatch");
        
        for (uint256 i = 0; i < _keys.length; i++) {
            ensResolver.setText(_ensNode, _keys[i], _values[i]);
            emit ProfileUpdated(msg.sender, _keys[i], _values[i]);
        }
    }
    
    // --- View Functions (For FR1.2) ---
    
    /**
     * @dev Resolves an ENS node to its owner address.
     * @param _ensNode The namehash of the ENS name.
     * @return The owner address of the ENS name.
     */
    function resolveENSOwner(bytes32 _ensNode) public view returns (address) {
        return ENS_REGISTRY.owner(_ensNode);
    }
    
    /**
     * @dev Gets a text record from an ENS name.
     * @param _ensNode The namehash of the ENS name.
     * @param _key The record key to retrieve.
     * @return The value of the text record.
     */
    function getProfileTextRecord(bytes32 _ensNode, string calldata _key) public view returns (string memory) {
        return ensResolver.text(_ensNode, _key);
    }
    
    // --- Internal Functions ---
    
    /**
     * @dev Validates if a subname meets format requirements.
     * @param _subname The subname to validate.
     * @return True if the subname is valid.
     */
    function _isValidSubname(string calldata _subname) internal pure returns (bool) {
        bytes memory b = bytes(_subname);
        if (b.length > 20) return false;
        
        for (uint256 i = 0; i < b.length; i++) {
            bytes1 char = b[i];
            // Allow only lowercase letters and numbers
            if (
                !(char >= 0x30 && char <= 0x39) && // 0-9
                !(char >= 0x61 && char <= 0x7A)    // a-z
            ) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * @dev Checks if an address owns a specific ENS name.
     * @param _address The address to check.
     * @param _ensNode The namehash of the ENS name.
     * @return True if the address owns the ENS name.
     */
    function _ownsENSName(address _address, bytes32 _ensNode) internal view returns (bool) {
        return ENS_REGISTRY.owner(_ensNode) == _address;
    }
    
    // --- Admin Functions ---
    
    /**
     * @dev Updates the ENS resolver address.
     * @param _newResolver Address of the new resolver.
     */
    function setResolver(address _newResolver) external onlyOwner {
        ensResolver = IENSResolver(_newResolver);
    }
    
    /**
     * @dev Emergency function to reclaim a subname (e.g., for abuse prevention).
     * @param _subname The subname to reclaim.
     * @param _newOwner The new owner address.
     */
    function adminReclaimSubname(string calldata _subname, address _newOwner) external onlyOwner {
        bytes32 labelHash = keccak256(abi.encodePacked(_subname));
        bytes32 subnode = keccak256(abi.encodePacked(baseDomainNode, labelHash));
        
        ENS_REGISTRY.setOwner(subnode, _newOwner);
        isSubnameClaimed[_subname] = false;
    }
}