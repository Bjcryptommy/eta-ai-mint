# Backend + MCP server

## Services

### Backend relayer
Path: `backend/`
Default port: `3001`

Responsibilities:
- read token/delegate state from chain
- check delegation status
- check wallet quota and remaining public mint
- check user balance vs mint fee
- send relayer mint tx
- expose tx status

### MCP server
Path: `mcp/`
Default port: `3002`

Responsibilities:
- expose tool-shaped HTTP routes for ChatGPT/OpenAI app wiring
- wrap backend responses instead of duplicating chain logic

## Backend routes
- `GET /health`
- `GET /token-info`
- `GET /wallet-status/:wallet`
- `GET /authorization-status/:wallet`
- `GET /mint-quota/:wallet`
- `GET /token-balance/:wallet`
- `GET /tx-status/:hash`
- `GET /revoke-info/:wallet`
- `POST /mint` with JSON body `{ "wallet": "0x...", "slots": 1 }`

## MCP routes
- `GET /health`
- `GET /tools`
- `GET /tool/token_info`
- `GET /tool/authorization_status/:wallet`
- `GET /tool/mint_quota_get/:wallet`
- `GET /tool/token_balance/:wallet`
- `GET /tool/wallet_status/:wallet`
- `GET /tool/tx_status/:hash`
- `GET /tool/revoke_info/:wallet`
- `POST /tool/token_mint` with JSON body `{ "wallet": "0x...", "slots": 1 }`

## Protection layer

Backend uses:
- `Authorization: Bearer <BACKEND_AUTH_TOKEN>`

MCP uses:
- `Authorization: Bearer <MCP_AUTH_TOKEN>`

Relevant env:
- `REQUIRE_BACKEND_AUTH=true`
- `REQUIRE_MCP_AUTH=true`
- `BACKEND_AUTH_TOKEN=...`
- `MCP_AUTH_TOKEN=...`
- `MAX_MINT_SLOTS_PER_REQUEST=10`

## Run locally

### backend
```bash
cd /Users/bolajioluwatomiwa/Documents/projects/eta-ai-mint/backend
set -a
source ../.env.test
set +a
npm install
npm run dev
```

### mcp
```bash
cd /Users/bolajioluwatomiwa/Documents/projects/eta-ai-mint/mcp
set -a
source ../.env.test
export BACKEND_URL=http://127.0.0.1:3001
set +a
npm install
npm run dev
```

## Quick checks
```bash
curl http://127.0.0.1:3001/health

curl -H 'Authorization: Bearer <BACKEND_AUTH_TOKEN>' \
  http://127.0.0.1:3001/token-info

curl -H 'Authorization: Bearer <BACKEND_AUTH_TOKEN>' \
  http://127.0.0.1:3001/wallet-status/0x4C484a4e09E178804A3D3b161ea3f573472bEad2

curl -X POST http://127.0.0.1:3001/mint \
  -H 'content-type: application/json' \
  -H 'Authorization: Bearer <BACKEND_AUTH_TOKEN>' \
  -d '{"wallet":"0x4C484a4e09E178804A3D3b161ea3f573472bEad2","slots":1}'

curl -H 'Authorization: Bearer <MCP_AUTH_TOKEN>' \
  http://127.0.0.1:3002/tools

curl -H 'Authorization: Bearer <MCP_AUTH_TOKEN>' \
  http://127.0.0.1:3002/tool/token_info
```
