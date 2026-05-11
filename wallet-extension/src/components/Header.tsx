import type { PersistedState, VaultData } from '../shared/types';
import { getChainById } from '../shared/chains';
import { shortAddress } from '../shared/utils';
import { BrandLogo } from './BrandLogo';

export function Header({ state, vault, onOpenAccount, onOpenNetwork, onOpenSettings, onLock }: { state: PersistedState; vault: VaultData | null; onOpenAccount: ()=>void; onOpenNetwork: ()=>void; onOpenSettings: ()=>void; onLock: ()=>void }) {
  const account = vault?.accounts[state.activeAccountIndex];
  const chain = getChainById(state.settings.activeChainId, state.chains);
  return <div className="wallet-header"><button className="header-account clickable" onClick={onOpenAccount}><BrandLogo size={34} /><div><div className="header-title">{account?.name || state.primaryAccountName || 'Account 1'}</div><div className="header-sub mono">{shortAddress(account?.address || state.primaryAddress)}</div></div></button><div className="header-actions"><button className="network-pill clickable" onClick={onOpenNetwork}>{chain.name} ▼</button><button className="icon-btn settings-btn clickable" onClick={onOpenSettings} aria-label="Settings">⚙</button><button className="icon-btn clickable" onClick={onLock} aria-label="Lock wallet">🔒</button></div></div>;
}
