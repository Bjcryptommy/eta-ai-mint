import { useState } from 'react';
import { getChainById } from '../../shared/chains';
import type { PendingRequest, PersistedState } from '../../shared/types';
import { shortAddress } from '../../shared/utils';

export function ConfirmTransaction({ pending, onApprove, onReject, state }: { pending: PendingRequest; onApprove: ()=>Promise<any>; onReject: ()=>Promise<any>; state: PersistedState }) {
  const tx = pending.payload.tx || {};
  const estimate = pending.payload.estimate;
  const chain = getChainById(state.settings.activeChainId, state.chains);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    try {
      setBusy(true);
      setError(null);
      await onApprove();
      window.close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Confirm failed');
      setBusy(false);
    }
  }

  async function handleReject() {
    try {
      setBusy(true);
      setError(null);
      await onReject();
      window.close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reject failed');
      setBusy(false);
    }
  }

  return <div className="app approval-screen"><div className="card approval-card"><div className="approval-body"><div><div className="eyebrow">Transaction approval</div><div className="title medium">Confirm transaction</div><div className="subtitle small">Requested by {pending.origin}</div><div className="review-list"><ReviewRow label="From" value={shortAddress(pending.account || '')} /><ReviewRow label="To" value={tx.to || '—'} /><ReviewRow label="Value" value={tx.value || '0x0'} /><ReviewRow label="Chain" value={chain.name} /><ReviewRow label="Estimated gas" value={estimate?.feeFormatted ? `${estimate.feeFormatted} ${chain.symbol}` : 'Unknown'} /><ReviewRow label="Data" value={tx.data || '0x'} /></div></div><div className="approval-preview"><div className="warning-inline">Review unknown contract calls carefully before confirming.</div>{error ? <div className="inline-note danger-box">{error}</div> : null}</div></div><div className="approval-footer"><div className="approval-actions"><button className="btn light big clickable" disabled={busy} onClick={handleReject}>Reject</button><button className="btn primary big clickable" disabled={busy} onClick={handleApprove}>{busy ? 'Working…' : 'Confirm'}</button></div></div></div></div>;
}
function ReviewRow({ label, value }: { label: string; value: string }) { return <div className="review-row"><span className="review-label">{label}</span><strong className="mono review-value truncate">{value}</strong></div>; }
