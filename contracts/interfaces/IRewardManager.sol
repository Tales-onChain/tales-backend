// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IRewardManager {
    function afterAppreciate(address _author, address _appreciator, uint256 _taleId) external;
    function afterRetell(address _author, address _reteller, uint256 _taleId) external;
}