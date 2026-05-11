'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { getTokenInfo, getWalletStatus } from '@/lib/api';
import { appConfig } from '@/lib/config';
import { DelegationDebug, TokenInfo, WalletStatus } from '@/lib/types';
import { BrutalButton, BrutalCard, ContractRow, HighlightText, InfoBox, ProofCard, SectionLabel, TagBadge } from './brutal-ui';
import { StatusPanel } from './StatusPanel';
import { HowItWorks } from './HowItWorks';
import { DebugPanel } from './DebugPanel';
import { AddressPill } from './brutal-ui';
import { ClaudeConnectorCard } from './ClaudeConnectorCard';
import { readDelegatedOverride } from '@/lib/wallet-ui-state';

export function HomeClient({ initialTokenInfo }: { initialTokenInfo: TokenInfo | null }) {
  const { address } = useAccount();
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(initialTokenInfo);
  const [walletStatus, setWalletStatus] = useState<WalletStatus | null>(null);
  const [delegationDebug, setDelegationDebug] = useState<DelegationDebug | null>(null);

  async function refresh() {
    const [token, wallet] = await Promise.all([
      getTokenInfo().catch(() => tokenInfo),
      address ? getWalletStatus(address).catch(() => null) : Promise.resolve(null),
    ]);
    setTokenInfo(token);
    const delegatedOverride = address ? readDelegatedOverride(address) : null;
    setWalletStatus(wallet ? { ...wallet, delegated: delegatedOverride ?? wallet.delegated } : wallet);
  }

  useEffect(() => { refresh(); }, [address]);

  return (
    <div className="space-y-12">
      <section className="space-y-6 pt-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="h-3 w-3 rounded-sm border-[3px] border-ink bg-mint" />
          <SectionLabel tone="mint">EIP-7702</SectionLabel>
          <SectionLabel tone="black">MCP</SectionLabel>
          <SectionLabel tone="light">CLAUDE MINT</SectionLabel>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr] lg:items-start">
          <div>
            <h1 className="display-text text-[clamp(4rem,10vw,7rem)] leading-[0.9] text-fog">MINT <HighlightText tone="mint">$CATSHIT</HighlightText><br />THROUGH <HighlightText tone="mint">CLAUDE</HighlightText></h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-mint md:text-lg">One wallet signature. Claude can mint through your approved session. 🐾</p>
            <p className="mt-4 max-w-3xl text-[15px] leading-8 text-fog/84 md:text-base">Add CATSHIT to Claude, link your wallet once, and let Claude check your quota or request a mint. Your private key is never exposed.</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <BrutalButton href="/connect" tone="mint">Connect to Claude</BrutalButton>
              <BrutalButton href="/proof" tone="light">View Proof</BrutalButton>
              {address ? <AddressPill value={address} /> : null}
            </div>
          </div>
          <BrutalCard tone="light" className="grid-bg space-y-4 text-ink">
            <div className="flex items-center justify-between gap-3">
              <TagBadge tone="purple">CAT TERMINAL</TagBadge>
              <div className="mono-ui text-xs font-bold uppercase tracking-[0.22em] text-ink/60">🐾 cat terminal</div>
            </div>
            <div className="display-text text-4xl leading-none">Dark Cat Alley.<br />Organized Chaos.</div>
            <InfoBox title="cat terminal" tone="light">&gt; wallet detected<br />&gt; Claude connector ready<br />&gt; MCP route armed</InfoBox>
            <InfoBox title="launch lane" tone="mint">Wallet and site logic now use the configured chain environment. No hardcoded fallback chain.</InfoBox>
          </BrutalCard>
        </div>
      </section>

      <section id="status" className="grid gap-5 lg:grid-cols-[1.1fr,0.9fr]">
        <StatusPanel status={walletStatus} tokenInfo={tokenInfo} />
        <ClaudeConnectorCard compact />
      </section>

      <DebugPanel debug={delegationDebug} />

      <HowItWorks />

      <section className="space-y-5">
        <BrutalCard tone="black">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="display-text text-4xl leading-none text-mint">Why this is safe</div>
            </div>
          </div>
          <div className="mt-6 space-y-4 text-sm leading-7 text-fog md:text-base">
            <div>• The contract only accepts relayer-routed mint calls. <HighlightText tone="mint">tx.origin == RELAYER</HighlightText></div>
            <div>• Tokens can only mint to the linked wallet. <HighlightText tone="proof">msg.sender</HighlightText></div>
            <div>• <HighlightText tone="green">MintDelegate</HighlightText> has no admin keys, storage, or upgrade path.</div>
            <div>• You can revoke delegation anytime from the Revoke page. <HighlightText tone="danger">0x0</HighlightText></div>
          </div>
          <details className="mt-6 rounded-[18px] border-[3px] border-mint bg-panel-2 p-4 text-fog">
            <summary className="mono-ui cursor-pointer text-xs font-bold uppercase tracking-[0.24em]">Contract info</summary>
            <div className="mt-4">
              <ContractRow label="token" value={tokenInfo?.tokenAddress || 'Coming soon'} href={tokenInfo?.tokenAddress ? `${appConfig.explorerBase}/address/${tokenInfo.tokenAddress}` : undefined} />
              <ContractRow label="delegate" value={tokenInfo?.delegateAddress || appConfig.delegateAddress || 'Coming soon'} href={tokenInfo?.delegateAddress ? `${appConfig.explorerBase}/address/${tokenInfo.delegateAddress}` : undefined} />
              <ContractRow label="relayer" value={tokenInfo?.relayerAddress || 'Coming soon'} />
              <ContractRow label="chain" value={`${appConfig.networkName} · chainId ${appConfig.chainId}`} />
              <ContractRow label="mcp endpoint" value={appConfig.mcpPublicUrl || appConfig.mcpEndpoint} />
            </div>
          </details>
        </BrutalCard>
      </section>

      <section className="space-y-5">
        <SectionLabel tone="black">Don’t trust. Verify.</SectionLabel>
        <div className="grid gap-5 md:grid-cols-3">
          <ProofCard title="EIP-7702" badge="VERIFIABLE">Users sign one authorization. Their wallet delegates to the MintDelegate.</ProofCard>
          <ProofCard title="Fair Launch" badge="VERIFIABLE">No presale. Mint proceeds support the launch pool. LP is locked after launch.</ProofCard>
          <ProofCard title="AI Agent" badge="VERIFIABLE">Claude can request mints through MCP. The contract still enforces recipient, quota, and mint rules.</ProofCard>
        </div>
      </section>
    </div>
  );
}
