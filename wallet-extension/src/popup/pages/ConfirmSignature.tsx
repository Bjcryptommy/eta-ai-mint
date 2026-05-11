import { useEffect, useMemo, useState } from 'react';
import type { PendingRequest, PersistedState } from '../../shared/types';
import { shortAddress } from '../../shared/utils';
import { getChainById } from '../../shared/chains';

export function ConfirmSignature({ pending, onApprove, onReject, state }: { pending: PendingRequest; onApprove: ()=>Promise<any>; onReject: ()=>Promise<any>; state: PersistedState }) {
  const chain = getChainById(state.settings.activeChainId, state.chains);
  const isConnect = pending.type === 'connect';
  const is7702 = pending.type === 'eip7702';
  const isAddChain = pending.type === 'addChain';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const rejectOnClose = () => {
      if (!busy) void onReject();
    };
    window.addEventListener('beforeunload', rejectOnClose);
    return () => window.removeEventListener('beforeunload', rejectOnClose);
  }, [busy, onReject]);

  const preview = useMemo(() => {
    if (isConnect) return (pending.payload.permissions || ['eth_accounts']).join(', ');
    if (is7702) return `Delegate: ${pending.payload.delegate}`;
    if (isAddChain) return JSON.stringify(pending.payload.chain || {}, null, 2);
    if (pending.type === 'signMessage') return String(pending.payload.displayMessage || pending.payload.message || '');
    if (pending.type === 'signTypedData') return JSON.stringify(pending.payload.typedDataObject || pending.payload.typedData || {}, null, 2);
    return JSON.stringify(pending.payload, null, 2);
  }, [pending, isConnect, is7702, isAddChain]);

  async function handleApprove() {
    try {
      setBusy(true);
      setError(null);
      await onApprove();
      window.close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signing failed');
    } finally {
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

  return <div className="app approval-screen"><div className="card approval-card"><div className="approval-body"><div><div className="eyebrow">Approval request</div><div className="title medium">{isConnect ? 'Connect this site?' : is7702 ? 'Authorize CATSHIT mint setup' : isAddChain ? 'Add network to wallet?' : 'Signature Request'}</div><div className="subtitle small">{pending.origin}</div><div className="review-list"><ReviewRow label="Wallet" value={shortAddress(pending.account)} /><ReviewRow label="Network" value={chain.name} />{!isConnect && !isAddChain ? <ReviewRow label="Method" value={pending.payload.method || pending.type} /> : null}{is7702 ? <ReviewRow label="Delegate" value={shortAddress(pending.payload.delegate)} /> : null}{isAddChain ? <><ReviewRow label="Chain" value={pending.payload.chain?.name || 'Unknown'} /><ReviewRow label="Chain ID" value={String(pending.payload.chain?.id || '')} /></> : null}</div></div><div className="signature-preview approval-preview"><div className="preview-box mono"><code>{preview}</code></div><div className="warning-inline">{isConnect ? 'This site will be able to see your wallet address on this chain until you disconnect it.' : is7702 ? 'Delegation gives this contract special authority. Only approve if you trust the setup.' : isAddChain ? 'Only add chains you trust. Bad RPC endpoints can lie about network data.' : 'Never sign messages you do not understand.'}</div>{error ? <div className="inline-note danger-box">{error}</div> : null}</div></div><div className="approval-footer"><div className="approval-actions"><button className="btn light big clickable" disabled={busy} onClick={handleReject}>{isConnect ? 'Reject' : isAddChain ? 'Reject' : 'Cancel'}</button><button className="btn primary big clickable" disabled={busy} onClick={handleApprove}>{busy ? 'Working…' : isConnect ? 'Connect' : is7702 ? 'Approve' : isAddChain ? 'Add chain' : 'Sign'}</button></div></div></div></div>;
}
function ReviewRow({ label, value }: { label: string; value: string }) { return <div className="review-row"><span className="review-label">{label}</span><strong className="mono review-value truncate">{value}</strong></div>; }
