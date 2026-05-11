# Deployment flow

## Goal

One clean deploy path.
The same codebase should work for testnet and mainnet.
Only env/config values should change.

## Core files

- `script/Deploy.s.sol` — single env-driven deploy script
- `script/Verify.sh` — verification script
- `script/write-addresses.js` — writes deployed addresses into config json
- `config/sepolia.json`
- `config/mainnet.json`
- `.env.test.example`
- `.env.mainnet.example`

## Testnet deploy

1. copy env template
   - `.env.test.example` -> `.env.test`
2. fill values
3. load env
   - `source .env.test`
4. deploy
   - `forge script script/Deploy.s.sol:Deploy --rpc-url $RPC_URL --broadcast -vv`
5. copy emitted token/delegate addresses
6. write addresses to config
   - `node script/write-addresses.js sepolia <token> <delegate>`
7. set `TOKEN_ADDRESS` and `MINT_DELEGATE_ADDRESS` in `.env.test`
8. verify
   - `bash script/Verify.sh`

## Mainnet deploy

1. copy env template
   - `.env.mainnet.example` -> `.env.mainnet`
2. fill values
3. load env
   - `source .env.mainnet`
4. deploy with the same script
   - `forge script script/Deploy.s.sol:Deploy --rpc-url $RPC_URL --broadcast -vv`
5. write addresses to config
   - `node script/write-addresses.js mainnet <token> <delegate>`
6. set `TOKEN_ADDRESS` and `MINT_DELEGATE_ADDRESS` in `.env.mainnet`
7. verify
   - `bash script/Verify.sh`

## Minimal switch from testnet to mainnet

Only change:
- `NETWORK`
- `RPC_URL`
- `CHAIN_ID`
- `ETHERSCAN_API_KEY`
- wallet addresses
- token branding if needed
- final tokenomics if needed

Do not change Solidity logic unless tests or audit require it.

## Recommendation

Keep testnet and mainnet env files side by side.
The deployment path should remain identical.
That is how we keep the move to mainnet fast and low-risk.
