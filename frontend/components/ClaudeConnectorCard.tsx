'use client';

import { useMemo, useState } from 'react';
import { appConfig } from '@/lib/config';
import { BrutalButton, BrutalCard, InfoBox, SectionLabel } from './brutal-ui';

function buildClaudeSetupUrl(mcpPublicUrl?: string) {
  if (!mcpPublicUrl) return '';
  const encoded = encodeURIComponent(mcpPublicUrl);
  return `https://claude.ai/settings/connectors?connectorName=CATSHIT&connectorUrl=${encoded}&modal=add-custom-connector`;
}

export function ClaudeConnectorCard({ compact = false }: { compact?: boolean }) {
  const [message, setMessage] = useState<string | null>(null);
  const mcpPublicUrl = appConfig.mcpPublicUrl;
  const claudeSetupUrl = useMemo(() => buildClaudeSetupUrl(mcpPublicUrl), [mcpPublicUrl]);
  const starterPrompt = 'Use CATSHIT to check my wallet status. If my wallet is not linked, give me the connect link. If linked and delegated, show my mint quota.';

  async function copyText(value: string, success: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(success);
      window.setTimeout(() => setMessage(null), 1800);
    } catch {
      setMessage('Copy failed. Copy it manually.');
      window.setTimeout(() => setMessage(null), 2200);
    }
  }

  function openClaude() {
    if (!claudeSetupUrl) return setMessage('MCP public URL is not configured.');
    setMessage(null);
    window.open(claudeSetupUrl, '_blank', 'noopener,noreferrer');
  }

  return (
    <BrutalCard tone={compact ? 'light' : 'dark'} className="space-y-4">
      <div className="space-y-3">
        <SectionLabel tone="mint">CONNECT CLAUDE</SectionLabel>
        <div className="display-text text-4xl leading-none">Connect Claude →</div>
        <p className="text-sm leading-7 opacity-85">Add the CATSHIT MCP URL to Claude, then let Claude request a wallet link for its own session before minting.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <BrutalButton tone="mint" onClick={openClaude}>Connect Claude →</BrutalButton>
        <BrutalButton tone="light" onClick={() => mcpPublicUrl ? copyText(mcpPublicUrl, 'Copied MCP URL.') : setMessage('MCP public URL is not configured.')}>Copy MCP URL</BrutalButton>
        <BrutalButton tone="light" onClick={() => claudeSetupUrl ? copyText(claudeSetupUrl, 'Copied Claude setup link.') : setMessage('MCP public URL is not configured.')}>Copy Claude setup link</BrutalButton>
        <BrutalButton tone="gold" onClick={() => copyText(starterPrompt, 'Copied starter prompt.')}>Copy starter prompt</BrutalButton>
      </div>

      {!mcpPublicUrl ? (
        <InfoBox title="config" tone="light">MCP public URL is not configured.</InfoBox>
      ) : (
        <>
          <InfoBox title="MCP URL" tone={compact ? 'light' : 'black'}>{mcpPublicUrl}</InfoBox>
          <InfoBox title="starter prompt" tone={compact ? 'light' : 'dark'}>{starterPrompt}</InfoBox>
        </>
      )}

      <InfoBox title="flow" tone={compact ? 'light' : 'dark'}>
        1. Click Connect Claude.<br />
        2. Claude opens Add custom connector with CATSHIT pre-filled.<br />
        3. Add the connector.<br />
        4. Ask Claude to check wallet status.<br />
        5. If needed, open the CATSHIT auth link Claude gives you and link your wallet.<br />
        6. Claude can mint only for that linked wallet.
      </InfoBox>

      {message ? <div className="rounded-2xl border-[3px] border-mint bg-mint/15 px-4 py-3 text-sm font-semibold">{message}</div> : null}
    </BrutalCard>
  );
}
