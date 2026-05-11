# CATSHIT Wallet Extension

Small MV3 CATSHIT browser wallet for EVM chains with CATSHIT-specific EIP-7702 delegation tooling.

## Stack
- React + TypeScript + Vite
- Chrome Extension Manifest V3
- viem for EVM logic
- local encrypted vault with WebCrypto AES-GCM + PBKDF2

## MVP included
- create wallet
- import by mnemonic or private key
- local encrypted storage
- lock / unlock
- multi-network basics
- dApp connection request flow
- personal sign / typed data / tx request confirmations
- EIP-7702 sign / activate / revoke page
- connected sites management

## Install
```bash
cd wallet-extension
npm install
```

## Build
```bash
npm run build
```

## Load in Chrome
1. Open `chrome://extensions`
2. Enable Developer Mode
3. Click **Load unpacked**
4. Select `wallet-extension/dist`

## Configure RPCs
Copy `.env.example` to `.env` and adjust RPC URLs if needed.

## Connect to CATSHIT site
- install/load the extension
- open the CATSHIT website
- connect using CATSHIT Wallet via injected provider / EIP-6963 discovery
- approve the origin in the extension popup

## Test EIP-7702
- switch to BSC testnet or Sepolia depending on your test target
- open the **EIP-7702 Delegation** page
- set the delegate address
- sign authorization
- activate delegation
- revoke with zero address when done

## Security notes
- no remote scripts
- no eval
- private keys are never exposed to content scripts
- background validates extension requests
- all sign/send/delegation actions require manual approval
- seed phrase / private key stay local and encrypted at rest

## Limitations
- price/portfolio values are placeholders
- token metadata detection is minimal
- confirmations are popup-based, not separate full-window approval tabs yet
- provider coverage is focused on CATSHIT MVP methods, not every wallet RPC edge case

## Utility test script
```bash
npm run test:utils
```

This checks vault encryption/decryption and delegation parsing utilities.
