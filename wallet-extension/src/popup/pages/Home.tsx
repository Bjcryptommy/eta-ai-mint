import { useEffect, useMemo, useState } from 'react';
import { getChainById } from '../../shared/chains';
import type { PersistedState, VaultData } from '../../shared/types';
import { WalletCard } from '../../components/WalletCard';
import { TokenRow } from '../../components/TokenRow';
import { getDefaultTokensForChain } from '../../shared/tokens';
import { copyText, shortAddress } from '../../shared/utils';

export function Home({ state, vault, action, setView }: { state: PersistedState; vault: VaultData | null; action: any; setView: any }) {
  const [balance, setBalance] = useState('0');
  const [tokenBalances, setTokenBalances] = useState<Record<string, string>>({});
  const [usdValue, setUsdValue] = useState<number | null>(null);
  const [nativePriceUsd, setNativePriceUsd] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const chain = getChainById(state.settings.activeChainId, state.chains);
  const account = vault?.accounts[state.activeAccountIndex];
  const primaryAddress = account?.address || state.primaryAddress;
  const topSite = state.connectedSites[0];
  const isWrongNetwork = state.connectedSites.length > 0 && chain.id !== 11155111;
  const statusTone = !state.isUnlocked ? 'locked' : isWrongNetwork ? 'warn' : topSite ? 'connected' : 'idle';
  const statusTitle = !state.isUnlocked ? 'Wallet locked' : isWrongNetwork ? 'Wrong network' : topSite ? `Connected to ${topSite.origin}` : 'No connected site';

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    async function load() {
      let latestBalance: string | null = null;
      try {
        const res: any = await action('wallet:getBalance');
        latestBalance = String(res?.balance?.formatted || '0');
        if (!cancelled) {
          setBalance(latestBalance);
          setMessage(null);
        }
      } catch {
        if (!cancelled) {
          setMessage('Balance unavailable. Check RPC/network.');
        }
      }

      if (latestBalance !== null) {
        try {
          const priceRes: any = await action('wallet:getNativePrice');
          const price = Number(priceRes?.priceUsd || 0);
          if (!cancelled && Number.isFinite(price) && price > 0) {
            setNativePriceUsd(price);
            setUsdValue(Number(latestBalance || 0) * price);
            setMessage(null);
          }
        } catch {
          if (!cancelled) {
            setMessage((current) => current || 'Price unavailable right now.');
          }
        }
      }
      try {
        const tokens = [...getDefaultTokensForChain(chain.id), ...state.tokens.filter((token) => token.chainId === chain.id)];
        const unique = tokens.filter((token, index, arr) => arr.findIndex((item) => item.address.toLowerCase() === token.address.toLowerCase()) === index);
        const entries = await Promise.all(unique.map(async (token) => {
          try {
            const res: any = await action('wallet:getTokenBalance', { address: token.address, decimals: token.decimals });
            return [token.address.toLowerCase(), res.balance.formatted] as const;
          } catch {
            return [token.address.toLowerCase(), '0'] as const;
          }
        }));
        if (!cancelled) setTokenBalances(Object.fromEntries(entries));
      } catch {
        // ignore token balance failures individually
      }
      if (!cancelled) timer = window.setTimeout(load, 15000);
    }
    load();
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [state.settings.activeChainId, state.activeAccountIndex]);

  const tokens = useMemo(() => {
    const native = { symbol: chain.symbol, name: chain.name.includes('BSC') ? 'BNB Smart Chain' : 'Ethereum', balance, key: `${chain.id}-native`, usd: nativePriceUsd !== null ? Number(balance || 0) * nativePriceUsd : null };
    const stableSymbols = new Set(['USDC', 'USDT', 'DAI', 'USDE', 'FDUSD', 'TUSD']);
    const defaults = getDefaultTokensForChain(chain.id).map((token) => {
      const tokenBalance = tokenBalances[token.address.toLowerCase()] || '0';
      const usd = stableSymbols.has(String(token.symbol || '').toUpperCase()) ? Number(tokenBalance || 0) : null;
      return { ...token, balance: tokenBalance, usd };
    });
    const customs = state.tokens
      .filter((token) => token.chainId === chain.id)
      .filter((token) => !defaults.some((d) => d.address.toLowerCase() === token.address.toLowerCase()))
      .map((token) => {
        const tokenBalance = tokenBalances[token.address.toLowerCase()] || '0';
        const usd = stableSymbols.has(String(token.symbol || '').toUpperCase()) ? Number(tokenBalance || 0) : null;
        return { ...token, balance: tokenBalance, usd };
      });
    return [native, ...defaults, ...customs];
  }, [chain.id, chain.symbol, chain.name, balance, nativePriceUsd, state.tokens, tokenBalances]);

  async function copyAddress() {
    if (!primaryAddress) return;
    try { await copyText(primaryAddress); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { setMessage('Copy failed.'); }
  }

  function openExplorer() {
    if (!primaryAddress) return;
    if (!chain.explorer) { setMessage('No explorer configured for this network.'); return; }
    window.open(`${chain.explorer}/address/${primaryAddress}`, '_blank', 'noopener,noreferrer');
  }

  return <div className="wallet-stack home-layout"><WalletCard state={state} vault={vault} balance={balance} usdValue={usdValue} /><div className="action-row"><button className="btn primary flex-1 clickable" onClick={() => setView('send')}>Send</button><button className="btn light flex-1 clickable" onClick={() => setView('receive')}>Receive</button><button className="btn secondary flex-1 clickable" onClick={openExplorer}>Explorer</button></div>{copied ? <div className="toast-inline">Copied.</div> : null}{message ? <div className="inline-note danger-box">{message}</div> : null}<div className="card light"><div className="row"><strong>My Tokens</strong></div><div className="list" style={{ marginTop: 10 }}>{tokens.map((token: any, index) => <TokenRow key={token.key || token.address || index} name={token.name} symbol={token.symbol} balance={`${Number(token.balance || 0).toFixed(4)}`} value={token.usd === null || !Number.isFinite(token.usd) ? '—' : `$${token.usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />)}</div><button className="add-token-row clickable" onClick={() => setView('token')}>+ Add custom token</button></div><div className="bottom-status-wrap"><div className="bottom-status-bar" role="button" onClick={() => setView('sites')}><div className="bottom-status-main"><span className={`status-dot ${statusTone}`} /><div className="status-copy"><div className="status-title">{statusTitle}</div><div className="status-sub"><span>{shortAddress(primaryAddress)}</span><span>{chain.name}</span></div></div></div><button className="bottom-status-chip clickable" onClick={(e) => { e.stopPropagation(); setView('sites'); }}>Sites</button></div></div></div>;
}
