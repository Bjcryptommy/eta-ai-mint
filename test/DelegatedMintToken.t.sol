// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";

import {DelegatedMintToken} from "../contracts/token/DelegatedMintToken.sol";
import {MintDelegate} from "../contracts/delegate/MintDelegate.sol";

contract DelegatedMintTokenHarness is DelegatedMintToken {
    mapping(address => bool) internal delegated;

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
    ) DelegatedMintToken(
        name_,
        symbol_,
        mintDelegate_,
        relayer_,
        team_,
        lpSeed_,
        mintAmount_,
        maxTotalMints_,
        maxPerWallet_,
        lpReserveAmount_,
        teamAmount_
    ) {}

    function setDelegated(address account, bool value) external {
        delegated[account] = value;
    }

    function _isDelegatedToMintDelegate(address account) internal view override returns (bool) {
        return delegated[account];
    }
}

contract MockMintableToken {
    uint256 public mintCalls;

    function mint() external {
        mintCalls++;
    }

    function remaining() external pure returns (uint256) {
        return type(uint256).max;
    }

    function quota(address) external pure returns (uint256) {
        return type(uint256).max;
    }
}

contract RejectEtherReceiver {
    receive() external payable {
        revert("nope");
    }
}

contract DelegatedMintTokenTest is Test {
    address internal constant RELAYER = address(0x1001);
    address internal constant TEAM = address(0x1002);
    address internal constant LP_SEED = address(0x1003);
    address internal constant FEE_RECEIVER = address(0x1004);
    address internal constant DELEGATED_USER = address(0x2001);
    address internal constant OTHER_USER = address(0x2002);
    address internal constant DELEGATE_MARKER = address(0x9001);

    uint256 internal constant MINT_AMOUNT = 10_000_000 ether;
    uint256 internal constant MAX_TOTAL_MINTS = 21;
    uint256 internal constant MAX_PER_WALLET = 3;
    uint256 internal constant LP_RESERVE_AMOUNT = 210_000_000_000 ether;
    uint256 internal constant TEAM_AMOUNT = 690_000_000 ether;
    uint256 internal constant FEE_WEI = 0.00111 ether;

    DelegatedMintTokenHarness internal token;

    function setUp() external {
        token = new DelegatedMintTokenHarness(
            "Test",
            "TST",
            DELEGATE_MARKER,
            RELAYER,
            TEAM,
            LP_SEED,
            MINT_AMOUNT,
            MAX_TOTAL_MINTS,
            MAX_PER_WALLET,
            LP_RESERVE_AMOUNT,
            TEAM_AMOUNT
        );

        token.setDelegated(DELEGATED_USER, true);
        vm.deal(RELAYER, 100 ether);
        vm.deal(DELEGATED_USER, 100 ether);
        vm.deal(OTHER_USER, 100 ether);
    }

    function test_initialConfigAndPremints() external view {
        assertEq(token.name(), "Test");
        assertEq(token.symbol(), "TST");
        assertEq(token.MINT_DELEGATE(), DELEGATE_MARKER);
        assertEq(token.RELAYER(), RELAYER);
        assertEq(token.TEAM(), TEAM);
        assertEq(token.LP_SEED(), LP_SEED);
        assertEq(token.MINT_AMOUNT(), MINT_AMOUNT);
        assertEq(token.MAX_TOTAL_MINTS(), MAX_TOTAL_MINTS);
        assertEq(token.MAX_PER_WALLET(), MAX_PER_WALLET);
        assertEq(token.balanceOf(TEAM), TEAM_AMOUNT);
        assertEq(token.balanceOf(LP_SEED), LP_RESERVE_AMOUNT);
        assertEq(token.totalMints(), 0);
        assertEq(token.remaining(), MAX_TOTAL_MINTS);
        assertEq(token.quota(DELEGATED_USER), MAX_PER_WALLET);
    }

    function test_tokenMintMintsToDelegatedUser() external {
        vm.prank(DELEGATED_USER, RELAYER);
        token.mint();

        assertEq(token.balanceOf(DELEGATED_USER), MINT_AMOUNT);
        assertEq(token.totalMints(), 1);
        assertEq(token.mintsOf(DELEGATED_USER), 1);
        assertEq(token.remaining(), MAX_TOTAL_MINTS - 1);
        assertEq(token.quota(DELEGATED_USER), MAX_PER_WALLET - 1);
    }

    function test_tokenMintRevertsWhenNotViaRelayer() external {
        vm.expectRevert(DelegatedMintToken.NotViaRelayer.selector);
        vm.prank(DELEGATED_USER, DELEGATED_USER);
        token.mint();
    }

    function test_tokenMintRevertsWhenUserNotDelegated() external {
        vm.expectRevert(DelegatedMintToken.NotDelegated.selector);
        vm.prank(OTHER_USER, RELAYER);
        token.mint();
    }

    function test_walletCapEnforced() external {
        for (uint256 i; i < MAX_PER_WALLET; ++i) {
            vm.prank(DELEGATED_USER, RELAYER);
            token.mint();
        }

        vm.expectRevert(DelegatedMintToken.WalletCapReached.selector);
        vm.prank(DELEGATED_USER, RELAYER);
        token.mint();
    }

    function test_totalMintCapEnforcedAcrossWallets() external {
        uint256 minted;
        for (uint256 i; i < 7 && minted < MAX_TOTAL_MINTS; ++i) {
            address user = address(uint160(0x3000 + i));
            token.setDelegated(user, true);
            for (uint256 j; j < MAX_PER_WALLET && minted < MAX_TOTAL_MINTS; ++j) {
                vm.prank(user, RELAYER);
                token.mint();
                minted++;
            }
        }

        assertEq(token.totalMints(), MAX_TOTAL_MINTS);
        assertEq(token.remaining(), 0);

        address extraUser = address(0x4001);
        token.setDelegated(extraUser, true);
        vm.expectRevert(DelegatedMintToken.MintCapReached.selector);
        vm.prank(extraUser, RELAYER);
        token.mint();
    }

    function test_constructorRejectsBadConfig() external {
        vm.expectRevert(DelegatedMintToken.ZeroAddress.selector);
        new DelegatedMintTokenHarness("Test", "TST", address(0), RELAYER, TEAM, LP_SEED, MINT_AMOUNT, MAX_TOTAL_MINTS, MAX_PER_WALLET, LP_RESERVE_AMOUNT, TEAM_AMOUNT);

        vm.expectRevert(DelegatedMintToken.InvalidConfig.selector);
        new DelegatedMintTokenHarness("", "TST", DELEGATE_MARKER, RELAYER, TEAM, LP_SEED, MINT_AMOUNT, MAX_TOTAL_MINTS, MAX_PER_WALLET, LP_RESERVE_AMOUNT, TEAM_AMOUNT);
    }
}

