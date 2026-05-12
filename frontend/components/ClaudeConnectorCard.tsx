'use client';

import { useMemo, useState } from 'react';
import { appConfig } from '@/lib/config';
import { BrutalButton, BrutalCard, InfoBox, SectionLabel } from './brutal-ui';

function buildClaudeSetupUrl(mcpPublicUrl?: string) {
  if (!mcpPublicUrl) return '';
  const encoded = encodeURIComponent(mcpPublicUrl);
  return `https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=CATSHIT&connectorUrl=${encoded}`;
}

export function ClaudeConnectorCard({ compact = false }: { compact?: boolean }) {
  const [message, setMessage] = useState<string | null>(null);
  const mcpPublicUrl = appConfig.mcpPublicUrl || 'https://mcp.catshit.meme';
  const claudeSetupUrl = useMemo(() => buildClaudeSetupUrl(mcpPublicUrl), [mcpPublicUrl]);
  const starterPrompt = 'Use CATSHIT to check my wallet status. If my wallet is not linked, give me the connect link. If linked and delegated, show my mint quota.';

  function showMessage(text: string, duration = 2200) {
    setMessage(text);
    window.setTimeout(() => setMessage(null), duration);
  }

  async function copyText(value: string, success: string) {
    try {
      await navigator.clipboard.writeText(value);
      showMessage(success, 1800);
    } catch {
      showMessage('Copy failed. Copy it manually.');
    }
  }

  async function openClaude() {
    if (!claudeSetupUrl) return showMessage('MCP public URL is not configured.');
    try {
      await navigator.clipboard.writeText(mcpPublicUrl);
      showMessage('MCP URL copied. Claude is opening…', 2400);
    } catch {
      showMessage('If the field is empty, copy the MCP URL below and paste it into Claude.', 3200);
    }
    window.open(claudeSetupUrl, '_blank', 'noopener,noreferrer');
  }

  return (
    <BrutalCard tone={compact ? 'light' : 'dark'} className="space-y-4">
      <div className="space-y-3">
        <SectionLabel tone="mint">Claude Connector</SectionLabel>
        <div className="display-text text-4xl leading-none">Add CATSHIT to Claude</div>
        <p className="text-sm leading-7 opacity-85">Open Claude with CATSHIT pre-filled. Add the connector, approve access, and Claude can use CATSHIT tools for your linked wallet.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <BrutalButton tone="mint" onClick={openClaude}>Connect to Claude</BrutalButton>
        <BrutalButton tone="light" onClick={() => copyText(mcpPublicUrl, 'MCP URL copied')}>Copy MCP URL</BrutalButton>
        <BrutalButton tone="light" onClick={() => copyText(claudeSetupUrl, 'Claude setup link copied')}>Copy Setup Link</BrutalButton>
        <BrutalButton tone="gold" onClick={() => copyText(starterPrompt, 'Starter prompt copied')}>Copy Starter Prompt</BrutalButton>
      </div>

      <div className="text-xs text-fog/70">Claude may not always pre-fill the form. If it opens empty, paste the copied MCP URL.</div>

      <InfoBox title="MCP URL" tone={compact ? 'light' : 'black'}>
        <div className="break-all">{mcpPublicUrl}</div>
      </InfoBox>

      <InfoBox title="If Claude opens an empty form" tone={compact ? 'light' : 'dark'}>
        <div><strong>Name:</strong> CATSHIT</div>
        <div className="mt-2 break-all"><strong>Remote MCP server URL:</strong> {mcpPublicUrl}</div>
        <div className="mt-2">Then click Add. Claude will open CATSHIT’s approval page when wallet access is needed.</div>
      </InfoBox>

      <InfoBox title="Starter prompt" tone={compact ? 'light' : 'dark'}>
        <div className="break-words">{starterPrompt}</div>
      </InfoBox>

      {!compact ? (
        <InfoBox title="Flow" tone="dark">
          1. Click Connect to Claude.<br />
          We copy the MCP URL and open Claude’s connector setup.<br /><br />
          2. Add CATSHIT.<br />
          If the form is empty, paste the copied MCP URL and use CATSHIT as the name.<br /><br />
          3. Approve Access.<br />
          Claude opens the CATSHIT approval page when wallet access is needed.<br /><br />
          4. Mint by Chat.<br />
          Ask Claude to check your quota or mint tokens for your linked wallet.
        </InfoBox>
      ) : null}

      {message ? <div className="rounded-2xl border-[3px] border-mint bg-mint/15 px-4 py-3 text-sm font-semibold">{message}</div> : null}
    </BrutalCard>
  );
}
