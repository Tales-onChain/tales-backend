// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IRewardManager {
    function afterAppreciate(address _author, address _appreciator, uint256 _taleId) external;
    function afterRetell(address _author, address _reteller, uint256 _taleId) external;
    
    // Batch reward functions for L2 optimization
    function batchAfterAppreciate(
        address[] calldata _authors,
        address _appreciator,
        uint256[] calldata _taleIds
    ) external;
    
    function batchAfterRetell(
        address[] calldata _authors,
        address _reteller,
        uint256[] calldata _taleIds
    ) external;
}