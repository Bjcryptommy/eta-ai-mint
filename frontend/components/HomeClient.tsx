'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { getTokenInfo, getWalletStatus } from '@/lib/api';
import { appConfig } from '@/lib/config';
import { DelegationDebug, TokenInfo, WalletStatus } from '@/lib/types';
import { BrutalCard, ContractRow, HighlightText, InfoBox, ProofCard, SectionLabel, TagBadge } from './brutal-ui';
import { StatusPanel } from './StatusPanel';
import { HowItWorks } from './HowItWorks';
import { DebugPanel } from './DebugPanel';
import { WalletConnectAction } from './WalletConnectAction';
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
          <SectionLabel tone="light">CHATGPT MINT</SectionLabel>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr] lg:items-start">
          <div>
            <h1 className="display-text text-[clamp(4rem,10vw,7rem)] leading-[0.9] text-fog">MINT <HighlightText tone="mint">$CATSHIT</HighlightText><br />THROUGH <HighlightText tone="mint">CHATGPT</HighlightText></h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-mint md:text-lg">ONE SIGNATURE. GPT MINTS. MUCH BAG.</p>
            <p className="mt-4 max-w-3xl text-[15px] leading-8 text-fog/84 md:text-base">add CATSHIT to Claude first, finish any auth there, then come back here to inspect your wallet status. once the wallet is linked and delegated, Claude can mint on your behalf through MCP.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <WalletConnectAction tone="mint" label="connect wallet" />
            </div>
          </div>
          <BrutalCard tone="light" className="grid-bg space-y-4 text-ink">
            <div className="flex items-center justify-between gap-3">
              <TagBadge tone="purple">MUCH WEB3</TagBadge>
              <div className="mono-ui text-xs font-bold uppercase tracking-[0.22em] text-ink/60">🐾 cat terminal</div>
            </div>
            <div className="display-text text-4xl leading-none">dark cat alley.<br />organized chaos.</div>
            <InfoBox title="catshit.exe loaded" tone="light">&gt; wallet sniffing...<br />&gt; gpt mint ready<br />&gt; mcp route armed</InfoBox>
            <InfoBox title="launch lane" tone="mint">wallet + site logic now follow the configured chain env first. no more hardcoded BSC fallback vibes.</InfoBox>
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
              <div className="display-text text-4xl leading-none text-mint">WHY THIS IS SAFE</div>
              <div className="mt-2"><TagBadge tone="mint">NO RUG</TagBadge></div>
            </div>
          </div>
          <div className="mt-6 space-y-4 text-sm leading-7 text-fog md:text-base">
            <div>✓ token contract requires <HighlightText tone="mint">tx.origin == RELAYER</HighlightText> and <HighlightText tone="proof">msg.sender</HighlightText> code must match 7702 delegate logic</div>
            <div>✓ receiver is always <HighlightText tone="mint">msg.sender</HighlightText>, even relayer can’t mint to anyone else</div>
            <div>✓ <HighlightText tone="green">MintDelegate</HighlightText> has no storage, no fallback, no admin keys, no upgrade path</div>
            <div>✓ user can <HighlightText tone="proof">revoke</HighlightText> anytime from /revoke by signing authorization to <HighlightText tone="danger">0x0</HighlightText></div>
          </div>
          <details className="mt-6 rounded-[18px] border-[3px] border-mint bg-panel-2 p-4 text-fog">
            <summary className="mono-ui cursor-pointer text-xs font-bold uppercase tracking-[0.24em]">contract info</summary>
            <div className="mt-4">
              <ContractRow label="token" value={tokenInfo?.tokenAddress || 'placeholder-from-env'} href={tokenInfo?.tokenAddress ? `${appConfig.explorerBase}/address/${tokenInfo.tokenAddress}` : undefined} />
              <ContractRow label="delegate" value={tokenInfo?.delegateAddress || appConfig.delegateAddress || 'placeholder-from-env'} href={tokenInfo?.delegateAddress ? `${appConfig.explorerBase}/address/${tokenInfo.delegateAddress}` : undefined} />
              <ContractRow label="relayer" value={tokenInfo?.relayerAddress || 'placeholder-from-env'} />
              <ContractRow label="chain" value={`${appConfig.networkSlug} · chainId ${appConfig.chainId}`} />
              <ContractRow label="mcp endpoint" value={appConfig.mcpEndpoint} />
            </div>
          </details>
        </BrutalCard>
      </section>

      <section className="space-y-5">
        <SectionLabel tone="black">DON’T TRUST. VERIFY.</SectionLabel>
        <div className="grid gap-5 md:grid-cols-3">
          <ProofCard title="EIP-7702" badge="LIVE ✓">users sign one 7702 authorization; ur EOA delegates to MintDelegate.</ProofCard>
          <ProofCard title="FAIR LAUNCH" badge="0% RETAINED ✓">no presale. mint proceeds go toward LP. LP locked after launch.</ProofCard>
          <ProofCard title="AI AGENT" badge="GPT-NATIVE ✓">ChatGPT mints on user’s behalf via MCP server. relayer broadcasts tx; contract enforces recipient = caller.</ProofCard>
        </div>
      </section>
    </div>
  );
}
