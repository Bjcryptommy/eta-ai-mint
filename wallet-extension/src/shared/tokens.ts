import type { TokenEntry } from './types';

export const DEFAULT_TOKENS: TokenEntry[] = [
  {
    chainId: 56,
    address: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 18
  },
  {
    chainId: 1,
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6
  },
  {
    chainId: 11155111,
    address: '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6
  }
];

export function getDefaultTokensForChain(chainId: number) {
  return DEFAULT_TOKENS.filter((token) => token.chainId === chainId);
}
