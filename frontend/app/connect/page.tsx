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
          <h1 className="display-text text-[clamp(3.8rem,9vw,6rem)] leading-[0.9] text-fog">Connect CATSHIT to Claude</h1>
          <p className="text-lg font-semibold text-mint">Add CATSHIT as a Claude connector, link your wallet once, then mint directly from Claude.</p>
          <p className="max-w-3xl text-base leading-7 text-fog/82">CATSHIT lets Claude check your wallet status, read your mint quota, and request mints through your approved wallet session. Your private key is never exposed.</p>
          <div className="flex flex-wrap gap-3">
            <BrutalButton href="https://claude.ai/settings/connectors?connectorName=CATSHIT&connectorUrl=https%3A%2F%2Fmcp.catshit.meme&modal=add-custom-connector" tone="mint">Connect to Claude</BrutalButton>
            <WalletConnectAction tone="light" label="Connect Wallet" />
          </div>
        </div>
        <ClaudeConnectorCard />
        <div className="grid gap-5 lg:grid-cols-[1.1fr,0.9fr]">
          <BrutalCard tone="dark">
            <div className="display-text text-4xl leading-none">How it works</div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <StepCard number="01" title="Open Claude">Click Connect to Claude to open Claude’s connector setup.</StepCard>
              <StepCard number="02" title="Add CATSHIT" tone="dark">Add the connector using the pre-filled MCP URL.</StepCard>
              <StepCard number="03" title="Approve access" tone="dark">Connect your wallet and approve CATSHIT access for that Claude session.</StepCard>
              <StepCard number="04" title="Mint by chat" tone="mint">Ask Claude to check your wallet, show your quota, or mint tokens.</StepCard>
            </div>
          </BrutalCard>
          <BrutalCard tone="dark">
            <div className="display-text text-4xl leading-none">Fee & Limits</div>
            <div className="mt-5 space-y-3 text-sm leading-7">
              <InfoBox title="Fee per mint" tone="dark">Read from token config. You only pay the mint fee if the token requires one.</InfoBox>
              <InfoBox title="Paid from" tone="dark">Your linked wallet through delegated EIP-7702 authorization.</InfoBox>
              <InfoBox title="Wallet cap" tone="dark">Mint limits are enforced per wallet.</InfoBox>
              <InfoBox title="Gas" tone="dark">The relayer handles gas for Claude/MCP broadcast transactions.</InfoBox>
              <InfoBox title="Important" tone="dark">CATSHIT does not add itself to Claude without your approval. You always confirm the connector and approve wallet access yourself.</InfoBox>
            </div>
          </BrutalCard>
        </div>
      </div>
    </SiteShell>
  );
}
