'use client';

import { useEffect, useMemo, useState } from 'react';

import { useAccount, useWalletClient } from 'wagmi';
import { activateDelegation } from '@/lib/delegation';
import { appConfig } from '@/lib/config';
import { getWalletStatus } from '@/lib/api';
import { readDelegatedOverride, readSignedIn, writeDelegatedOverride, writeSignedIn } from '@/lib/wallet-ui-state';
import { BrutalButton, BrutalCard, InfoBox, SectionLabel, TagBadge } from './brutal-ui';

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

export function ConnectWalletConsole() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [pending, setPending] = useState<'signin' | 'delegate' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [delegated, setDelegated] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);

  const signInMessage = useMemo(() => {
    if (!address) return '';
    return [
      'Sign in to CATSHIT',
      `Wallet: ${address}`,
      `Chain ID: ${appConfig.chainId}`,
      `Time: ${new Date().toISOString()}`,
      'This proves you control this wallet for CATSHIT mint access.',
    ].join('\n');
  }, [address]);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      if (!address || !isConnected) {
        setSignedIn(false);
        setDelegated(false);
        return;
      }

      const storedSignedIn = readSignedIn(address);
      const delegatedOverride = readDelegatedOverride(address);
      setSignedIn(storedSignedIn);
      if (delegatedOverride !== null) setDelegated(delegatedOverride);
      setLoadingStatus(true);
      try {
        const status = await getWalletStatus(address);
        if (!cancelled) {
          const delegatedNow = readDelegatedOverride(address) ?? Boolean(status.delegated);
          setDelegated(delegatedNow);
          if (delegatedNow) {
            setSignedIn(true);
            writeSignedIn(address, true);
          }
        }
      } catch {
        if (!cancelled) setDelegated(false);
      } finally {
        if (!cancelled) setLoadingStatus(false);
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [address, isConnected]);

  async function run(action: 'signin' | 'delegate') {
    const provider = getCatshitProvider(walletClient as any);
    if (!provider || !address) {
      setMessage('Connect CATSHIT Wallet first.');
      return;
    }
    setPending(action);
    setMessage(null);
    if (action !== 'signin') setSignature(null);
    if (action === 'signin') setTxHash(null);

    try {
      if (action === 'signin') {
        await provider.request({ method: 'eth_requestAccounts' });
        const sig = await provider.request({ method: 'personal_sign', params: [signInMessage, address] });
        setSignature(sig);
        setSignedIn(true);
        writeSignedIn(address, true);
        setMessage('Sign-in request approved in CATSHIT Wallet.');
        return;
      }
      const hash = await activateDelegation(provider, address, appConfig.delegateAddress as `0x${string}`);
      setDelegated(true);
      writeDelegatedOverride(address, true);
      setTxHash(hash);
      setMessage('Delegation activated in CATSHIT Wallet.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `${action} failed`);
    } finally {
      setPending(null);
    }
  }

  const badgeTone = signedIn || delegated ? 'mint' : isConnected ? 'mint' : 'danger';
  const badgeLabel = delegated ? 'delegated' : signedIn ? 'signed in' : isConnected ? 'wallet connected' : 'not connected';

  return (
    <BrutalCard tone="light" className="text-ink">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <SectionLabel tone="purple">wallet actions</SectionLabel>
          <div className="mt-3 display-text text-4xl leading-none">CONNECT + SIGN + DELEGATE</div>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-ink/80">
            Do everything from the website. CATSHIT Wallet should only open to approve what you start here.
          </p>
        </div>
        <TagBadge tone={badgeTone}>{badgeLabel}</TagBadge>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <InfoBox title="connected wallet" tone="light">{address || 'Connect CATSHIT Wallet first.'}</InfoBox>
        <InfoBox title="target chain" tone="light">{appConfig.networkName} · chainId {appConfig.chainId}</InfoBox>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <BrutalButton tone="dark" onClick={() => run('signin')} disabled={!isConnected || pending !== null || signedIn}>
          {pending === 'signin' ? 'waiting for signature…' : signedIn ? 'signed in' : 'sign in'}
        </BrutalButton>
        <BrutalButton tone="mint" onClick={() => run('delegate')} disabled={!isConnected || pending !== null || !appConfig.delegateAddress || delegated || loadingStatus}>
          {pending === 'delegate' ? 'waiting for approval…' : loadingStatus ? 'checking status…' : delegated ? 'delegate activated' : 'activate delegate'}
        </BrutalButton>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <InfoBox title="what happens" tone="mint">
          Returning wallet? We now restore prior sign-in and delegation status after refresh.
        </InfoBox>
        <InfoBox title="delegate target" tone="light">{appConfig.delegateAddress || 'Delegate address not configured.'}</InfoBox>
      </div>

      {message ? <div className="mt-5 rounded-[18px] border-[3px] border-ink bg-mint/30 p-4 text-sm font-semibold">{message}</div> : null}
      {signature ? <div className="mt-4 break-all rounded-[18px] border-[3px] border-ink bg-white p-4 text-xs font-semibold">Signature: {signature}</div> : null}
      {txHash ? <div className="mt-4 break-all rounded-[18px] border-[3px] border-ink bg-white p-4 text-xs font-semibold">Tx: <a className="underline decoration-2 underline-offset-4" href={`${appConfig.explorerBase}/tx/${txHash}`} target="_blank">{txHash}</a></div> : null}
    </BrutalCard>
  );
}
