import { StepCard, SectionLabel } from './brutal-ui';

export function HowItWorks() {
  return (
    <section className="space-y-5">
      <div className="cat-divider inline-block pr-10">
        <SectionLabel tone="mint">How it works</SectionLabel>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        <StepCard number="01" title="Sign once">
          Sign a wallet message to link your wallet to your Claude session.
        </StepCard>
        <StepCard number="02" title="Activate delegation">
          Approve the MintDelegate so Claude can request mints through MCP.
        </StepCard>
        <StepCard number="03" title="Mint by chat" tone="mint">
          Ask Claude to mint $CATSHIT. The relayer broadcasts the transaction, and the contract enforces the wallet rules.
        </StepCard>
      </div>
    </section>
  );
}
