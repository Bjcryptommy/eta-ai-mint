// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IMintableToken} from "../interfaces/IMintableToken.sol";

/// @notice Minimal EIP-7702 delegate target for mint-only flows.
/// @dev Intentionally narrow: fee charge + token mint forwarding only.
contract MintDelegate {
    address public immutable TOKEN;
    address public immutable FEE_RECEIVER;
    uint256 public immutable FEE_WEI;

    error ZeroAddress();
    error FeeTransferFailed();
    error CountTooLarge();

    receive() external payable {}

    constructor(address token_, address feeReceiver_, uint256 feeWei_) {
        if (token_ == address(0) || feeReceiver_ == address(0)) revert ZeroAddress();
        TOKEN = token_;
        FEE_RECEIVER = feeReceiver_;
        FEE_WEI = feeWei_;
    }

    function mint() external {
        _chargeFee(1);
        IMintableToken(TOKEN).mint();
    }

    /// @dev Charges once, then performs `count` mints atomically.
    function batchMint(uint256 count) external {
        if (count == 0) return;
        if (count > type(uint32).max) revert CountTooLarge();

        _chargeFee(count);
        for (uint256 i; i < count;) {
            IMintableToken(TOKEN).mint();
            unchecked {
                ++i;
            }
        }
    }

    /// @notice No-op helper kept for compatibility with delegate tooling.
    function sync() external {}

    function _chargeFee(uint256 count) internal {
        uint256 amt = FEE_WEI * count;
        if (amt == 0) return;

        (bool ok,) = payable(FEE_RECEIVER).call{value: amt}("");
        if (!ok) revert FeeTransferFailed();
    }
}
