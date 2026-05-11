'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { shortAddr } from '@/lib/config';
import { WalletStatus } from '@/lib/types';

export function WalletPanel({ status }: { status: WalletStatus | null }) {
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="eyebrow">Wallet</div>
          <div className="section-title">Your live status</div>
        </div>
        <span className={`state-pill ${status?.delegated ? 'is-good' : 'is-warn'}`}>{status?.delegated ? 'Ready' : 'Needs delegation'}</span>
      </div>
      <div className="muted" style={{ marginBottom: 16 }}>
        Connect a wallet, inspect status instantly, and use the same flow that later powers ChatGPT minting.
      </div>
      <div style={{ marginBottom: 16 }}><ConnectButton /></div>
      <dl className="kv">
        <dt>Wallet</dt><dd>{shortAddr(status?.wallet, 6)}</dd>
        <dt>Delegated</dt><dd>{status ? (status.delegated ? 'Yes' : 'No') : '—'}</dd>
        <dt>Quota left</dt><dd>{status?.quotaRemaining ?? '—'}</dd>
        <dt>Token balance</dt><dd>{status?.tokenBalance ?? '—'}</dd>
        <dt>Mint count</dt><dd>{status?.mintsOf ?? '—'}</dd>
        <dt>ETH balance</dt><dd>{status?.ethBalanceEth ?? '—'}</dd>
      </dl>
    </div>
  );
}
