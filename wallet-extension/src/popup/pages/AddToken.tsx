import { useState } from 'react';
import { getAddress } from 'viem';
import type { PersistedState } from '../../shared/types';

export function AddToken({ state, action, setView }: { state: PersistedState; action: any; setView: any }) {
  const [address, setAddress] = useState('');
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [decimals, setDecimals] = useState('18');
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  async function lookup() {
    try {
      setError(null);
      const res = await action('wallet:getTokenMetadata', { address });
      setSymbol(res.result.symbol);
      setName(res.result.name);
      setDecimals(String(res.result.decimals));
      setPreview(`${res.result.symbol} · ${res.result.name}`);
    } catch (e:any) {
      setPreview(null);
      setError(e.message || 'Could not auto-load token metadata. You can enter it manually.');
    }
  }

  return <div className="card light"><div className="page-top"><button className="back-link clickable" onClick={()=>setView('home')}>← Back</button><div className="title medium">Add Custom Token</div></div><label className="field"><span>Contract address</span><div className="input-group"><input className="input mono" placeholder="0x..." value={address} onChange={(e)=>setAddress(e.target.value)} /><button className="inline-btn clickable" onClick={lookup}>Auto-load</button></div></label>{preview ? <div className="notice-card">Preview: {preview}</div> : null}<label className="field"><span>Symbol</span><input className="input" placeholder="USDC" value={symbol} onChange={(e)=>setSymbol(e.target.value)} /></label><label className="field"><span>Name</span><input className="input" placeholder="USD Coin" value={name} onChange={(e)=>setName(e.target.value)} /></label><label className="field"><span>Decimals</span><input className="input" placeholder="18" value={decimals} onChange={(e)=>setDecimals(e.target.value)} /></label>{error ? <div className="inline-note danger-box">{error}</div> : null}<button className="btn primary big clickable" onClick={()=>action('wallet:updateState',{patch:{tokens:[...state.tokens,{chainId:state.settings.activeChainId,address:getAddress(address),symbol:symbol.trim(),name:name.trim(),decimals:Number(decimals)}]}}).then(()=>setView('home')).catch((e:any)=>setError(e.message))}>Save Token</button></div>;
}
