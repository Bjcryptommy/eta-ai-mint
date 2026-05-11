import { SiteShell } from '@/components/SiteShell';
import { BrutalCard, ContractRow, ProofCard, SectionLabel, TagBadge } from '@/components/brutal-ui';
import { appConfig } from '@/lib/config';
import { getServerTokenInfo } from '@/lib/server-api';

function formatNumber(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return 'Coming soon';
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num.toLocaleString() : String(value);
}

export default async function ProofPage() {
  const tokenInfo = await getServerTokenInfo();
  const mcpUrl = appConfig.mcpPublicUrl || 'https://mcp.catshit.meme';

  return (
    <SiteShell>
      <div className="space-y-10">
        <div className="space-y-4">
          <SectionLabel tone="mint">PROOF</SectionLabel>
          <h1 className="display-text text-[clamp(4rem,10vw,7rem)] leading-[0.88] text-fog">Proof</h1>
          <p className="max-w-4xl text-lg leading-8 text-fog/82">Three pillars: EIP-7702, fair launch, and AI-native minting. Each one is verifiable.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <ProofCard title="EIP-7702" badge="LIVE">Users sign one authorization. Their wallet delegates to the MintDelegate.</ProofCard>
          <ProofCard title="Fair Launch" badge="OPEN">No presale. Mint proceeds support the launch pool. LP is locked after launch.</ProofCard>
          <ProofCard title="AI Agent" badge="MCP">Claude can request mints through MCP. The contract still enforces recipient, quota, and mint rules.</ProofCard>
        </div>
        <div className="grid gap-5 lg:grid-cols-[1fr,0.9fr]">
          <BrutalCard tone="light" className="text-ink">
            <div className="cat-divider inline-block pr-10"><SectionLabel tone="purple">Core Contracts</SectionLabel></div>
            <div className="mt-4 display-text text-4xl leading-none">Core Contracts</div>
            <p className="mt-4 text-sm leading-7 text-ink/75">These are the live contracts used by CATSHIT on Sepolia.</p>
            <div className="mt-5">
              <ContractRow label="Token" value={tokenInfo?.tokenAddress || 'Coming soon'} href={tokenInfo?.tokenAddress ? `${appConfig.explorerBase}/address/${tokenInfo.tokenAddress}` : undefined} />
              <ContractRow label="MintDelegate" value={tokenInfo?.delegateAddress || 'Coming soon'} href={tokenInfo?.delegateAddress ? `${appConfig.explorerBase}/address/${tokenInfo.delegateAddress}` : undefined} />
              <ContractRow label="Network" value={`${appConfig.networkName} · chainId ${appConfig.chainId}`} />
            </div>
          </BrutalCard>
          <BrutalCard tone="black">
            <div className="display-text text-4xl leading-none text-mint">Every Mint Has a Transaction</div>
            <div className="mt-5 space-y-3 text-sm leading-7 text-fog/92">
              <div>• No presale</div>
              <div>• Team allocation, if any, is disclosed</div>
              <div>• LP reserve is added to PancakeSwap</div>
              <div>• LP is locked</div>
              <div>• Contract has no hidden admin mint</div>
              <div>• Team runway comes from LP swap fees if applicable</div>
            </div>
          </BrutalCard>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <BrutalCard tone="proof">
            <div className="display-text text-4xl leading-none">LP Lock</div>
            <p className="mt-4 text-sm leading-7 text-ink/80">LP lock data will appear here after final launch deployment.</p>
            <div className="mt-5 space-y-3 text-sm leading-7">
              <div><strong>Lock ID:</strong> Coming soon</div>
              <div><strong>Status:</strong> Coming soon</div>
              <div><strong>Unlock date:</strong> Coming soon</div>
              <div><strong>Locker contract:</strong> Coming soon</div>
              <div><strong>Pool:</strong> Coming soon</div>
              <div><strong>Team wallet / fee runway:</strong> Coming soon</div>
            </div>
          </BrutalCard>
          <BrutalCard tone="light" className="text-ink">
            <div className="flex items-center justify-between gap-3">
              <div className="display-text text-4xl leading-none">Public Mint</div>
              <TagBadge tone="mint">OPEN</TagBadge>
            </div>
            <div className="mt-5 space-y-3 text-sm leading-7 text-ink/85">
              <div><strong>Mint pool:</strong> {formatNumber(tokenInfo?.remaining)} remaining</div>
              <div><strong>Per-wallet cap:</strong> {formatNumber(tokenInfo?.maxPerWallet)}</div>
              <div><strong>Mint price:</strong> {tokenInfo?.mintPriceEth || 'Coming soon'}</div>
              <div><strong>Public supply minted:</strong> {formatNumber(tokenInfo?.totalMints)}</div>
              <div><strong>Max supply:</strong> {formatNumber(tokenInfo?.maxTotalMints)}</div>
              <div><strong>$CATSHIT per mint:</strong> {tokenInfo?.mintAmount || 'Coming soon'}</div>
            </div>
          </BrutalCard>
        </div>
        <BrutalCard tone="dark">
          <div className="display-text text-4xl leading-none">AI Integration</div>
          <div className="mt-5 space-y-4 text-sm leading-7 text-fog/92">
            <div><strong>MCP endpoint:</strong> {mcpUrl}</div>
            <div><strong>Protocol:</strong> MCP</div>
            <div className="flex flex-wrap gap-2"><strong>Tools available:</strong> <TagBadge tone="mint">token_mint</TagBadge> <TagBadge tone="light">token_balance</TagBadge> <TagBadge tone="mint">token_info</TagBadge> <TagBadge tone="light">mint_quota_get</TagBadge> <TagBadge tone="mint">wallet_status</TagBadge> <TagBadge tone="light">authorization_status</TagBadge> <TagBadge tone="mint">tx_status</TagBadge></div>
            <div><strong>Connector setup:</strong> Use the Connect page to add CATSHIT to Claude.</div>
          </div>
        </BrutalCard>
        <BrutalCard tone="black">
          <div className="display-text text-4xl leading-none text-fog">Verify Yourself</div>
          <p className="mt-4 text-sm leading-7 text-fog/84">You can verify the contracts, connector endpoint, and transaction history yourself. Final BscScan/Etherscan links and LP lock links will appear here as deployment data is finalized.</p>
        </BrutalCard>
      </div>
    </SiteShell>
  );
}
