const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || '11155111');

const chainMeta: Record<number, { name: string; slug: string; symbol: string; explorer: string }> = {
  1: { name: 'Ethereum Mainnet', slug: 'ethereum', symbol: 'ETH', explorer: 'https://etherscan.io' },
  56: { name: 'BSC Mainnet', slug: 'bsc', symbol: 'BNB', explorer: 'https://bscscan.com' },
  97: { name: 'BSC Testnet', slug: 'bsc testnet', symbol: 'tBNB', explorer: 'https://testnet.bscscan.com' },
  11155111: { name: 'Sepolia', slug: 'sepolia', symbol: 'ETH', explorer: 'https://sepolia.etherscan.io' },
};

const resolvedChain = chainMeta[chainId] || chainMeta[11155111];

export const appConfig = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'CATSHIT',
  symbol: process.env.NEXT_PUBLIC_TOKEN_SYMBOL || 'CATSHIT',
  chainId,
  targetChainHex: `0x${chainId.toString(16)}`,
  networkName: process.env.NEXT_PUBLIC_CHAIN_NAME || process.env.NEXT_PUBLIC_NETWORK_NAME || resolvedChain.name,
  networkSlug: resolvedChain.slug,
  nativeSymbol: resolvedChain.symbol,
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || '',
  tokenAddress: process.env.NEXT_PUBLIC_TOKEN_ADDRESS || '',
  delegateAddress: process.env.NEXT_PUBLIC_DELEGATE_ADDRESS || process.env.NEXT_PUBLIC_MINT_DELEGATE_ADDRESS || '',
  explorerBase: process.env.NEXT_PUBLIC_BLOCK_EXPLORER_BASE || resolvedChain.explorer,
  launchChainName: process.env.NEXT_PUBLIC_LAUNCH_CHAIN_NAME || resolvedChain.slug,
  launchChainId: Number(process.env.NEXT_PUBLIC_LAUNCH_CHAIN_ID || String(chainId)),
  mcpEndpoint: process.env.NEXT_PUBLIC_MCP_ENDPOINT || 'https://mcp.catshit.meme',
  mcpPublicUrl: process.env.NEXT_PUBLIC_MCP_PUBLIC_URL || process.env.VITE_MCP_PUBLIC_URL || '',
  launchStatus: process.env.NEXT_PUBLIC_LAUNCH_STATUS || 'mainnet/testnet',
};

export function shortAddr(value?: string | null, size = 4) {
  if (!value) return '—';
  return `${value.slice(0, 6)}…${value.slice(-size)}`;
}
