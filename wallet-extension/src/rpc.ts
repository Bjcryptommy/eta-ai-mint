import { createPublicClient, http, createWalletClient, erc20Abi, formatUnits, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import type { ChainConfig } from './shared/chains';

const DEV_LOGS = Boolean(import.meta.env.DEV || import.meta.env.VITE_DEV === 'true');

const RPC_FALLBACKS: Record<number, string> = {
  11155111: 'https://ethereum-sepolia-rpc.publicnode.com',
  1: 'https://ethereum-rpc.publicnode.com',
  56: 'https://bsc-dataseed.binance.org',
  97: 'https://data-seed-prebsc-1-s1.binance.org:8545',
};

function debugLog(message: string, extra?: Record<string, unknown>) {
  if (!DEV_LOGS) return;
  console.info(`[catshit-wallet][rpc] ${message}`, extra || {});
}

export function resolveRpcUrl(chain: ChainConfig) {
  return chain.rpcUrl || RPC_FALLBACKS[chain.id] || 'https://ethereum-sepolia-rpc.publicnode.com';
}

function viemChain(chain: ChainConfig) {
  const rpcUrl = resolveRpcUrl(chain);
  return {
    id: chain.id,
    name: chain.name,
    nativeCurrency: { decimals: 18, name: chain.symbol, symbol: chain.symbol },
    rpcUrls: { default: { http: [rpcUrl] } },
  };
}

export function getPublicClient(chain: ChainConfig) {
  return createPublicClient({ chain: viemChain(chain), transport: http(resolveRpcUrl(chain)) });
}

export function getWalletClient(chain: ChainConfig, privateKey: Hex) {
  const account = privateKeyToAccount(privateKey);
  return createWalletClient({ account, chain: viemChain(chain), transport: http(resolveRpcUrl(chain)) });
}

export async function getNativeBalance(chain: ChainConfig, address: Address) {
  const rpcUrl = resolveRpcUrl(chain);
  debugLog('native balance request', { chainName: chain.name, chainId: chain.id, rpcUrl, account: address });
  try {
    const client = getPublicClient({ ...chain, rpcUrl });
    const balance = await client.getBalance({ address });
    debugLog('native balance success', { chainId: chain.id, account: address });
    return { raw: balance, formatted: formatUnits(balance, 18), rpcUrl };
  } catch (error) {
    debugLog('native balance error', { chainName: chain.name, chainId: chain.id, rpcUrl, account: address, error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

export async function getTokenBalance(chain: ChainConfig, token: Address, owner: Address, decimals = 18) {
  const client = getPublicClient(chain);
  const balance = await client.readContract({ address: token, abi: erc20Abi, functionName: 'balanceOf', args: [owner] });
  return { raw: balance, formatted: formatUnits(balance, decimals) };
}

export async function getTokenMetadata(chain: ChainConfig, token: Address) {
  const client = getPublicClient(chain);
  const [name, symbol, decimals] = await Promise.all([
    client.readContract({ address: token, abi: erc20Abi, functionName: 'name' }),
    client.readContract({ address: token, abi: erc20Abi, functionName: 'symbol' }),
    client.readContract({ address: token, abi: erc20Abi, functionName: 'decimals' })
  ]);
  return { name, symbol, decimals: Number(decimals) };
}
