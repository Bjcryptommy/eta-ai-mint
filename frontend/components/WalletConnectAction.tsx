'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { useAccount, useChainId, useConnect, useDisconnect } from 'wagmi';
import { appConfig } from '@/lib/config';

declare global {
  interface Window {
    catshitWallet?: any;
    ethereum?: any;
  }
}

type Props = {
  label?: string;
  className?: string;
  tone?: 'mint' | 'dark' | 'light';
};

type DetectedProvider = { name: string; rdns?: string };
const DEV_LOGS = process.env.NODE_ENV !== 'production';

export function WalletConnectAction({ label = 'connect wallet', className, tone = 'mint' }: Props) {
  const { address, isConnected } = useAccount();
  const activeChainId = useChainId();
  const { disconnect } = useDisconnect();
  const { connect, connectors, error, isPending, variables } = useConnect();
  const [open, setOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [detected, setDetected] = useState<DetectedProvider[]>([]);
  const [hasCatshitFallback, setHasCatshitFallback] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const seen = new Map<string, DetectedProvider>();
    const onAnnounce = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      const info = detail?.info;
      if (!info?.name) return;
      const key = info.uuid || info.rdns || info.name;
      seen.set(key, { name: info.name, rdns: info.rdns });
      const next = Array.from(seen.values());
      setDetected(next);
      if (DEV_LOGS) console.info('[catshit-site][wallets] detected eip6963 providers', next.map((item) => item.name));
    };
    window.addEventListener('eip6963:announceProvider', onAnnounce as EventListener);
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    setTimeout(() => {
      const fallback = Boolean(window.catshitWallet);
      setHasCatshitFallback(fallback);
      if (DEV_LOGS) console.info('[catshit-site][wallets]', {
        catshitWalletExists: fallback,
        ethereumExists: Boolean(window.ethereum),
      });
    }, 300);
    return () => window.removeEventListener('eip6963:announceProvider', onAnnounce as EventListener);
  }, []);

  const sortedConnectors = useMemo(() => {
    const rank = (connector: { id?: string; name: string }) => {
      if (connector.id === 'catshit-wallet' || /catshit/i.test(connector.name)) return 0;
      if (/doge/i.test(connector.name)) return 1;
      if (/meta/i.test(connector.name)) return 2;
      return 3;
    };

    const filtered = connectors.filter((connector) => {
      if (/catshit/i.test(connector.name)) return connector.id === 'catshit-wallet';
      return true;
    });

    const deduped = new Map<string, typeof connectors[number]>();
    for (const connector of filtered) {
      const key = connector.id === 'catshit-wallet'
        ? 'catshit-wallet'
        : /doge/i.test(connector.name)
          ? 'dogeshit'
          : /meta/i.test(connector.name)
            ? 'metamask'
            : `${connector.id}:${connector.name}`;
      if (!deduped.has(key)) deduped.set(key, connector);
    }

    return Array.from(deduped.values()).sort((a, b) => rank(a) - rank(b));
  }, [connectors]);

  useEffect(() => {
    if (!showMenu) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setShowMenu(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowMenu(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [showMenu]);

  const toneClass = tone === 'dark'
    ? 'bg-ink-2 text-fog border-mint shadow-[4px_4px_0_#00f5d4]'
    : tone === 'light'
      ? 'bg-fog text-ink border-ink shadow-[4px_4px_0_#0b1020]'
      : 'bg-mint text-ink border-ink shadow-[4px_4px_0_#0b1020]';

  return (
    <div className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => isConnected ? setShowMenu((value) => !value) : setOpen(true)}
        className={clsx('brutal-hover inline-flex items-center justify-center gap-2 rounded-2xl border-[3px] px-4 py-3 text-sm font-black uppercase tracking-wide', toneClass, className)}
      >
        {isConnected && address ? `${address.slice(0, 6)}…${address.slice(-4)}` : label}
      </button>

      {showMenu && isConnected ? (
        <div ref={menuRef} className="absolute right-0 z-[110] mt-2 w-[min(22rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] rounded-[24px] border-[3px] border-mint bg-ink-2 p-4 text-fog shadow-[8px_8px_0_#00f5d4]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="mono-ui text-[11px] font-bold uppercase tracking-[0.24em] text-mint">wallet connected</div>
              <div className="mt-2 break-all text-sm font-bold">{address}</div>
              <div className="mt-2 text-xs text-fog/70">{appConfig.networkName} · current chain {activeChainId ?? '—'}</div>
            </div>
            <button type="button" className="rounded-xl border-[2px] border-fog/25 px-2 py-1 text-xs uppercase" onClick={() => setShowMenu(false)}>close</button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button type="button" className="rounded-2xl border-[3px] border-fog/30 bg-panel px-4 py-3 text-sm font-black uppercase tracking-wide text-fog" onClick={() => { navigator.clipboard?.writeText(address || ''); setShowMenu(false); }}>
              copy address
            </button>
            <button type="button" className="rounded-2xl border-[3px] border-ink bg-mint px-4 py-3 text-sm font-black uppercase tracking-wide text-ink" onClick={() => { disconnect(); setShowMenu(false); }}>
              disconnect
            </button>
          </div>
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm rounded-[24px] border-[3px] border-mint bg-ink-2 p-4 text-fog shadow-[8px_8px_0_#00f5d4]" onClick={(e) => e.stopPropagation()}>
            <div className="display-text text-3xl leading-none">CONNECT WALLET</div>
            <div className="mt-2 text-sm text-fog/75">Choose CATSHIT Wallet first for the EIP-7702 flow.</div>
            <div className="mt-4 grid gap-3">
              {sortedConnectors.map((connector, index) => (
                <button
                  key={`${connector.id}-${connector.name}-${index}`}
                  type="button"
                  className="rounded-2xl border-[3px] border-mint bg-panel px-4 py-3 text-left text-sm font-black uppercase tracking-wide text-fog"
                  onClick={() => {
                    if (DEV_LOGS) console.info('[catshit-site][wallets] selected provider', { id: connector.id, name: connector.name });
                    connect({ connector });
                    setOpen(false);
                  }}
                >
                  {connector.name}
                  {isPending && variables?.connector?.name === connector.name ? ' …' : ''}
                </button>
              ))}
            </div>
            {!detected.some((item) => /catshit/i.test(item.name) || item.rdns === 'com.catshit.wallet') && !hasCatshitFallback ? (
              <div className="mt-4 rounded-2xl border-[2px] border-fog/30 bg-panel p-3 text-xs text-fog/80">
                Install CATSHIT Wallet to use EIP-7702 mint setup.
              </div>
            ) : null}
            {error ? <div className="mt-3 text-xs text-red-300">{error.message}</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
