#!/usr/bin/env bash
set -euo pipefail

: "${ETHERSCAN_API_KEY:?ETHERSCAN_API_KEY is required}"
: "${RPC_URL:?RPC_URL is required}"
: "${MINT_DELEGATE_ADDRESS:?MINT_DELEGATE_ADDRESS is required}"
: "${TOKEN_ADDRESS:?TOKEN_ADDRESS is required}"
: "${TOKEN_NAME:?TOKEN_NAME is required}"
: "${TOKEN_SYMBOL:?TOKEN_SYMBOL is required}"
: "${RELAYER_ADDRESS:?RELAYER_ADDRESS is required}"
: "${TEAM_WALLET:?TEAM_WALLET is required}"
: "${LP_RESERVE_WALLET:?LP_RESERVE_WALLET is required}"
: "${FEE_RECEIVER:?FEE_RECEIVER is required}"
: "${MINT_PRICE_WEI:?MINT_PRICE_WEI is required}"
: "${MINT_AMOUNT_WEI:?MINT_AMOUNT_WEI is required}"
: "${MAX_TOTAL_MINTS:?MAX_TOTAL_MINTS is required}"
: "${MAX_PER_WALLET:?MAX_PER_WALLET is required}"
: "${LP_RESERVE_AMOUNT_WEI:?LP_RESERVE_AMOUNT_WEI is required}"
: "${TEAM_AMOUNT_WEI:?TEAM_AMOUNT_WEI is required}"

forge verify-contract \
  --chain "${CHAIN_ID}" \
  --etherscan-api-key "$ETHERSCAN_API_KEY" \
  "$MINT_DELEGATE_ADDRESS" \
  contracts/delegate/MintDelegate.sol:MintDelegate \
  --constructor-args $(cast abi-encode "constructor(address,address,uint256)" "$TOKEN_ADDRESS" "$FEE_RECEIVER" "$MINT_PRICE_WEI")

forge verify-contract \
  --chain "${CHAIN_ID}" \
  --etherscan-api-key "$ETHERSCAN_API_KEY" \
  "$TOKEN_ADDRESS" \
  contracts/token/DelegatedMintToken.sol:DelegatedMintToken \
  --constructor-args $(cast abi-encode "constructor(string,string,address,address,address,address,uint256,uint256,uint256,uint256,uint256)" "$TOKEN_NAME" "$TOKEN_SYMBOL" "$MINT_DELEGATE_ADDRESS" "$RELAYER_ADDRESS" "$TEAM_WALLET" "$LP_RESERVE_WALLET" "$MINT_AMOUNT_WEI" "$MAX_TOTAL_MINTS" "$MAX_PER_WALLET" "$LP_RESERVE_AMOUNT_WEI" "$TEAM_AMOUNT_WEI")
