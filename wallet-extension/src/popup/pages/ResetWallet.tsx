import { useState } from 'react';

export function ResetWallet({ action, setView, backView = 'settings' }: { action: any; setView: any; backView?: 'settings' | 'home' }) {
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);
  return <div className="card light"><div className="page-top"><button className="back-link" onClick={()=>setView(backView)}>← Back</button><div className="title medium">Reset Wallet</div></div><div className="warning-card compact">This deletes the encrypted vault and connected wallet data from this browser. Type RESET to continue.</div><label className="field"><span>Confirmation</span><input className="input" value={confirmText} onChange={(e)=>setConfirmText(e.target.value)} placeholder="Type RESET" /></label>{error ? <div className="inline-note danger-box">{error}</div> : null}<div className="footer-actions"><button className="btn light" onClick={()=>setView(backView)}>Cancel</button><button className="btn primary" onClick={()=>{ if(confirmText !== 'RESET') return setError('Type RESET to confirm.'); action('wallet:reset').then(()=>setView('home')).catch((e:any)=>setError(e.message)); }}>Reset wallet</button></div></div>;
}
