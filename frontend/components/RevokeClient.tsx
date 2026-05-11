'use client';

import { useEffect, useState } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { revokeDelegation } from '@/lib/delegation';
import { appConfig } from '@/lib/config';
import { getWalletStatus } from '@/lib/api';
import { BrutalButton, BrutalCard, InfoBox, SectionLabel } from './brutal-ui';
import { readDelegatedOverride, writeDelegatedOverride } from '@/lib/wallet-ui-state';

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

export function RevokeClient() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [pending, setPending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [delegated, setDelegated] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      if (!address || !isConnected) {
        setDelegated(false);
        return;
      }
      const override = readDelegatedOverride(address);
      if (override !== null) setDelegated(override);
      setLoading(true);
      try {
        const status = await getWalletStatus(address);
        if (!cancelled) setDelegated(readDelegatedOverride(address) ?? Boolean(status.delegated));
      } catch {
        if (!cancelled && override === null) setDelegated(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void hydrate();
    return () => { cancelled = true; };
  }, [address, isConnected]);

  async function handleRevoke() {
    const provider = getCatshitProvider(walletClient as any);
    if (!provider || !address) return setError('connect wallet first.');
    if (!delegated) return setError('delegation is already off.');
    setPending(true); setError(null); setTxHash(null);
    try {
      const hash = await revokeDelegation(provider, address);
      setTxHash(hash);
      setDelegated(false);
      writeDelegatedOverride(address, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'revoke failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <BrutalCard>
      <div className="space-y-4">
        <SectionLabel tone="danger">escape hatch</SectionLabel>
        <div className="display-text text-[clamp(3.8rem,9vw,6rem)] leading-[0.88]">REVOKE DELEGATION</div>
        <p className="max-w-3xl text-base leading-7">sign an authorization pointing at 0x0000000000000000000000000000000000000000 and send the tx from your own wallet. this is ur escape hatch. no relayer dependency.</p>
        <div className="flex flex-wrap gap-3">
          <BrutalButton href="/#status" tone="gold">wallet status</BrutalButton>
          <BrutalButton tone="danger" onClick={handleRevoke} disabled={pending || loading || !delegated}>{pending ? 'revoking…' : loading ? 'checking…' : delegated ? 'sign & revoke' : 'already revoked'}</BrutalButton>
          <BrutalButton href="/" tone="light">back</BrutalButton>
        </div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <InfoBox title="current delegation">{loading ? 'checking current wallet state…' : delegated ? 'delegation is currently active.' : 'delegation is currently revoked/off.'}</InfoBox>
        <InfoBox title="target revoke address">0x0000000000000000000000000000000000000000</InfoBox>
        <InfoBox title="status">{address ? 'wallet connected' : 'connect wallet'}</InfoBox>
        <InfoBox title="tx hash">{txHash ? <a className="underline decoration-2 underline-offset-4" href={`${appConfig.explorerBase}/tx/${txHash}`} target="_blank">{txHash}</a> : '—'}</InfoBox>
      </div>
      {error ? <div className="mt-4 rounded-2xl brutal-border bg-danger/80 p-4 text-sm font-semibold">{error}</div> : null}
    </BrutalCard>
  );
}
