# Deploy notes

## Important constructor dependency

The token stores `MINT_DELEGATE` as an immutable.
The delegate stores `TOKEN` as an immutable.

That means deployment must be done carefully.

## Recommended deployment pattern

1. predict the token address
2. deploy delegate with predicted token address
3. deploy token with actual delegate address
4. save both addresses to config/env
5. verify both contracts

This keeps the reference-style immutables while still allowing clean deployment.