contract MintDelegateTest is Test {
    address internal constant FEE_RECEIVER = address(0x1004);
    address internal constant DELEGATED_USER = address(0x2001);
    uint256 internal constant FEE_WEI = 0.00111 ether;

    MockMintableToken internal mockToken;
    MintDelegate internal delegate;

    function setUp() external {
        mockToken = new MockMintableToken();
        delegate = new MintDelegate(address(mockToken), FEE_RECEIVER, FEE_WEI);

        vm.etch(DELEGATED_USER, address(delegate).code);
        vm.deal(DELEGATED_USER, 100 ether);
    }

    function test_mintChargesFeeAndCallsToken() external {
        uint256 feeBefore = FEE_RECEIVER.balance;
        uint256 userEthBefore = DELEGATED_USER.balance;

        vm.prank(address(0xabc1), address(0xabc2));
        MintDelegate(payable(DELEGATED_USER)).mint();

        assertEq(FEE_RECEIVER.balance, feeBefore + FEE_WEI);
        assertEq(DELEGATED_USER.balance, userEthBefore - FEE_WEI);
        assertEq(mockToken.mintCalls(), 1);
    }

    function test_batchMintChargesOnceAndLoops() external {
        uint256 count = 3;
        uint256 feeBefore = FEE_RECEIVER.balance;
        uint256 userEthBefore = DELEGATED_USER.balance;

        vm.prank(address(0xabc1), address(0xabc2));
        MintDelegate(payable(DELEGATED_USER)).batchMint(count);

        assertEq(FEE_RECEIVER.balance, feeBefore + (FEE_WEI * count));
        assertEq(DELEGATED_USER.balance, userEthBefore - (FEE_WEI * count));
        assertEq(mockToken.mintCalls(), count);
    }

    function test_batchMintZeroCountIsNoOp() external {
        uint256 feeBefore = FEE_RECEIVER.balance;
        uint256 userEthBefore = DELEGATED_USER.balance;

        vm.prank(address(0xabc1), address(0xabc2));
        MintDelegate(payable(DELEGATED_USER)).batchMint(0);

        assertEq(FEE_RECEIVER.balance, feeBefore);
        assertEq(DELEGATED_USER.balance, userEthBefore);
        assertEq(mockToken.mintCalls(), 0);
    }

    function test_feeTransferFailureReverts() external {
        RejectEtherReceiver rejector = new RejectEtherReceiver();
        MintDelegate failingDelegate = new MintDelegate(address(mockToken), address(rejector), FEE_WEI);
        address failingUser = address(0x3001);
        vm.etch(failingUser, address(failingDelegate).code);
        vm.deal(failingUser, 100 ether);

        vm.expectRevert(MintDelegate.FeeTransferFailed.selector);
        vm.prank(address(0xabc1), address(0xabc2));
        MintDelegate(payable(failingUser)).mint();
    }

    function test_constructorRejectsBadConfig() external {
        vm.expectRevert(MintDelegate.ZeroAddress.selector);
        new MintDelegate(address(0), FEE_RECEIVER, FEE_WEI);
    }
}
