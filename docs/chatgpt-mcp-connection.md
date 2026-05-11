# ChatGPT / OpenAI MCP connection prep

## What changed

The repo now has two MCP-facing layers:

1. `mcp/src/index.js`
   - HTTP wrapper for local/manual testing
2. `mcp/src/stdio.js`
   - real MCP stdio server for ChatGPT/OpenAI-compatible MCP clients

## Why this matters

ChatGPT/OpenAI MCP integration should talk to a real MCP server, not a custom REST wrapper.
That is what `stdio.js` provides.

## Tool surface exposed to ChatGPT

- `token_info`
- `authorization_status`
- `mint_quota_get`
- `token_balance`
- `wallet_status`
- `token_mint`
- `tx_status`
- `revoke_info`

## Expected runtime chain

ChatGPT/OpenAI client
-> MCP stdio server (`mcp/src/stdio.js`)
-> backend relayer (`backend/src/index.js`)
-> Ethereum

## Local run order

### 1. start backend
```bash
cd /Users/bolajioluwatomiwa/Documents/projects/eta-ai-mint/backend
set -a
source ../.env.test
set +a
npm install
npm run dev
```

### 2. MCP stdio env
The MCP stdio server needs backend access and backend auth:

```bash
cd /Users/bolajioluwatomiwa/Documents/projects/eta-ai-mint/mcp
set -a
source ../.env.test
export BACKEND_URL=http://127.0.0.1:3001
set +a
npm install
npm run mcp:stdio
```

## Example MCP client config

Use this shape for MCP-capable clients that spawn a stdio server:

```json
{
  "mcpServers": {
    "eta-ai-mint": {
      "command": "node",
      "args": [
        "/Users/bolajioluwatomiwa/Documents/projects/eta-ai-mint/mcp/src/stdio.js"
      ],
      "env": {
        "BACKEND_URL": "http://127.0.0.1:3001",
        "BACKEND_AUTH_TOKEN": "<your-backend-auth-token>"
      }
    }
  }
}
```

If the client can launch through npm instead, this also works:

```json
{
  "mcpServers": {
    "eta-ai-mint": {
      "command": "npm",
      "args": [
        "run",
        "mcp:stdio",
        "--prefix",
        "/Users/bolajioluwatomiwa/Documents/projects/eta-ai-mint/mcp"
      ],
      "env": {
        "BACKEND_URL": "http://127.0.0.1:3001",
        "BACKEND_AUTH_TOKEN": "<your-backend-auth-token>"
      }
    }
  }
}
```

## Recommended ChatGPT tool behavior

For a mint request like:
- "mint me 1 slot"
- "mint me 10 slots"

The assistant should usually do:
1. `authorization_status`
2. `mint_quota_get`
3. `token_mint`
4. optionally `tx_status`

## Suggested assistant policy

- never mint if `authorization_status.delegated` is false
- never mint if quota is lower than requested slots
- return tx hash clearly after mint
- mention remaining quota after success
- mention revoke path when relevant

## Current status

This is now prepared for ChatGPT/OpenAI MCP connection at the interface level.
The next step is plugging this stdio MCP server into the actual OpenAI/ChatGPT MCP client surface you want to use.
