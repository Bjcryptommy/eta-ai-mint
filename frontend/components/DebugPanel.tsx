'use client';

import { DelegationDebug } from '@/lib/types';
import { BrutalCard, SectionLabel } from './brutal-ui';

export function DebugPanel({ debug }: { debug: DelegationDebug | null }) {
  if (!debug) return null;

  return (
    <BrutalCard tone="gold">
      <div className="flex items-start justify-between gap-3">
        <div>
          <SectionLabel tone="black">debug</SectionLabel>
          <div className="display-text mt-3 text-3xl leading-none">wallet diagnostics</div>
        </div>
        <div className="mono-ui rounded-xl brutal-border bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.2em]">{debug.outcome}</div>
      </div>
      <div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
        <div><strong>Action:</strong> {debug.action}</div>
        <div><strong>Connector:</strong> {debug.connectorName || '—'}</div>
        <div><strong>Connected wallet:</strong> {debug.wallet || '—'}</div>
        <div><strong>Wallet client account:</strong> {debug.walletClientAccount || '—'}</div>
        <div><strong>App chain:</strong> {debug.chainLabel || '—'}</div>
        <div><strong>Wallet chain id:</strong> {debug.walletChainId || '—'}</div>
        <div className="md:col-span-2"><strong>Provider flags:</strong> {debug.providerFlags?.join(', ') || 'none detected'}</div>
        <div className="md:col-span-2"><strong>Raw message:</strong> {debug.rawMessage || '—'}</div>
        <div className="md:col-span-2"><strong>Details:</strong> {debug.rawDetails || '—'}</div>
        <div><strong>Code:</strong> {debug.rawCode || '—'}</div>
        <div><strong>Tx hash:</strong> {debug.txHash || '—'}</div>
      </div>
      {debug.rawPayload ? <pre className="mono-ui mt-4 overflow-x-auto rounded-2xl brutal-border bg-white p-4 text-[11px] leading-5 whitespace-pre-wrap">{debug.rawPayload}</pre> : null}
    </BrutalCard>
  );
}
