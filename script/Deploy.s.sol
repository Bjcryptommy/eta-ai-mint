// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

import {DelegatedMintToken} from "../contracts/token/DelegatedMintToken.sol";
import {MintDelegate} from "../contracts/delegate/MintDelegate.sol";

contract Deploy is Script {
    struct DeployConfig {
        string tokenName;
        string tokenSymbol;
        address relayer;
        address team;
        address lpSeed;
        address feeReceiver;
        uint256 mintPriceWei;
        uint256 mintAmountWei;
        uint256 maxTotalMints;
        uint256 maxPerWallet;
        uint256 lpReserveAmountWei;
        uint256 teamAmountWei;
    }

    function run() external returns (DelegatedMintToken token, MintDelegate delegate) {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(privateKey);
        DeployConfig memory cfg = _loadConfig();

        uint64 nonce = vm.getNonce(deployer);
        address predictedToken = vm.computeCreateAddress(deployer, nonce + 1);

        vm.startBroadcast(privateKey);

        delegate = new MintDelegate(predictedToken, cfg.feeReceiver, cfg.mintPriceWei);
        token = new DelegatedMintToken(
            cfg.tokenName,
            cfg.tokenSymbol,
            address(delegate),
            cfg.relayer,
            cfg.team,
            cfg.lpSeed,
            cfg.mintAmountWei,
            cfg.maxTotalMints,
            cfg.maxPerWallet,
            cfg.lpReserveAmountWei,
            cfg.teamAmountWei
        );

        vm.stopBroadcast();

        console2.log("Network:", vm.envString("NETWORK"));
        console2.log("Deployer:", deployer);
        console2.log("Predicted token:", predictedToken);
        console2.log("Delegate:", address(delegate));
        console2.log("Token:", address(token));
        console2.log("Relayer:", cfg.relayer);
        console2.log("Fee receiver:", cfg.feeReceiver);
    }

    function _loadConfig() internal view returns (DeployConfig memory cfg) {
        cfg.tokenName = vm.envString("TOKEN_NAME");
        cfg.tokenSymbol = vm.envString("TOKEN_SYMBOL");
        cfg.relayer = vm.envAddress("RELAYER_ADDRESS");
        cfg.team = vm.envAddress("TEAM_WALLET");
        cfg.lpSeed = vm.envAddress("LP_RESERVE_WALLET");
        cfg.feeReceiver = vm.envAddress("FEE_RECEIVER");
        cfg.mintPriceWei = vm.envUint("MINT_PRICE_WEI");
        cfg.mintAmountWei = vm.envUint("MINT_AMOUNT_WEI");
        cfg.maxTotalMints = vm.envUint("MAX_TOTAL_MINTS");
        cfg.maxPerWallet = vm.envUint("MAX_PER_WALLET");
        cfg.lpReserveAmountWei = vm.envUint("LP_RESERVE_AMOUNT_WEI");
        cfg.teamAmountWei = vm.envUint("TEAM_AMOUNT_WEI");
    }
}
