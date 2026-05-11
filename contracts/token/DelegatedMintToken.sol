// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Dogeshit-style delegated mint token for AI-assisted mint flows.
/// @dev Public mints are only valid when called from a delegated EOA wallet
/// through the configured relayer flow.
contract DelegatedMintToken is ERC20 {
    address public immutable MINT_DELEGATE;
    address public immutable RELAYER;
    address public immutable TEAM;
    address public immutable LP_SEED;

    /// @notice keccak256(0xef0100 || mintDelegate)
    bytes32 public immutable EXPECTED_DELEGATION_HASH;

    uint256 public immutable MINT_AMOUNT;
    uint256 public immutable MAX_TOTAL_MINTS;
    uint256 public immutable MAX_PER_WALLET;
    uint256 public immutable LP_RESERVE_AMOUNT;
    uint256 public immutable TEAM_AMOUNT;

    uint256 public totalMints;
    mapping(address => uint256) public mintsOf;

    error ZeroAddress();
    error InvalidConfig();
    error NotViaRelayer();
    error NotDelegated();
    error MintCapReached();
    error WalletCapReached();

    constructor(
        string memory name_,
        string memory symbol_,
        address mintDelegate_,
        address relayer_,
        address team_,
        address lpSeed_,
        uint256 mintAmount_,
        uint256 maxTotalMints_,
        uint256 maxPerWallet_,
        uint256 lpReserveAmount_,
        uint256 teamAmount_
    ) ERC20(name_, symbol_) {
        if (mintDelegate_ == address(0) || relayer_ == address(0) || team_ == address(0) || lpSeed_ == address(0)) {
            revert ZeroAddress();
        }
        if (bytes(name_).length == 0 || bytes(symbol_).length == 0) revert InvalidConfig();
        if (mintAmount_ == 0 || maxTotalMints_ == 0 || maxPerWallet_ == 0) revert InvalidConfig();

        MINT_DELEGATE = mintDelegate_;
        RELAYER = relayer_;
        TEAM = team_;
        LP_SEED = lpSeed_;
        MINT_AMOUNT = mintAmount_;
        MAX_TOTAL_MINTS = maxTotalMints_;
        MAX_PER_WALLET = maxPerWallet_;
        LP_RESERVE_AMOUNT = lpReserveAmount_;
        TEAM_AMOUNT = teamAmount_;
        EXPECTED_DELEGATION_HASH = keccak256(abi.encodePacked(bytes3(0xef0100), bytes20(mintDelegate_)));

        if (teamAmount_ > 0) _mint(team_, teamAmount_);
        if (lpReserveAmount_ > 0) _mint(lpSeed_, lpReserveAmount_);
    }

    function mint() external {
        if (tx.origin != RELAYER) revert NotViaRelayer();
        if (!_isDelegatedToMintDelegate(msg.sender)) revert NotDelegated();

        uint256 mintsTotal = totalMints;
        uint256 mintsUser = mintsOf[msg.sender];

        if (mintsTotal >= MAX_TOTAL_MINTS) revert MintCapReached();
        if (mintsUser >= MAX_PER_WALLET) revert WalletCapReached();

        unchecked {
            totalMints = mintsTotal + 1;
            mintsOf[msg.sender] = mintsUser + 1;
        }

        _mint(msg.sender, MINT_AMOUNT);
    }

    function remaining() external view returns (uint256) {
        return MAX_TOTAL_MINTS - totalMints;
    }

    function quota(address account) external view returns (uint256) {
        uint256 used = mintsOf[account];
        if (used >= MAX_PER_WALLET) return 0;
        return MAX_PER_WALLET - used;
    }

    function isDelegatedToMintDelegate(address account) external view returns (bool) {
        return _isDelegatedToMintDelegate(account);
    }

    function _isDelegatedToMintDelegate(address account) internal view virtual returns (bool) {
        return account.codehash == EXPECTED_DELEGATION_HASH;
    }
}
