import { appConfig } from '@/lib/config';

export function RevokePanel() {
  return (
    <div className="card" id="revoke">
      <div className="card-head">
        <div>
          <div className="eyebrow">Revoke</div>
          <div className="section-title">Leave with one clean wallet action</div>
        </div>
      </div>
      <div className="stack">
        <div className="notice">Active delegate target: {appConfig.delegateAddress}</div>
        <div className="notice">Revoking means sending a new EIP-7702 authorization that clears or replaces the current delegate on your wallet.</div>
        <div className="notice">Once revoked, the relayer and ChatGPT should no longer be able to mint on behalf of that wallet.</div>
        <div className="notice">For launch, this panel can become a full guided revoke page without changing the backend or contract architecture.</div>
      </div>
    </div>
  );
}
