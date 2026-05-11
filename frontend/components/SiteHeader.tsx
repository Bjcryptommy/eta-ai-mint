'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { appConfig } from '@/lib/config';
import { clsx } from 'clsx';

const nav = [
  { href: '/', label: 'home' },
  { href: '/connect', label: 'connect' },
  { href: '/proof', label: 'proof' },
  { href: '/revoke', label: 'revoke' },
  { href: '/stickers', label: 'stickers' },
];

const walletExtensionUrl = 'chrome-extension://femmejnpejmlddbbhnfnedlnaogneicf/popup.html';

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-50 border-b-[3px] border-mint bg-ink-2/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1050px] flex-wrap items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border-[3px] border-mint bg-panel text-xl font-black text-mint shadow-[4px_4px_0_#00f5d4]">🐈‍⬛</div>
          <div>
            <div className="display-text text-3xl leading-none text-fog">CATSHIT</div>
            <div className="mono-ui text-[11px] font-bold uppercase tracking-[0.24em] text-mint">$catshit</div>
          </div>
        </Link>
        <nav className="flex flex-wrap items-center gap-2">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className={clsx('mono-ui rounded-xl border-[3px] px-3 py-2 text-xs font-bold uppercase tracking-[0.22em]', active ? 'border-ink bg-mint text-ink shadow-[4px_4px_0_#e5e7eb]' : 'border-mint bg-panel text-fog')}>
                {item.label}
              </Link>
            );
          })}
          <a
            href={walletExtensionUrl}
            target="_blank"
            rel="noreferrer"
            className="mono-ui rounded-xl border-[3px] border-mint bg-panel px-3 py-2 text-xs font-bold uppercase tracking-[0.22em] text-fog cursor-pointer"
          >
            wallet ↗
          </a>
        </nav>
        <div className="mono-ui rounded-xl border-[3px] border-fog/30 bg-panel px-3 py-2 text-xs font-bold uppercase tracking-[0.22em] text-fog-2">
          {appConfig.networkSlug} · chainId {appConfig.chainId}
        </div>
      </div>
    </header>
  );
}
