'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAccount, useDisconnect, useWalletClient } from 'wagmi';
import { BrutalButton, BrutalCard, InfoBox, SectionLabel, TagBadge } from '@/components/brutal-ui';
import { WalletConnectAction } from '@/components/WalletConnectAction';
import { appConfig } from '@/lib/config';
import { activateDelegation, revokeDelegation } from '@/lib/delegation';

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
    formattedBalance?: string;
    displayBalance?: string;
    mintsOf: string;
  } | null;
  chainId?: number;
  message?: string;
};

declare global {
  interface Window {
    catshitWallet?: any;
    ethereum?: any;
  }
}

function short(addr?: string | null) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '—';
}

function networkLabel(chainId?: number | null) {
  if (chainId === 11155111) return 'Sepolia';
  if (chainId === 1) return 'Ethereum';
  return 'Unknown network';
}

function formatExpiry(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function getCatshitProvider(walletClient: any) {
  if (walletClient) return walletClient;
  if (typeof window !== 'undefined' && window.catshitWallet) return window.catshitWallet;
  const providers = window.ethereum?.providers;
  if (Array.isArray(providers)) {
    return providers.find((provider: any) => provider?.isCATSHITWallet || provider?.rdns === 'com.catshit.wallet') || null;
  }
  return null;
}

export default function OauthAuthorizeClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session') || '';
  const grantId = searchParams.get('grant') || '';
  const stateParam = searchParams.get('state') || '';
  const redirectUri = searchParams.get('redirect_uri') || '';
  const mcpOrigin = searchParams.get('mcp_origin') || appConfig.mcpEndpoint.replace(/\/mcp$/, '');
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: walletClient } = useWalletClient();
  const [session, setSession] = useState<SessionData | null>(null);
  const [busy, setBusy] = useState<'refresh' | 'sign' | 'approve' | 'disconnect' | 'delegate' | 'revoke' | null>(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [approved, setApproved] = useState(false);
  const [delegationKnown, setDelegationKnown] = useState(false);

  const connectedWallet = address || session?.session?.wallet_address || '';
  const backendSigned = ['signed', 'delegated'].includes(session?.session?.status || '');
  const backendDelegated = Boolean(session?.wallet_status?.delegated);
  const delegationStatus = !delegationKnown && !session?.wallet_status ? 'Unknown' : backendDelegated ? 'Active' : session?.wallet_status ? 'Not active' : 'Unknown';
  const canApprove = Boolean(backendSigned && grantId && sessionId && redirectUri);
  const approveUrl = canApprove
    ? `${mcpOrigin}/oauth/approve?grant=${encodeURIComponent(grantId)}&session=${encodeURIComponent(sessionId)}${stateParam ? `&state=${encodeURIComponent(stateParam)}` : ''}${redirectUri ? `&redirect_uri=${encodeURIComponent(redirectUri)}` : ''}`
    : '';

  async function loadSession() {
    if (!sessionId) return;
    setBusy('refresh');
    const res = await fetch(`/api/auth/session/${encodeURIComponent(sessionId)}`, { cache: 'no-store' });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Failed to load authorization session.');
    setSession(data);
    setDelegationKnown(Boolean(data?.wallet_status));
    setBusy(null);
    return data;
  }

  useEffect(() => {
    loadSession().catch((err) => {
      setBusy(null);
      setError(err?.message || 'Failed to load authorization session.');
    });
  }, [sessionId]);

  async function signIn() {
    try {
      if (!connectedWallet) throw new Error('Connect your wallet first.');
      if (backendSigned) {
        setInfo('This wallet has already signed and is linked to this Claude session.');
        return;
      }
      const provider = getCatshitProvider(walletClient as any);
      if (!provider) throw new Error('Connect CATSHIT Wallet first.');
      setBusy('sign');
      setError('');
      setInfo('');
      const nonceRes = await fetch(`/api/auth/nonce?session=${encodeURIComponent(sessionId)}&wallet=${encodeURIComponent(connectedWallet)}`, { cache: 'no-store' });
      const nonceData = await nonceRes.json();
      if (!nonceRes.ok) throw new Error(nonceData?.message || 'Failed to create sign-in message.');
      const signature = await provider.request({ method: 'personal_sign', params: [nonceData.message, connectedWallet] });
      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, wallet_address: connectedWallet, signature, message: nonceData.message }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData?.message || 'Signature verification failed.');
      await loadSession();
      setInfo('This wallet is linked to this Claude session.');
    } catch (err: any) {
      setError(err?.message || 'Sign-in failed.');
    } finally {
      setBusy(null);
    }
  }

  async function runDelegation(action: 'delegate' | 'revoke') {
    try {
      if (!connectedWallet) throw new Error('Connect your wallet first.');
      const provider = getCatshitProvider(walletClient as any);
      if (!provider) throw new Error('Connect CATSHIT Wallet first.');
      setBusy(action);
      setError('');
      setInfo(action === 'delegate' ? 'Activating delegation…' : 'Revoking delegation…');
      if (action === 'delegate') {
        await activateDelegation(provider, connectedWallet as `0x${string}`, appConfig.delegateAddress as `0x${string}`);
      } else {
        await revokeDelegation(provider, connectedWallet as `0x${string}`);
      }
      await loadSession();
      setInfo(action === 'delegate' ? 'Delegation activated.' : 'Delegation revoked.');
    } catch (err: any) {
      setError(err?.message || `${action} failed.`);
    } finally {
      setBusy(null);
    }
  }

  async function approveClaude() {
    try {
      if (!approveUrl) throw new Error('Sign with your wallet first.');
      setBusy('approve');
      setError('');
      setInfo('This completes authorization and returns you to Claude.');
      setApproved(true);
      window.location.href = approveUrl;
    } catch (err: any) {
      setApproved(false);
      setBusy(null);
      setError(err?.message || 'Approval failed.');
    }
  }

  async function disconnectWalletAndSession() {
    try {
      setBusy('disconnect');
      setError('');
      setInfo('');
      if (isConnected) disconnect();
      const res = await fetch('/api/auth/disconnect', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Disconnect failed.');
      await loadSession();
      setInfo('Authorization cancelled.');
      setApproved(false);
    } catch (err: any) {
      setError(err?.message || 'Disconnect failed.');
    } finally {
      setBusy(null);
    }
  }

  const progressItems: { label: string; value: string; tone: 'mint' | 'gold' | 'light' }[] = [
    { label: 'Wallet connected', value: isConnected && connectedWallet ? 'Yes' : 'No', tone: isConnected && connectedWallet ? 'mint' : 'light' },
    { label: 'Wallet linked', value: backendSigned ? 'Yes' : 'No', tone: backendSigned ? 'mint' : 'light' },
    { label: 'Delegation status', value: delegationStatus, tone: delegationStatus === 'Active' ? 'mint' : delegationStatus === 'Not active' ? 'gold' : 'light' },
    { label: 'Claude access', value: approved ? 'Approved' : 'Not approved', tone: approved ? 'mint' : 'light' },
  ];

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-8 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="display-text text-3xl leading-none text-fog">CATSHIT × CLAUDE</Link>
        <Link href="/" className="mono-ui text-sm uppercase tracking-[0.18em] text-mint underline">Back to home</Link>
      </div>

      <SectionLabel tone="mint">Authorization</SectionLabel>
      <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <BrutalCard tone="dark" className="space-y-5">
          <div>
            <div className="display-text text-5xl leading-none">Approve Claude Access</div>
            <p className="mt-4 text-sm leading-7 opacity-85">Connect your wallet, sign once to link this Claude session, then approve access.</p>
          </div>

          <InfoBox title="requested access" tone="black">
            <ul className="space-y-2">
              <li>• Read wallet status</li>
              <li>• Read token balance</li>
              <li>• Read mint quota</li>
              <li>• Request mint through relayer</li>
              <li>• Check delegation status</li>
            </ul>
          </InfoBox>

          <div className="space-y-4">
            <InfoBox title="step 1 · connect wallet" tone="light">
              <div className="flex flex-wrap items-center gap-3">
                <WalletConnectAction tone="mint" label="Connect CATSHIT Wallet" className="max-w-full" />
                {connectedWallet ? <BrutalButton tone="light" onClick={disconnectWalletAndSession} disabled={busy !== null}>Disconnect Wallet</BrutalButton> : null}
              </div>
              <div className="mt-3 text-sm">{connectedWallet ? `Wallet connected · ${short(connectedWallet)}` : 'Connect CATSHIT Wallet to continue.'}</div>
            </InfoBox>

            <InfoBox title="step 2 · link wallet" tone="light">
              <div className="flex flex-wrap items-center gap-3">
                <BrutalButton tone={backendSigned ? 'mint' : 'gold'} onClick={signIn} disabled={!connectedWallet || busy !== null || backendSigned}>
                  {backendSigned ? 'Wallet Linked' : busy === 'sign' ? 'Signing…' : 'Sign to Link Wallet'}
                </BrutalButton>
                {backendSigned ? <TagBadge tone="mint">Wallet Linked</TagBadge> : null}
              </div>
              <div className="mt-3 text-sm">{backendSigned ? 'This wallet is linked to this Claude session.' : 'This proves wallet ownership. It does not expose your private key.'}</div>
            </InfoBox>

            <InfoBox title="step 3 · delegation" tone="light">
              <div className="flex flex-wrap items-center gap-3">
                <TagBadge tone={delegationStatus === 'Active' ? 'mint' : delegationStatus === 'Not active' ? 'gold' : 'light'}>
                  {delegationStatus === 'Active' ? 'Delegation Active' : delegationStatus === 'Not active' ? 'Delegation Not Active' : 'Checking delegation…'}
                </TagBadge>
                <BrutalButton tone="mint" onClick={() => runDelegation('delegate')} disabled={!connectedWallet || busy !== null || backendDelegated || !appConfig.delegateAddress}>
                  {busy === 'delegate' ? 'Activating…' : 'Activate Delegation'}
                </BrutalButton>
                <BrutalButton tone="dark" onClick={() => runDelegation('revoke')} disabled={!connectedWallet || busy !== null || !backendDelegated}>
                  {busy === 'revoke' ? 'Revoking…' : 'Revoke Delegation'}
                </BrutalButton>
                <BrutalButton tone="light" onClick={() => loadSession().catch((err) => setError(err?.message || 'Could not verify delegation right now.'))} disabled={busy !== null}>
                  Check Again
                </BrutalButton>
              </div>
              <div className="mt-3 text-sm">Claude can read wallet status without delegation, but minting requires delegation.</div>
            </InfoBox>

            <InfoBox title="step 4 · approve claude" tone="light">
              <div className="flex flex-wrap items-center gap-3">
                <BrutalButton tone="dark" onClick={approveClaude} disabled={!canApprove || busy !== null || approved}>
                  {approved ? 'Claude Access Approved' : busy === 'approve' ? 'Redirecting…' : 'Approve Claude Access'}
                </BrutalButton>
                <BrutalButton href={redirectUri || '/'} tone="light">{approved ? 'Return to Claude' : 'Cancel and Return'}</BrutalButton>
              </div>
              <div className="mt-3 text-sm">{approved ? 'Claude access approved.' : canApprove ? 'This completes authorization and returns to Claude.' : 'Sign with your wallet first.'}</div>
            </InfoBox>
          </div>

          {info ? <InfoBox title="status" tone="mint">{info}</InfoBox> : null}
          {error ? <InfoBox title="error" tone="gold">{error}</InfoBox> : null}
        </BrutalCard>

        <div className="space-y-4">
          <BrutalCard tone="light" className="space-y-4 text-ink">
            <div className="flex items-center justify-between gap-3">
              <SectionLabel tone="purple">Progress</SectionLabel>
              <TagBadge tone={backendSigned ? 'mint' : 'light'}>{backendSigned ? 'ready to approve' : 'needs action'}</TagBadge>
            </div>
            <div className="space-y-3 text-sm leading-7">
              {progressItems.map((item) => (
                <div key={item.label} className="rounded-2xl border-[3px] border-ink p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-black uppercase">{item.label}</div>
                    <TagBadge tone={item.tone}>{item.value}</TagBadge>
                  </div>
                </div>
              ))}
            </div>
          </BrutalCard>

          <BrutalCard tone="black" className="space-y-4">
            <SectionLabel tone="mint">Session</SectionLabel>
            <div className="text-sm leading-7">
              <div><strong>Network:</strong> {networkLabel(session?.chainId)}</div>
              <div><strong>Wallet:</strong> {short(session?.session?.wallet_address || connectedWallet)}</div>
              <div><strong>Expires:</strong> {formatExpiry(session?.session?.expires_at)}</div>
            </div>
            <button className="mono-ui text-xs underline" type="button" onClick={() => setShowAdvanced((value) => !value)}>
              {showAdvanced ? 'Hide advanced details' : 'Advanced details'}
            </button>
            {showAdvanced ? (
              <InfoBox title="advanced" tone="dark">
                <div>Session ID: {session?.session?.id || '—'}</div>
                <div>Grant ID: {grantId || '—'}</div>
                <div>Redirect URI: {redirectUri || '—'}</div>
                <div>Chain ID: {session?.chainId || '—'}</div>
                <div>Raw wallet: {session?.session?.wallet_address || connectedWallet || '—'}</div>
              </InfoBox>
            ) : null}
          </BrutalCard>
        </div>
      </div>
    </main>
  );
}
