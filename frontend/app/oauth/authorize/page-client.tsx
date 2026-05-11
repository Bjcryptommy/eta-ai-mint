'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BrutalButton, BrutalCard, InfoBox, SectionLabel, TagBadge } from '@/components/brutal-ui';
import { appConfig } from '@/lib/config';

type SessionData = {
  ok: boolean;
  session?: {
    id: string;
    wallet_address: string | null;
    status: string;
    expires_at: string;
    connect_url: string;
  };
  wallet_status?: {
    wallet: string;
    delegated: boolean;
    quotaRemaining: string;
    tokenBalance: string;
    mintsOf: string;
  } | null;
  delegateAddress?: string;
  chainId?: number;
  message?: string;
};

export default function OauthAuthorizeClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session') || '';
  const grantId = searchParams.get('grant') || '';
  const stateParam = searchParams.get('state') || '';
  const redirectUri = searchParams.get('redirect_uri') || '';
  const mcpOrigin = searchParams.get('mcp_origin') || appConfig.mcpEndpoint.replace(/\/mcp$/, '');
  const [session, setSession] = useState<SessionData | null>(null);
  const [wallet, setWallet] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [busy, setBusy] = useState<string>('');
  const [error, setError] = useState<string>('');

  const requestedScopes = useMemo(() => [
    'read wallet status',
    'read token balance',
    'read mint quota',
    'request mint through relayer',
    'check delegation status',
  ], []);

  async function loadSession() {
    if (!sessionId) return;
    const res = await fetch(`/api/auth/session/${encodeURIComponent(sessionId)}`, { cache: 'no-store' });
    const data = await res.json();
    setSession(data);
    if (data?.session?.wallet_address) setWallet(data.session.wallet_address);
  }

  useEffect(() => {
    loadSession().catch((err) => setError(err?.message || 'Failed to load authorization session.'));
  }, [sessionId]);

  async function connectWallet() {
    try {
      setBusy('connect');
      setError('');
      const ethereum = (window as any).ethereum;
      if (!ethereum) throw new Error('No wallet found. Open this page in a browser with CATSHIT Wallet or another EVM wallet installed.');
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      if (!accounts?.[0]) throw new Error('Wallet connection was cancelled.');
      setWallet(accounts[0]);
    } catch (err: any) {
      setError(err?.message || 'Wallet connection failed.');
    } finally {
      setBusy('');
    }
  }

  async function signIn() {
    try {
      if (!wallet) throw new Error('Connect a wallet first.');
      setBusy('sign');
      setError('');
      const nonceRes = await fetch(`/api/auth/nonce?session=${encodeURIComponent(sessionId)}&wallet=${encodeURIComponent(wallet)}`, { cache: 'no-store' });
      const nonceData = await nonceRes.json();
      if (!nonceRes.ok) throw new Error(nonceData?.message || 'Failed to create sign-in message.');
      setMessage(nonceData.message);
      const ethereum = (window as any).ethereum;
      const signature = await ethereum.request({ method: 'personal_sign', params: [nonceData.message, wallet] });
      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, wallet_address: wallet, signature, message: nonceData.message }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData?.message || 'Signature verification failed.');
      await loadSession();
    } catch (err: any) {
      setError(err?.message || 'Sign-in failed.');
    } finally {
      setBusy('');
    }
  }

  async function disconnectSession() {
    try {
      setBusy('disconnect');
      setError('');
      const res = await fetch('/api/auth/disconnect', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Disconnect failed.');
      await loadSession();
    } catch (err: any) {
      setError(err?.message || 'Disconnect failed.');
    } finally {
      setBusy('');
    }
  }

  const delegated = Boolean(session?.wallet_status?.delegated);
  const signed = ['signed', 'delegated'].includes(session?.session?.status || '');
  const complete = signed;
  const approveHref = grantId && sessionId ? `${mcpOrigin}/oauth/approve?grant=${encodeURIComponent(grantId)}&session=${encodeURIComponent(sessionId)}${stateParam ? `&state=${encodeURIComponent(stateParam)}` : ''}${redirectUri ? `&redirect_uri=${encodeURIComponent(redirectUri)}` : ''}` : '';

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-10 md:px-6">
      <SectionLabel tone="mint">CATSHIT MCP AUTHORIZATION</SectionLabel>
      <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
        <BrutalCard tone="dark" className="space-y-5">
          <div>
            <div className="display-text text-5xl leading-none">Authorize CATSHIT MCP</div>
            <p className="mt-4 text-sm leading-7 opacity-85">Claude/ChatGPT is requesting permission to use CATSHIT tools for your wallet. This will not expose your private key or seed phrase.</p>
          </div>

          <InfoBox title="requested access" tone="black">
            <ul className="space-y-2">
              {requestedScopes.map((scope) => <li key={scope}>• {scope}</li>)}
            </ul>
          </InfoBox>

          <div className="grid gap-4 md:grid-cols-2">
            <InfoBox title="1. connect wallet" tone="light">Connect CATSHIT Wallet extension or another EVM wallet.</InfoBox>
            <InfoBox title="2. sign wallet login" tone="light">Sign a SIWE-style message that binds this auth session to your wallet.</InfoBox>
            <InfoBox title="3. check delegation" tone="light">We confirm whether your wallet is already delegated to the CATSHIT MintDelegate.</InfoBox>
            <InfoBox title="4. complete" tone="light">Return to Claude/ChatGPT and use CATSHIT tools safely from the linked session.</InfoBox>
          </div>

          <div className="flex flex-wrap gap-3">
            <BrutalButton tone="mint" onClick={connectWallet} disabled={busy !== ''}>{busy === 'connect' ? 'Connecting…' : 'Connect Wallet'}</BrutalButton>
            <BrutalButton tone="gold" onClick={signIn} disabled={!wallet || busy !== ''}>{busy === 'sign' ? 'Signing…' : 'Sign In With Wallet'}</BrutalButton>
            <BrutalButton tone="light" onClick={loadSession} disabled={busy !== ''}>Continue</BrutalButton>
            <BrutalButton tone="danger" onClick={disconnectSession} disabled={busy !== ''}>Cancel / Disconnect</BrutalButton>
          </div>

          {wallet ? <InfoBox title="connected wallet" tone="mint">{wallet}</InfoBox> : null}
          {message ? <InfoBox title="message to sign" tone="dark"><pre className="whitespace-pre-wrap break-words text-xs leading-6">{message}</pre></InfoBox> : null}
          {error ? <InfoBox title="error" tone="gold">{error}</InfoBox> : null}
        </BrutalCard>

        <div className="space-y-4">
          <BrutalCard tone="light" className="space-y-4 text-ink">
            <div className="flex items-center justify-between gap-3">
              <SectionLabel tone="purple">SESSION</SectionLabel>
              <TagBadge tone={complete ? 'mint' : signed ? 'gold' : 'light'}>{session?.session?.status || 'loading'}</TagBadge>
            </div>
            <div className="text-sm leading-7">
              <div><strong>Session:</strong> {sessionId || 'missing'}</div>
              <div><strong>Chain:</strong> {session?.chainId || appConfig.chainId}</div>
              <div><strong>Expires:</strong> {session?.session?.expires_at || '—'}</div>
              <div><strong>Wallet:</strong> {session?.session?.wallet_address || 'not linked'}</div>
            </div>
          </BrutalCard>

          <BrutalCard tone="black" className="space-y-4">
            <SectionLabel tone="mint">STATE</SectionLabel>
            <ul className="space-y-3 text-sm leading-7">
              <li>1. Wallet connected: {wallet ? 'yes' : 'no'}</li>
              <li>2. Signed: {signed ? 'yes' : 'no'}</li>
              <li>3. Delegated: {delegated ? 'yes' : 'no'}</li>
              <li>4. Completed: {complete ? 'yes' : 'no'}</li>
            </ul>
            {delegated ? (
              <InfoBox title="delegation" tone="mint">Delegation is active. Claude/ChatGPT can mint only for this linked wallet.</InfoBox>
            ) : signed ? (
              <InfoBox title="delegation" tone="gold">Wallet is linked but not delegated yet. If you need minting, activate EIP-7702 delegation in the CATSHIT wallet flow.</InfoBox>
            ) : (
              <InfoBox title="next step" tone="dark">Connect your wallet, then sign the login message.</InfoBox>
            )}
          </BrutalCard>

          <BrutalCard tone="mint" className="text-ink">
            <SectionLabel tone="black">DONE</SectionLabel>
            <p className="mt-3 text-sm leading-7">{complete ? 'Authorization complete. Finish the Claude approval redirect below.' : 'Finish wallet connect + signature here, then continue approval.'}</p>
            {complete && approveHref ? <div className="mt-4"><BrutalButton href={approveHref} tone="dark">Approve Claude Access</BrutalButton></div> : null}
          </BrutalCard>
        </div>
      </div>
    </main>
  );
}
