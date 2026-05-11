'use client';

import { ReactNode, useMemo, useState } from 'react';
import { numberToHex } from 'viem';
import { useAccount, useChainId, useDisconnect, useWalletClient } from 'wagmi';
import { TokenInfo, WalletStatus } from '@/lib/types';
import { appConfig } from '@/lib/config';
import { AddressPill, BrutalCard, StatusRow } from './brutal-ui';
import { WalletConnectAction } from './WalletConnectAction';

export function StatusPanel({ status, tokenInfo }: { status: WalletStatus | null; tokenInfo: TokenInfo | null }) {
  const { isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const activeChainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);

  const wrongChain = isConnected && !!activeChainId && activeChainId !== appConfig.chainId;
  const switchLabel = useMemo(() => `Switch to ${appConfig.networkName}`, []);

  async function requestChainSwitch() {
    if (!walletClient) return;
    setSwitching(true);
    setSwitchError(null);
    try {
      await (walletClient as any).request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: numberToHex(appConfig.chainId) }],
      });
    } catch (error: any) {
      const code = error?.code;
      if (code === 4902) {
        await (walletClient as any).request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: numberToHex(appConfig.chainId),
            chainName: appConfig.networkName,
            rpcUrls: appConfig.rpcUrl ? [appConfig.rpcUrl] : [],
            blockExplorerUrls: appConfig.explorerBase ? [appConfig.explorerBase] : [],
            nativeCurrency: {
              name: appConfig.nativeSymbol,
              symbol: appConfig.nativeSymbol,
              decimals: 18,
            },
          }],
        });
      } else {
        setSwitchError(error?.message || 'Chain switch failed.');
      }
    } finally {
      setSwitching(false);
    }
  }

  return (
    <BrutalCard tone="light" className="grid-bg text-ink" >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="display-text text-4xl leading-none">UR STATUS</div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/75">Connect your wallet to inspect whether Claude/CATSHIT already linked and delegated it. This page is now status-first, not the approval surface.</p>
        </div>
        <WalletConnectAction label="CONNECT UR WALLET" tone="mint" />
      </div>
      <div className="mt-6 space-y-1">
        <StatusRow label="wallet" value={status?.wallet ? <AddressPill value={status.wallet} /> : 'connect wallet'} />
        <StatusRow label="network" value={isConnected ? `${appConfig.networkName}${activeChainId ? ` · chainId ${activeChainId}` : ''}` : `${appConfig.networkName} · chainId ${appConfig.chainId}`} />
        <StatusRow label="delegated to" value={status?.delegated ? 'MintDelegate active' : 'nothing active yet'} />
        <StatusRow label="ur bag" value={status?.tokenBalance ?? '—'} />
        <StatusRow label="public mint" value={`0 / ${tokenInfo?.maxTotalMints ?? '210000000000'}`} />
        <StatusRow label="remaining slots" value={tokenInfo?.remaining ?? '—'} />
        <StatusRow label="quota" value={status?.quotaRemaining ?? '—'} />
      </div>
      {wrongChain ? (
        <div className="mt-5 rounded-[18px] border-[3px] border-ink bg-mint p-4 text-sm font-bold text-ink">
          <div>Wrong network detected.</div>
          <div className="mt-1 text-xs uppercase tracking-[0.18em]">Target: {appConfig.networkName} · chainId {appConfig.chainId}</div>
          <button className="mt-3 rounded-xl border-[3px] border-ink bg-ink px-4 py-2 text-xs uppercase tracking-[0.18em] text-mint" onClick={requestChainSwitch} disabled={switching}>
            {switching ? 'switching…' : switchLabel}
          </button>
          {switchError ? <div className="mt-2 text-xs text-red-700">{switchError}</div> : null}
        </div>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t-[3px] border-mint pt-4 text-sm font-semibold text-ink/80"><div>{isConnected ? 'wallet connected. if Claude finished auth already, this page will reflect it.' : 'connect ur wallet here only to inspect status.'}</div>{isConnected ? <button className="rounded-xl border-[3px] border-ink bg-light-card px-4 py-2 text-xs uppercase tracking-[0.18em] text-ink" onClick={() => disconnect()}>disconnect</button> : null}</div>
    </BrutalCard>
  );
}

export function ActionBlock({ title, children, badge }: { title: string; badge?: ReactNode; children: ReactNode }) {
  return (
    <BrutalCard>
      <div className="flex items-start justify-between gap-3">
        <div className="display-text text-3xl leading-none">{title}</div>
        {badge}
      </div>
      <div className="mt-4">{children}</div>
    </BrutalCard>
  );
}
