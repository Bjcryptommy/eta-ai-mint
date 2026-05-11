import { StepCard, SectionLabel } from './brutal-ui';

export function HowItWorks() {
  return (
    <section className="space-y-5">
      <div className="cat-divider inline-block pr-10">
        <SectionLabel tone="mint">HOW IT WORKS</SectionLabel>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        <StepCard number="01" title="SIGN ONCE">
          u sign an eip-7702 authorization pointing ur eoa at our MintDelegate. wallet pops once. that’s literally it.
        </StepCard>
        <StepCard number="02" title="U ACTIVATE">
          ur wallet broadcasts the signed type-4 self-tx that sets ur eoa’s code to the delegate. after that ur EOA pays the per-mint fee.
        </StepCard>
        <StepCard number="03" title="CHATGPT MINTS $CATSHIT" tone="mint">
          connect this backend to ChatGPT. say “mint me some catshit”. relayer covers mint tx gas. web page cannot mint — only MCP can.
        </StepCard>
      </div>
    </section>
  );
}
