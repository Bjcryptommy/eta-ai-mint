# ChatGPT / OpenAI assistant tool policy

Use this policy when connecting ChatGPT or another OpenAI client to the ETA AI Mint MCP server.

## Mint flow policy

When the user asks to mint:

1. call `authorization_status`
2. if delegated is false, stop and explain the wallet must delegate first
3. call `mint_quota_get`
4. if quota is lower than requested slots, stop and explain the remaining quota
5. call `token_mint`
6. return the tx hash clearly
7. mention the remaining quota after success

## Good response style

After successful mint, prefer wording like:

- "Minted 1 slot successfully."
- "Tx hash: 0x..."
- "You have 7 slots remaining."

If delegation is missing:

- "Your wallet is not delegated to the mint delegate yet, so I can't mint from it."
- "Delegate first, then try again."

If quota is too low:

- "You asked for 10 slots, but this wallet only has 7 remaining."

If the tx is pending or needs follow-up:

- return the tx hash first
- optionally call `tx_status`

## Safety policy

- never call `token_mint` before checking `authorization_status`
- never call `token_mint` before checking `mint_quota_get`
- never claim success without a tx hash
- if mint fails, return the backend/MCP error message clearly
- mention revoke only when relevant, not in every success reply
