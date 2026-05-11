import type { PersistedState } from '../../shared/types';
import { getChainById } from '../../shared/chains';
import { shortAddress } from '../../shared/utils';

export function ConnectedSites({ state, action, setView }: { state: PersistedState; action: any; setView: any }) {
  const chain = getChainById(state.settings.activeChainId, state.chains);

  return <div className="card light"><div className="page-top"><button className="back-link" onClick={()=>setView('settings')}>← Back</button><div className="title medium">Connected Sites</div></div><div className="list">{state.connectedSites.length===0 ? <div className="muted">No sites connected.</div> : state.connectedSites.map((site)=><div key={site.origin} className="site-row"><div className="site-meta"><div className="truncate"><strong>{site.origin}</strong></div><div className="muted mono truncate">{shortAddress(site.accounts[0])}</div><div className="muted truncate">{chain.name}</div></div><button className="btn secondary clickable" onClick={()=>action('wallet:disconnectSite',{origin:site.origin})}>Disconnect</button></div>)}</div>{state.connectedSites.length>0 ? <button className="btn light big clickable" onClick={()=>action('wallet:disconnectAllSites')}>Disconnect all</button> : null}</div>;
}
