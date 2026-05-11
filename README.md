# ETA AI Mint

ETH-first MVP for delegated wallet minting via ChatGPT/MCP.

## Why this repo is structured this way

This repo is set up for **fast testing** and **fast testnet -> mainnet switching**.
The idea is:

- keep contracts and scripts together with Foundry
- keep all chain-specific values in env/config
- keep backend, MCP, and frontend as separate modules
- avoid hardcoding addresses into business logic

## Folder layout

- `contracts/` — Solidity contracts
- `script/` — Foundry deploy/init/verify scripts
- `test/` — Foundry tests
- `config/` — chain config and address manifests
- `backend/` — relayer service
- `mcp/` — MCP server for ChatGPT tools
- `frontend/` — setup/revoke/proof site
- `docs/` — specs, runbooks, deployment notes

## Environment strategy

Use env files for each target:

- `.env.test`
- `.env.mainnet`

And keep deployed addresses in:

- `config/sepolia.json`
- `config/mainnet.json`

That way the same scripts can be reused across networks.

## Planned scripts

- `Deploy.s.sol`
- `Verify.sh`
- `write-addresses.js`
- `SmokeMint.s.sol`

## Core design goals

- relayer cannot redirect receiver
- only delegated wallet can receive minted tokens
- on-chain wallet cap
- on-chain total mint cap
- simple delegate with no arbitrary execution
- revoke flow from day one
- minimal edits needed for mainnet cutover

## Test-only delegation endpoint

For Sepolia debugging, the backend can expose a protected test-only endpoint that activates delegation using a configured local private key instead of a browser wallet.

- endpoint: `POST /test/delegate`
- auth: same bearer token as other backend routes
- gating:
  - `ENABLE_TEST_DELEGATION=true`
  - blocked on mainnet
  - only delegates the configured `TEST_DELEGATION_PRIVATE_KEY` wallet (or `USER_PRIVATE_KEY` fallback)

Example request:

```bash
curl -X POST http://127.0.0.1:3001/test/delegate \
  -H "Authorization: Bearer $BACKEND_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Optional explicit wallet body is allowed, but it must match the configured test wallet.

## Important Sepolia note for EIP-7702

The backend mint flow relies on an external EIP-7702 execution transaction:

- relayer sends the transaction
- `to` is the delegated user wallet
- wallet executes via the delegated `MintDelegate`

That means the backend `RPC_URL` must point to a provider that supports EIP-7702 execution transactions on the target network. If the RPC does not support it yet, mint attempts will fail with an error like:

- `External EIP-7702 transactions are not supported`

If that happens, switch `RPC_URL` to a 7702-capable Sepolia provider. Frontend and contract logic do not need a redesign.
