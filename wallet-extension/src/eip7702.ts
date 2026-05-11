import { createWalletClient, custom, encodeFunctionData, http, isAddressEqual, zeroAddress, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import type { ChainConfig } from './shared/chains';

const DELEGATION_PREFIX = '0xef0100';

export async function signDelegationAuthorization(params: { privateKey: Hex; chain: ChainConfig; delegate: Address; executor?: 'self' | Address; }) {
  const account = privateKeyToAccount(params.privateKey);
  const client = createWalletClient({ account, chain: { id: params.chain.id, name: params.chain.name, nativeCurrency: { decimals: 18, name: params.chain.symbol, symbol: params.chain.symbol }, rpcUrls: { default: { http: [params.chain.rpcUrl] } } }, transport: http(params.chain.rpcUrl) });
  return client.signAuthorization({ account, contractAddress: params.delegate, executor: params.executor ?? 'self' });
}

export async function activateDelegation(params: { privateKey: Hex; chain: ChainConfig; signedAuthorization: any; }) {
  const account = privateKeyToAccount(params.privateKey);
  const client = createWalletClient({ account, chain: { id: params.chain.id, name: params.chain.name, nativeCurrency: { decimals: 18, name: params.chain.symbol, symbol: params.chain.symbol }, rpcUrls: { default: { http: [params.chain.rpcUrl] } } }, transport: http(params.chain.rpcUrl) });
  return client.sendTransaction({ account, chain: client.chain, to: account.address, value: 0n, authorizationList: [params.signedAuthorization] });
}

export function parseDelegationFromCode(code?: Hex, knownDelegate?: Address) {
  if (!code || code === '0x') return { state: 'not_delegated' as const, delegate: null };
  if (!code.startsWith(DELEGATION_PREFIX)) return { state: 'delegated_unknown' as const, delegate: null };
  const delegate = (`0x${code.slice(8, 48)}`) as Address;
  if (delegate === zeroAddress) return { state: 'revoked' as const, delegate };
  return { state: knownDelegate && isAddressEqual(delegate, knownDelegate) ? 'delegated_known' as const : 'delegated_unknown' as const, delegate };
}
