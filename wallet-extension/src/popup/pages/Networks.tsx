import { DEFAULT_CHAINS } from '../../shared/chains';
import type { PersistedState } from '../../shared/types';

export function Networks({ state, action, setView }: { state: PersistedState; action: any; setView: any }) {
  return <div className="card light"><div className="page-top"><button className="back-link" onClick={()=>setView('home')}>← Back</button><div className="title medium">Networks</div></div><div className="list">{state.chains.map((chain)=>{ const removable = !DEFAULT_CHAINS.some((item)=>item.id===chain.id); return <div key={chain.id} className="network-row-wrap"><button className="network-row clickable" onClick={()=>action('wallet:updateState',{patch:{settings:{activeChainId:chain.id}}}).then(()=>setView('home'))}><div><div>{chain.name}</div><div className="muted mono">{chain.symbol}</div></div><strong>{state.settings.activeChainId===chain.id ? '✓' : ''}</strong></button>{removable ? <button className="mini-danger clickable" onClick={()=>action('wallet:removeCustomChain',{chainId:chain.id})}>Remove</button> : null}</div>;})}</div><button className="add-token-row clickable" onClick={()=>setView('addChain')}>+ Add custom chain</button></div>;
}
