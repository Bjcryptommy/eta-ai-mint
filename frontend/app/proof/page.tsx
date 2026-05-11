import { SiteShell } from '@/components/SiteShell';
import { BrutalCard, ContractRow, HighlightText, ProofCard, SectionLabel, TagBadge } from '@/components/brutal-ui';
import { appConfig } from '@/lib/config';
import { getServerTokenInfo } from '@/lib/server-api';

export default async function ProofPage() {
  const tokenInfo = await getServerTokenInfo();
  return (
    <SiteShell>
      <div className="space-y-10">
        <div className="space-y-4">
          <SectionLabel tone="mint">proof</SectionLabel>
          <h1 className="display-text text-[clamp(4rem,10vw,7rem)] leading-[0.88] text-fog">PROOF</h1>
          <p className="max-w-4xl text-lg leading-8 text-fog/82">THREE PILLARS: EIP-7702 × FAIR LAUNCH × AI AGENT. EACH VERIFIABLE IN 1 CLICK.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <ProofCard title="EIP-7702" badge="LIVE ✓">users sign one 7702 authorization; ur EOA delegates to MintDelegate.</ProofCard>
          <ProofCard title="FAIR LAUNCH" badge="0% RETAINED ✓">no presale. mint proceeds go toward LP. LP locked after launch.</ProofCard>
          <ProofCard title="AI AGENT" badge="GPT-NATIVE ✓">ChatGPT mints on user’s behalf via MCP server. relayer broadcasts tx; contract enforces recipient = caller.</ProofCard>
        </div>
        <div className="grid gap-5 lg:grid-cols-[1fr,0.9fr]">
          <BrutalCard tone="light" className="text-ink">
            <div className="cat-divider inline-block pr-10"><SectionLabel tone="purple">verified core</SectionLabel></div>
            <div className="mt-4 display-text text-4xl leading-none">core contracts</div>
            <div className="mt-4"><TagBadge tone="mint">verified badges</TagBadge></div>
            <div className="mt-5">
              <ContractRow label="token" value={tokenInfo?.tokenAddress || 'placeholder-from-env'} href={tokenInfo?.tokenAddress ? `${appConfig.explorerBase}/address/${tokenInfo.tokenAddress}` : undefined} />
              <ContractRow label="MintDelegate" value={tokenInfo?.delegateAddress || 'placeholder-from-env'} href={tokenInfo?.delegateAddress ? `${appConfig.explorerBase}/address/${tokenInfo.delegateAddress}` : undefined} />
              <ContractRow label="chain" value={`${appConfig.networkSlug} · chainId ${appConfig.chainId}`} />
            </div>
          </BrutalCard>
          <BrutalCard tone="black">
            <div className="display-text text-4xl leading-none text-mint">EVERY CLAIM HAS A TX</div>
            <div className="mt-5 space-y-3 text-sm leading-7 text-fog/92">
              <div>✓ no presale</div>
              <div>✓ team allocation, if any, disclosed</div>
              <div>✓ LP reserve added to PancakeSwap</div>
              <div>✓ LP locked</div>
              <div>✓ contract immutable / no hidden admin mint</div>
              <div>✓ team runway = LP swap fees if applicable</div>
            </div>
          </BrutalCard>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <BrutalCard tone="proof">
            <div className="display-text text-4xl leading-none">LP LOCK — LIVE STATUS</div>
            <div className="mt-5 space-y-3 text-sm leading-7">
              <div><HighlightText tone="gold">lock id</HighlightText> placeholder</div>
              <div><HighlightText tone="mint">status</HighlightText> placeholder</div>
              <div><HighlightText tone="gold">unlock at</HighlightText> placeholder</div>
              <div><HighlightText tone="mint">locker contract</HighlightText> placeholder</div>
              <div><HighlightText tone="gold">pool</HighlightText> placeholder</div>
              <div><HighlightText tone="green">team wallet / fee runway</HighlightText> placeholder</div>
            </div>
          </BrutalCard>
          <BrutalCard tone="light" className="text-ink">
            <div className="flex items-center justify-between gap-3">
              <div className="display-text text-4xl leading-none">PUBLIC MINT</div>
              <TagBadge tone="mint">OPEN</TagBadge>
            </div>
            <div className="mt-5 space-y-3 text-sm leading-7 text-ink/85">
              <div>mint pool — {tokenInfo?.remaining ?? 'placeholder'}</div>
              <div>per-wallet cap — {tokenInfo?.maxPerWallet ?? 'placeholder'}</div>
              <div>$catshit per mint — {tokenInfo?.mintAmount ?? 'placeholder'}</div>
              <div>mint price — {tokenInfo?.mintPriceEth ?? 'placeholder'}</div>
              <div>public supply minted — {tokenInfo?.totalMints ?? 'placeholder'}</div>
              <div>max supply — {tokenInfo?.maxTotalMints ?? 'placeholder'}</div>
            </div>
          </BrutalCard>
        </div>
        <BrutalCard tone="dark">
          <div className="display-text text-4xl leading-none">AI INTEGRATION</div>
          <div className="mt-5 space-y-4 text-sm leading-7 text-fog/92">
            <div>mcp endpoint — <HighlightText tone="mint">{appConfig.mcpEndpoint}</HighlightText></div>
            <div>protocol — <HighlightText tone="proof">MCP</HighlightText></div>
            <div className="flex flex-wrap gap-2">tools available — <HighlightText tone="mint">token_mint</HighlightText> <HighlightText tone="proof">token_balance</HighlightText> <HighlightText tone="mint">token_info</HighlightText> <HighlightText tone="proof">mint_quota_get</HighlightText> <HighlightText tone="mint">authorization_status</HighlightText></div>
            <div>connector setup — placeholder walkthrough + links</div>
          </div>
        </BrutalCard>
        <BrutalCard tone="black">
          <div className="display-text text-4xl leading-none text-fog">VERIFY YOURSELF</div>
          <p className="mt-4 text-sm leading-7 text-fog/84">placeholder verification copy for BscScan, contract checks, LP lock checks, and MCP endpoint verification goes here. we can turn this into exact commands once final deployment data lands.</p>
        </BrutalCard>
      </div>
    </SiteShell>
  );
}
