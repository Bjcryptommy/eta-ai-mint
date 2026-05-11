import { useState } from 'react';

export function AddChain({ action, setView }: { action: any; setView: any }) {
  const [chainName, setChainName] = useState('');
  const [chainId, setChainId] = useState('');
  const [rpcUrl, setRpcUrl] = useState('');
  const [symbol, setSymbol] = useState('');
  const [explorer, setExplorer] = useState('');
  const [error, setError] = useState<string | null>(null);

  function validateUrl(value: string) {
    try { new URL(value); return true; } catch { return false; }
  }

  async function save() {
    if (!chainName.trim()) throw new Error('Chain name is required.');
    if (!chainId.trim() || Number.isNaN(Number(chainId))) throw new Error('Chain ID must be a number.');
    if (!validateUrl(rpcUrl)) throw new Error('RPC URL must be a valid URL.');
    if (!symbol.trim()) throw new Error('Native currency symbol is required.');
    if (explorer.trim() && !validateUrl(explorer)) throw new Error('Explorer URL must be a valid URL.');
    await action('wallet:addCustomChain', { chain: { id: Number(chainId), name: chainName.trim(), rpcUrl: rpcUrl.trim(), symbol: symbol.trim(), explorer: explorer.trim() } });
    setView('home');
  }

  return <div className="card light"><div className="page-top"><button className="back-link" onClick={()=>setView('networks')}>← Back</button><div className="title medium">Add Custom Chain</div></div><label className="field"><span>Chain name</span><input className="input" value={chainName} onChange={(e)=>setChainName(e.target.value)} placeholder="My Chain" /></label><label className="field"><span>Chain ID</span><input className="input" value={chainId} onChange={(e)=>setChainId(e.target.value)} placeholder="1234" /></label><label className="field"><span>RPC URL</span><input className="input" value={rpcUrl} onChange={(e)=>setRpcUrl(e.target.value)} placeholder="https://..." /></label><label className="field"><span>Native currency symbol</span><input className="input" value={symbol} onChange={(e)=>setSymbol(e.target.value)} placeholder="ETH" /></label><label className="field"><span>Block explorer URL</span><input className="input" value={explorer} onChange={(e)=>setExplorer(e.target.value)} placeholder="https://..." /></label>{error ? <div className="inline-note danger-box">{error}</div> : null}<div className="footer-actions"><button className="btn light" onClick={()=>setView('networks')}>Cancel</button><button className="btn primary" onClick={()=>save().catch((e)=>setError(e.message))}>Save chain</button></div></div>;
}
