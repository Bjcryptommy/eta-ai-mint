import { SiteShell } from '@/components/SiteShell';
import { BrutalButton, BrutalCard, InfoBox, SectionLabel, StepCard } from '@/components/brutal-ui';
import { WalletConnectAction } from '@/components/WalletConnectAction';
import { ClaudeConnectorCard } from '@/components/ClaudeConnectorCard';

export default function ConnectPage() {
  return (
    <SiteShell>
      <div className="space-y-8">
        <div className="space-y-4">
          <SectionLabel tone="mint">CONNECT CLAUDE</SectionLabel>
          <h1 className="display-text text-[clamp(3.8rem,9vw,6rem)] leading-[0.9] text-fog">CONNECT CLAUDE</h1>
          <p className="text-lg font-semibold uppercase text-mint">one click. much claude. wow.</p>
          <p className="max-w-3xl text-base leading-7 text-fog/82">The website now works like a simple Claude connector launcher. Add CATSHIT to Claude first, complete any auth there, then come back here only to inspect your wallet state.</p>
          <div className="flex flex-wrap gap-3">
            <WalletConnectAction tone="mint" label="connect wallet" />
            <BrutalButton href="/" tone="light">back</BrutalButton>
          </div>
        </div>
        <ClaudeConnectorCard />
        <div className="grid gap-5 lg:grid-cols-[1.1fr,0.9fr]">
          <BrutalCard tone="dark">
            <div className="display-text text-4xl leading-none">WHAT HAPPENS NEXT</div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <StepCard number="01" title="open claude">Click Connect Claude and Claude opens the custom connector modal with CATSHIT pre-filled.</StepCard>
              <StepCard number="02" title="add connector" tone="dark">Click Add inside Claude. If CATSHIT auth is required, Claude sends you through the CATSHIT auth flow.</StepCard>
              <StepCard number="03" title="come back" tone="dark">After Claude finishes the authorization/session flow, come back here and check whether your wallet is linked and delegated.</StepCard>
              <StepCard number="04" title="mint from claude" tone="mint">Open Claude and say: mint me 1 catshit.</StepCard>
            </div>
          </BrutalCard>
          <BrutalCard tone="dark">
            <div className="display-text text-4xl leading-none">Fee & Limits</div>
            <div className="mt-5 space-y-3 text-sm leading-7">
              <InfoBox title="fee per mint" tone="dark">read from backend / token config</InfoBox>
              <InfoBox title="paid from" tone="dark">user wallet via delegated EOA</InfoBox>
              <InfoBox title="wallet cap" tone="dark">per-wallet cap enforced onchain</InfoBox>
              <InfoBox title="max user will ever pay" tone="dark">mint fee only. relayer ships gas for MCP broadcast path.</InfoBox>
              <InfoBox title="important" tone="dark">This does not fully auto-add without user approval. It only opens Claude with the custom connector modal pre-filled.</InfoBox>
            </div>
          </BrutalCard>
        </div>
      </div>
    </SiteShell>
  );
}
