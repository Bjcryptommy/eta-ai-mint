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
  const mcpPublicUrl = appConfig.mcpPublicUrl || 'https://mcp.catshit.meme';
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
        <SectionLabel tone="mint">Claude Connector</SectionLabel>
        <div className="display-text text-4xl leading-none">Add CATSHIT to Claude</div>
        <p className="text-sm leading-7 opacity-85">Open Claude with the CATSHIT connector pre-filled. Add the connector, approve access, and Claude can use CATSHIT tools for your linked wallet.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <BrutalButton tone="mint" onClick={openClaude}>Connect to Claude</BrutalButton>
        <BrutalButton tone="light" onClick={() => copyText(mcpPublicUrl, 'MCP URL copied')}>Copy MCP URL</BrutalButton>
        <BrutalButton tone="light" onClick={() => copyText(claudeSetupUrl, 'Claude setup link copied')}>Copy Setup Link</BrutalButton>
        <BrutalButton tone="gold" onClick={() => copyText(starterPrompt, 'Starter prompt copied')}>Copy Starter Prompt</BrutalButton>
      </div>

      <InfoBox title="MCP URL" tone={compact ? 'light' : 'black'}>
        <div className="break-all">{mcpPublicUrl}</div>
        <div className="mt-2 text-xs opacity-80">Use this URL if you want to add CATSHIT manually inside Claude.</div>
      </InfoBox>

      <InfoBox title="Starter prompt" tone={compact ? 'light' : 'dark'}>
        <div className="break-words">{starterPrompt}</div>
      </InfoBox>

      <InfoBox title="Flow" tone={compact ? 'light' : 'dark'}>
        1. Click Connect to Claude.<br />
        Opens Claude with CATSHIT pre-filled as a custom connector.<br /><br />
        2. Add the connector.<br />
        Confirm CATSHIT inside Claude settings.<br /><br />
        3. Approve access.<br />
        Claude opens the CATSHIT approval page when wallet access is needed.<br /><br />
        4. Mint from Claude.<br />
        Ask Claude to check your quota or mint tokens for your linked wallet.
      </InfoBox>

      {message ? <div className="rounded-2xl border-[3px] border-mint bg-mint/15 px-4 py-3 text-sm font-semibold">{message}</div> : null}
    </BrutalCard>
  );
}
