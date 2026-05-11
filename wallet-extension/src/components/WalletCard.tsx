import type { PersistedState, VaultData } from '../shared/types';
import { getChainById } from '../shared/chains';

export function WalletCard({ state, vault, balance = '0', usdValue = null }: { state: PersistedState; vault: VaultData | null; balance?: string; usdValue?: number | null }) {
  const account = vault?.accounts[state.activeAccountIndex];
  const chain = getChainById(state.settings.activeChainId, state.chains);
  return <div className="balance-card"><div className="muted caps">Total worth</div><div className="balance-value">{usdValue === null ? '—' : `$${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</div><div className="balance-native">{Number(balance || 0).toFixed(4)} {chain.symbol}</div></div>;
}
