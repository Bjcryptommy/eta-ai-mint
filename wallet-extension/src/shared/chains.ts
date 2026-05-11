export type ChainConfig = {
  id: number;
  name: string;
  rpcUrl: string;
  symbol: string;
  explorer: string;
  testnet?: boolean;
};

export const DEFAULT_CHAINS: ChainConfig[] = [
  { id: 11155111, name: 'Sepolia', rpcUrl: import.meta.env.VITE_DEFAULT_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com', symbol: 'ETH', explorer: 'https://sepolia.etherscan.io', testnet: true },
  { id: 1, name: 'Ethereum', rpcUrl: import.meta.env.VITE_DEFAULT_ETH_RPC_URL || 'https://ethereum-rpc.publicnode.com', symbol: 'ETH', explorer: 'https://etherscan.io' },
  { id: 56, name: 'BSC', rpcUrl: import.meta.env.VITE_DEFAULT_BSC_RPC_URL || 'https://bsc-dataseed.binance.org', symbol: 'BNB', explorer: 'https://bscscan.com' }
];

export function getChainById(chainId: number, chains: ChainConfig[] = DEFAULT_CHAINS) {
  return chains.find((chain) => chain.id === chainId) ?? chains[0];
}
