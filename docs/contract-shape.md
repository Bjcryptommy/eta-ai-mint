# Contract shape

## Current scaffold

This follows the Dogeshit reference pattern closely:

- token contract enforces relayer-only origin
- token contract enforces delegated-wallet codehash match
- mint always goes to `msg.sender`
- wallet mint cap enforced on-chain
- total mint cap enforced on-chain
- delegate charges fee then calls token mint
- delegate supports `mint()` and `batchMint()` only

## Current temporary branding

- name: `Test`
- symbol: `TST`

The actual Solidity contract file is named `TestToken.sol` for now so renaming later is easy.

## File split choice

We are using multiple files, not one giant file.

Reason:
- easier testing
- easier audit
- cleaner relayer/backend integration
- easier future swap from test branding to real branding

But the logic is still simple, like the reference.
