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
  const [statusText, setStatusText] = useState('Wallet not connected');

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      if (!address || !isConnected) {
        setDelegated(false);
        setStatusText('Wallet not connected');
        return;
      }
      const override = readDelegatedOverride(address);
      if (override !== null) setDelegated(override);
      setStatusText('Wallet connected');
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
    if (!provider || !address) return setError('Connect your wallet first.');
    if (!delegated) return setError('Delegation is already off.');
    setPending(true);
    setError(null);
    setTxHash(null);
    setStatusText('Wallet connected');
    try {
      const hash = await revokeDelegation(provider, address);
      setTxHash(hash);
      setDelegated(false);
      setStatusText('Revoked successfully');
      writeDelegatedOverride(address, false);
    } catch (err) {
      setStatusText('Revoke failed');
      setError(err instanceof Error ? err.message : 'Revoke failed');
    } finally {
      setPending(false);
    }
  }

  function goBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.href = '/connect';
  }

  return (
    <BrutalCard>
      <div className="space-y-4">
        <SectionLabel tone="danger">ESCAPE HATCH</SectionLabel>
        <div className="display-text text-[clamp(3.8rem,9vw,6rem)] leading-[0.88]">Revoke Delegation</div>
        <p className="max-w-3xl text-base leading-7">Turn off Claude minting access for your wallet. This points your EIP-7702 authorization back to the zero address. Escape hatch ready. You stay in control. 🐾</p>
        <div className="flex flex-wrap gap-3">
          <BrutalButton href="/#status" tone="gold">Wallet Status</BrutalButton>
          <BrutalButton tone="danger" onClick={handleRevoke} disabled={pending || loading || !delegated}>{pending ? 'Revoking…' : loading ? 'Checking…' : delegated ? 'Revoke Delegation' : 'Already Revoked'}</BrutalButton>
          <BrutalButton tone="light" onClick={goBack}>Back</BrutalButton>
        </div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <InfoBox title="Current Delegation">{loading ? 'Checking current wallet state…' : delegated ? 'Delegation is active.' : 'Delegation is currently off.'}</InfoBox>
        <InfoBox title="Target Revoke Address">0x0000000000000000000000000000000000000000</InfoBox>
        <InfoBox title="Status">{statusText}</InfoBox>
        <InfoBox title="Transaction Hash">{txHash ? <a className="underline decoration-2 underline-offset-4 break-all" href={`${appConfig.explorerBase}/tx/${txHash}`} target="_blank">{txHash}</a> : '—'}</InfoBox>
      </div>
      {error ? <div className="mt-4 rounded-2xl brutal-border bg-danger/80 p-4 text-sm font-semibold">{error}</div> : null}
    </BrutalCard>
  );
}
