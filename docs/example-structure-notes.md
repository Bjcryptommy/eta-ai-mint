# Example folder notes from `pepepeg_full_v4_step1`

## What makes that folder easy to test

### 1. Foundry is the center
- `contracts/`
- `script/`
- `test/`
- `foundry.toml`

That makes deploy, test, and repeat fast.

### 2. Testnet and mainnet use separate scripts
Example pattern:
- `DeploySepoliaV4Core.s.sol`
- `DeployMainnetV4Core.s.sol`
- `InitializeSepoliaV4Pool.s.sol`
- `InitializeMainnetV4Pool.s.sol`

This is simple and fast to run, but still keeps the flow clear.

### 3. Network-specific values are env-driven
The mainnet script reads values like `POOL_MANAGER` from env instead of hardcoding.
That is the key reason switching networks is easy.

### 4. Deployed artifacts stay beside the repo
- `broadcast/`
- `cache/`
- `out/`

That helps with quick replay, inspection, and verification.

### 5. Frontend is kept in the same repo
There is a separate `frontend/` app, so contract work and UI setup live together.
That is good for fast iteration.

## What we should copy from that pattern

- Foundry-first contract repo
- per-network env files
- per-network deploy scripts
- config files for deployed addresses
- frontend/backend/MCP in sibling folders
- one repo for the whole MVP

## What we should NOT copy blindly

- chain-specific hardcoding inside core business logic
- product-specific contract behavior that belongs only to that project
- loose prototype assumptions that are okay for experiments but weak for mint security

## Our version

For ETA AI Mint, we should keep the same speed-oriented repo shape, but use:
- ETH delegated mint contracts
- relayer backend
- MCP server
- setup/revoke/proof frontend
- clean testnet/mainnet split by config
