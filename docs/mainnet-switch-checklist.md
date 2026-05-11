# Mainnet switch checklist

Before switching from testnet to mainnet:

- all Foundry tests passing
- deploy script unchanged
- verification script unchanged
- relayer address finalized
- fee receiver finalized
- team wallet finalized
- LP reserve wallet finalized
- token name/symbol finalized
- mint price finalized
- mint amount finalized
- total cap finalized
- wallet cap finalized
- testnet deploy completed successfully
- testnet verification completed successfully
- delegated mint flow tested end-to-end
- revoke/delegation UX tested
- backend/MCP using env-driven contract addresses only

If all of the above is true, mainnet should be a config switch + deploy + verify flow, not a rewrite.
