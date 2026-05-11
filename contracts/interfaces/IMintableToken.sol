// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IMintableToken {
    function mint() external;
    function remaining() external view returns (uint256);
    function quota(address account) external view returns (uint256);
}
