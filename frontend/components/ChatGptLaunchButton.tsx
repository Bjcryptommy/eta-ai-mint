'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { appConfig } from '@/lib/config';

export function ChatGptLaunchButton({ className = '' }: { className?: string }) {
  const { address } = useAccount();
  const [message, setMessage] = useState<string | null>(null);

  function handleClick() {
    if (!address) {
      setMessage('Connect wallet first so we can link your wallet to the ChatGPT mint session.');
      return;
    }
    setMessage(null);
    window.open(appConfig.mcpEndpoint, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        className={`brutal-hover inline-flex items-center justify-center gap-2 rounded-2xl border-[3px] border-mint bg-ink-2 px-4 py-3 text-sm font-black uppercase tracking-wide text-fog shadow-[4px_4px_0_#00f5d4] ${className}`}
      >
        connect ChatGPT →
      </button>
      {message ? <div className="rounded-2xl border-[3px] border-danger bg-danger/20 px-4 py-3 text-sm font-semibold text-fog">{message}</div> : null}
    </div>
  );
}
