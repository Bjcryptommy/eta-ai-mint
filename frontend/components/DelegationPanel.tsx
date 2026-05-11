'use client';

import { useMemo, useState } from 'react';
import { useWalletClient } from 'wagmi';
import { activateDelegation, revokeDelegation } from '@/lib/delegation';
import { appConfig } from '@/lib/config';
import { writeDelegatedOverride } from '@/lib/wallet-ui-state';
import { makePendingDebug, makeSuccessDebug, normalizeDebugError } from '@/lib/debug';
import { DelegationDebug, WalletStatus } from '@/lib/types';
import { ActionBlock } from './StatusPanel';
import { BrutalButton, InfoBox, TagBadge } from './brutal-ui';

declare global {
  interface Window {
    catshitWallet?: any;
  }
}

function getCatshitProvider(walletClient: any) {
  if (walletClient) return walletClient;
  if (typeof window !== 'undefined' && window.catshitWallet) return window.catshitWallet;
  return null;
}

export function DelegationPanel({ wallet, status, onRefresh, onDebug }: { wallet?: `0x${string}`; status: WalletStatus | null; onRefresh: () => Promise<void> | void; onDebug: (debug: DelegationDebug) => void; }) {
  const { data: walletClient } = useWalletClient();
  const [pending, setPending] = useState<'delegate' | 'revoke' | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const label = useMemo(() => {
    if (!wallet) return 'connect a wallet first.';
    if (status?.delegated) return 'delegation is live. ur wallet is armed for MCP mint calls.';
    return 'sign a single authorization and activate it once. after that GPT can ask the relayer to mint on ur behalf.';
  }, [wallet, status?.delegated]);

  async function run(action: 'delegate' | 'revoke') {
    const provider = getCatshitProvider(walletClient as any);
    if (!provider || !wallet) return setError('connect a compatible wallet first.');
    setPending(action); setError(null); setTxHash(null);
    onDebug(makePendingDebug(action, wallet, provider));
    try {
      const hash = action === 'delegate'
        ? await activateDelegation(provider, wallet, appConfig.delegateAddress as `0x${string}`)
        : await revokeDelegation(provider, wallet);
      writeDelegatedOverride(wallet, action === 'delegate');
      setTxHash(hash);
      onDebug(makeSuccessDebug(action, wallet, provider, hash));
      await onRefresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : `${action} failed`;
      onDebug(normalizeDebugError(action, wallet, provider, err));
      setError(message);
    } finally {
      setPending(null);
    }
  }

  return (
    <ActionBlock title="delegation console" badge={<TagBadge tone={status?.delegated ? 'mint' : 'danger'}>{status?.delegated ? 'active' : 'not active'}</TagBadge>}>
      <div className="cat-divider mb-4 inline-block pr-10">
        <TagBadge tone="black">CAT SCANNER</TagBadge>
      </div>
      <InfoBox title="current read" tone="dark">{label}</InfoBox>
      <div className="mt-4 flex flex-wrap gap-3">
        <BrutalButton tone="mint" onClick={() => run('delegate')} disabled={!wallet || pending !== null || !!status?.delegated}>{pending === 'delegate' ? 'activating…' : status?.delegated ? 'delegation active' : 'activate delegation'}</BrutalButton>
        <BrutalButton tone="dark" onClick={() => run('revoke')} disabled={!wallet || pending !== null || !status?.delegated}>{pending === 'revoke' ? 'revoking…' : status?.delegated ? 'sign & revoke' : 'already revoked'}</BrutalButton>
      </div>
      <div className="mt-4 space-y-3 text-sm font-semibold text-fog/90">
        <div>delegate target: <span className="mono-ui text-mint">{appConfig.delegateAddress || 'placeholder-from-env'}</span></div>
        {txHash ? <div>tx hash: <a className="underline decoration-2 underline-offset-4" href={`${appConfig.explorerBase}/tx/${txHash}`} target="_blank">{txHash}</a></div> : null}
        {error ? <div className="rounded-[18px] brutal-border bg-danger/80 p-3 text-ink">{error}</div> : null}
      </div>
    </ActionBlock>
  );
}
