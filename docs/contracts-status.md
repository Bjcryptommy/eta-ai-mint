# Contracts status

## Final contract set for MVP

We do **not** need extra on-chain helper/config contracts right now.

Use only:
- `contracts/token/TestToken.sol`
- `contracts/delegate/MintDelegate.sol`
- `contracts/interfaces/IMintableToken.sol`

## Why no extra helper contract yet

The Dogeshit-style flow is intentionally simple:
- token holds the mint rules
- delegate collects fee and forwards mint
- relayer lives off-chain

Adding more on-chain config/admin/helper contracts right now would slow us down and increase risk surface.

## What is finalized in the contract design

- relayer-gated mint via `tx.origin`
- delegated-wallet check via EIP-7702-style codehash
- mint always goes to `msg.sender`
- per-wallet cap on-chain
- total mint cap on-chain
- fixed fee charging in delegate
- no arbitrary execution in delegate
- no owner mint path hidden in the scaffold
- no upgradeability in the scaffold

## Temporary branding

- token name: `Test`
- token symbol: `TST`

These should stay env/config driven at deployment time so swapping later is easy.
