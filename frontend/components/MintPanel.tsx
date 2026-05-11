'use client';

import { useMemo, useState } from 'react';
import { postMint } from '@/lib/api';
import { MintResponse, WalletStatus } from '@/lib/types';
import { appConfig } from '@/lib/config';

export function MintPanel({ wallet, status, onRefresh }: { wallet?: string; status: WalletStatus | null; onRefresh: () => Promise<void> | void; }) {
  const [slots, setSlots] = useState(1);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<MintResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const safeSlots = Math.max(1, Math.min(10, Number.isFinite(slots) ? slots : 1));
  const quotaRemaining = Number(status?.quotaRemaining ?? 0);
  const canMint = useMemo(() => !!wallet && !!status?.delegated && quotaRemaining >= safeSlots, [wallet, safeSlots, status, quotaRemaining]);

  async function handleMint() {
    if (!wallet) return setError('Connect your wallet first.');
    setPending(true); setError(null); setResult(null);
    try {
      const res = await postMint(wallet, safeSlots);
      setResult(res);
      await onRefresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Mint failed';
      if (message.includes('does not support EIP-7702 execution transactions')) {
        setError('Backend RPC does not support EIP-7702 execution transactions yet. The frontend is fine, but the relayer RPC must be switched to a 7702-capable Sepolia provider.');
      } else {
        setError(message);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="card" id="mint">
      <div className="card-head">
        <div>
          <div className="eyebrow">Mint</div>
          <div className="section-title">Relayer mint flow</div>
        </div>
        <span className="state-pill">Protected backend</span>
      </div>
      <div className="muted" style={{ marginBottom: 16 }}>
        This is the real backend-assisted path. Once delegation is active, the relayer submits the mint on your behalf.
      </div>
      <div className="form-grid">
        <div>
          <label className="label">Mint slots</label>
          <input className="input" type="number" min={1} max={10} value={safeSlots} onChange={(e) => setSlots(Number(e.target.value || 1))} />
        </div>
        <div className="notice">
          <strong>Quick checks</strong>
          <div style={{ marginTop: 8 }}>Quota remaining: {status?.quotaRemaining ?? '—'}</div>
          <div>Delegation active: {status?.delegated ? 'Yes' : 'No'}</div>
          <div>Wallet connected: {wallet ? 'Yes' : 'No'}</div>
        </div>
        <button className="btn btn-primary" disabled={!canMint || pending} onClick={handleMint}>
          {pending ? 'Minting…' : 'Mint now'}
        </button>
      </div>
      {!wallet && <div className="notice" style={{ marginTop: 16 }}>Connect a wallet to continue.</div>}
      {wallet && !status?.delegated && <div className="notice error" style={{ marginTop: 16 }}>Activate delegation first. After that, the mint button becomes the same AI-ready relayer path.</div>}
      {wallet && status?.delegated && quotaRemaining < safeSlots && <div className="notice error" style={{ marginTop: 16 }}>Selected slots exceed your remaining quota.</div>}
      {error && <div className="notice error" style={{ marginTop: 16 }}>{error}</div>}
      {result?.txHash && (
        <div className="notice success" style={{ marginTop: 16 }}>
          Mint successful. <a href={`${appConfig.explorerBase}/tx/${result.txHash}`} target="_blank">View transaction</a>
        </div>
      )}
    </div>
  );
}
