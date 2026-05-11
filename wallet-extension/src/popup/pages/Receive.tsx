import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import type { PersistedState, VaultData } from '../../shared/types';
import { getChainById } from '../../shared/chains';
import { copyText } from '../../shared/utils';

export function Receive({ state, vault, setView }: { state: PersistedState; vault: VaultData | null; setView: any }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const address = vault?.accounts[state.activeAccountIndex]?.address || '';
  const chain = getChainById(state.settings.activeChainId, state.chains);
  useEffect(() => { if (canvasRef.current && address) { QRCode.toCanvas(canvasRef.current, address, { width: 190, margin: 2, color: { dark: '#0f172a', light: '#f8fafc' } }).catch(()=>setError('QR could not be rendered.')); } }, [address]);
  return <div className="card light"><div className="page-top"><button className="back-link clickable" onClick={()=>setView('home')}>← Back</button><div className="title medium">Receive</div></div><div className="notice-card dark">Receive {chain.symbol} on {chain.name}</div><div className="qr-card"><canvas ref={canvasRef} style={{display:'block',margin:'0 auto'}} /></div><div className="full-address mono">{address}</div><div className="footer-actions"><button className="btn primary clickable" onClick={async()=>{try{await copyText(address); setCopied(true); setTimeout(()=>setCopied(false),1500);}catch{setError('Copy failed.');}}}>Copy address</button></div><div className="muted" style={{marginTop:10,color:'#334155'}}>Only send assets on this network.</div>{copied ? <div className="toast-inline">Address copied.</div> : null}{error ? <div className="inline-note danger-box">{error}</div> : null}</div>;
}
