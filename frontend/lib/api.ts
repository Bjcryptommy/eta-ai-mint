import { MintResponse, TokenInfo, WalletStatus } from './types';

async function parse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || json?.error?.message || 'request failed');
  return json;
}

export async function getTokenInfo(): Promise<TokenInfo> {
  return parse(await fetch('/api/token-info', { cache: 'no-store' }));
}

export async function getWalletStatus(wallet: string): Promise<WalletStatus> {
  return parse(await fetch(`/api/wallet-status?wallet=${wallet}`, { cache: 'no-store' }));
}

export async function postMint(wallet: string, slots: number): Promise<MintResponse> {
  return parse(await fetch('/api/mint', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ wallet, slots }),
  }));
}

