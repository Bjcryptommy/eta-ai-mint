import { WalletClient } from 'viem';
import { DelegationDebug } from './types';

export function getProviderFlags() {
  if (typeof window === 'undefined') return [] as string[];
  const ethereum = (window as Window & { ethereum?: any }).ethereum;
  if (!ethereum) return [] as string[];

  const flags = [
    ethereum.isMetaMask && 'isMetaMask',
    ethereum.isCoinbaseWallet && 'isCoinbaseWallet',
    ethereum.isRainbow && 'isRainbow',
    ethereum.isBraveWallet && 'isBraveWallet',
    ethereum.isTrust && 'isTrust',
  ].filter(Boolean) as string[];

  if (Array.isArray(ethereum.providers)) flags.push(`providers:${ethereum.providers.length}`);
  return flags;
}

export function normalizeDebugError(action: 'delegate' | 'revoke', wallet: string | undefined, walletClient: WalletClient | undefined, error: unknown): DelegationDebug {
  const err = error as any;
  return {
    action,
    outcome: 'error',
    wallet: wallet ?? null,
    walletClientAccount: walletClient?.account?.address ?? null,
    chainLabel: walletClient?.chain ? `${walletClient.chain.name} (${walletClient.chain.id})` : null,
    walletChainId: walletClient?.chain?.id ?? null,
    connectorName: walletClient?.name ?? null,
    providerFlags: getProviderFlags(),
    rawMessage: typeof err?.message === 'string' ? err.message : String(error),
    rawDetails: typeof err?.details === 'string' ? err.details : null,
    rawCode: typeof err?.code !== 'undefined' ? String(err.code) : null,
    rawPayload: safeStringify({
      name: err?.name,
      message: err?.message,
      shortMessage: err?.shortMessage,
      details: err?.details,
      code: err?.code,
      cause: err?.cause,
    }),
    txHash: null,
  };
}

export function makePendingDebug(action: 'delegate' | 'revoke', wallet: string | undefined, walletClient: WalletClient | undefined): DelegationDebug {
  return {
    action,
    outcome: 'pending',
    wallet: wallet ?? null,
    walletClientAccount: walletClient?.account?.address ?? null,
    chainLabel: walletClient?.chain ? `${walletClient.chain.name} (${walletClient.chain.id})` : null,
    walletChainId: walletClient?.chain?.id ?? null,
    connectorName: walletClient?.name ?? null,
    providerFlags: getProviderFlags(),
    rawMessage: null,
    rawDetails: null,
    rawCode: null,
    rawPayload: null,
    txHash: null,
  };
}

export function makeSuccessDebug(action: 'delegate' | 'revoke', wallet: string | undefined, walletClient: WalletClient | undefined, txHash: string): DelegationDebug {
  return {
    ...makePendingDebug(action, wallet, walletClient),
    outcome: 'success',
    txHash,
  };
}

function safeStringify(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
