import { useEffect, useMemo, useState } from 'react';
import { english, generateMnemonic } from 'viem/accounts';
import { Home } from './pages/Home';
import { Send } from './pages/Send';
import { Receive } from './pages/Receive';
import { Settings } from './pages/Settings';
import { Networks } from './pages/Networks';
import { ConnectedSites } from './pages/ConnectedSites';
import { AddToken } from './pages/AddToken';
import { Eip7702 } from './pages/Eip7702';
import { ConfirmTransaction } from './pages/ConfirmTransaction';
import { ConfirmSignature } from './pages/ConfirmSignature';
import { AddChain } from './pages/AddChain';
import { ManageAccounts } from './pages/ManageAccounts';
import { SecretAccess } from './pages/SecretAccess';
import { ResetWallet } from './pages/ResetWallet';
import type { PersistedState, VaultData } from '../shared/types';
import { Header } from '../components/Header';
import { copyText, shortAddress } from '../shared/utils';
import { validateRecoveryPhrase } from '../shared/mnemonic';
import { BrandLogo } from '../components/BrandLogo';

type View = 'home' | 'send' | 'receive' | 'settings' | 'networks' | 'sites' | 'token' | 'eip7702' | 'addChain' | 'manageAccounts' | 'showPhrase' | 'showPrivateKey' | 'resetWallet';
type Flow = 'welcome' | 'create-password' | 'create-phrase' | 'create-confirm' | 'create-ready' | 'import-choose' | 'import-phrase' | 'import-key' | 'import-ready' | 'unlock';

export function App() {
  const [state, setState] = useState<PersistedState | null>(null);
  const [vault, setVault] = useState<VaultData | null>(null);
  const [view, setView] = useState<View>('home');
  const [error, setError] = useState<string | null>(null);
  const [flow, setFlow] = useState<Flow>('welcome');
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showNetworkMenu, setShowNetworkMenu] = useState(false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedWarning, setAcceptedWarning] = useState(false);
  const [pendingMnemonic, setPendingMnemonic] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [confirmAnswers, setConfirmAnswers] = useState<Record<number, string>>({});
  const [confirmIndexes, setConfirmIndexes] = useState<number[]>([]);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [importMnemonic, setImportMnemonic] = useState('');
  const [importKey, setImportKey] = useState('');
  const [importAccepted, setImportAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function refresh() {
    try {
      const res = await chrome.runtime.sendMessage({ type: 'wallet:getState' });
      if (!res?.ok) throw new Error(res?.error || 'Failed to load wallet state');
      setState(res.state);
      setVault(res.vault || null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => { refresh(); }, []);
  useEffect(() => {
    if (!state || !import.meta.env.DEV) return;
    const chain = state.chains.find((item) => item.id === state.settings.activeChainId);
    console.info('[catshit-wallet][popup]', {
      vaultExists: Boolean(vault),
      unlocked: state.isUnlocked,
      activeAccount: vault?.accounts[state.activeAccountIndex]?.address || state.primaryAddress || null,
      activeChainId: state.settings.activeChainId,
      activeRpcUrl: chain?.rpcUrl || null,
      providerInjected: true,
      eip6963Announced: true,
    });
  }, [state, vault]);
  useEffect(() => { if (!state) return; if (!state.isSetup) setFlow('welcome'); else if (!state.isUnlocked) setFlow('unlock'); }, [state?.isSetup, state?.isUnlocked]);

  function formatRuntimeError(error: any) {
    if (!error) return 'request failed';
    if (typeof error === 'string') return error;
    if (typeof error?.message === 'string') return error.message;
    if (typeof error?.error?.message === 'string') return error.error.message;
    return 'request failed';
  }

  async function action(type: string, payload: any = {}) {
    const res = await chrome.runtime.sendMessage({ type, ...payload });
    if (!res?.ok) throw new Error(formatRuntimeError(res?.error));
    await refresh();
    return res;
  }

  const passwordStrength = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  }, [password]);
  const passwordStrengthLabel = ['Very weak', 'Weak', 'Medium', 'Strong', 'Very strong'][passwordStrength] || 'Very weak';
  const importPhraseCheck = validateRecoveryPhrase(importMnemonic || '');
  const cleanedImportMnemonic = importPhraseCheck.normalized;
  const importWordCount = importPhraseCheck.wordCount;
  const importMnemonicValid = importPhraseCheck.valid;
  const importPasswordValid = password.length >= 8 && password === confirmPassword;
  const words = pendingMnemonic ? pendingMnemonic.split(' ') : [];
  const pending = state?.pendingRequests || [];
  const pendingTx = pending.find((item) => item.type === 'sendTransaction');
  const pendingSig = pending.find((item) => item.type === 'signMessage' || item.type === 'signTypedData' || item.type === 'connect' || item.type === 'eip7702' || item.type === 'addChain');

  function resetCreateState() { setPassword(''); setConfirmPassword(''); setAcceptedWarning(false); setPendingMnemonic(''); setRevealed(false); setConfirmAnswers({}); setConfirmIndexes([]); }
  function resetImportState() { setImportMnemonic(''); setImportKey(''); setImportAccepted(false); setPassword(''); setConfirmPassword(''); }
  function makeConfirmIndexes(mnemonic: string) { const count = mnemonic.split(' ').length; const picks = new Set<number>(); while (picks.size < 3) picks.add(Math.floor(Math.random() * count)); return Array.from(picks).sort((a, b) => a - b); }

  async function handleCreatePasswordContinue() {
    if (password.length < 8) throw new Error('Password must be at least 8 characters.');
    if (password !== confirmPassword) throw new Error('Passwords do not match.');
    if (!acceptedWarning) throw new Error('Please confirm you understand recovery phrase responsibility.');
    const mnemonic = generateMnemonic(english);
    setPendingMnemonic(mnemonic);
    setConfirmIndexes(makeConfirmIndexes(mnemonic));
    setConfirmAnswers({});
    setRevealed(false);
    setFlow('create-phrase');
  }
  async function handleCreateConfirm() {
    const currentWords = pendingMnemonic.split(' ');
    for (const index of confirmIndexes) {
      if ((confirmAnswers[index] || '').trim().toLowerCase() !== currentWords[index].toLowerCase()) throw new Error(`Word #${index + 1} is incorrect. Please try again.`);
    }
    await action('wallet:create', { password, mnemonic: pendingMnemonic });
    setFlow('create-ready');
  }
  async function handleImportMnemonic() {
    if (!cleanedImportMnemonic) throw new Error('Enter your recovery phrase.');
    if (![12, 24].includes(importWordCount)) throw new Error('Recovery phrase must contain 12 or 24 words.');
    if (!importPasswordValid) throw new Error(password !== confirmPassword ? 'Passwords do not match.' : 'Password must be at least 8 characters.');
    if (!importAccepted) throw new Error('Please confirm local encryption on this device.');
    await action('wallet:importMnemonic', { password, mnemonic: cleanedImportMnemonic });
    setFlow('import-ready');
  }
  async function handleImportKey() {
    const normalized = importKey.trim().startsWith('0x') ? importKey.trim() : `0x${importKey.trim()}`;
    if (!/^0x[a-fA-F0-9]{64}$/.test(normalized)) throw new Error('Enter a valid EVM private key.');
    if (!importPasswordValid) throw new Error(password !== confirmPassword ? 'Passwords do not match.' : 'Password must be at least 8 characters.');
    await action('wallet:importPrivateKey', { password, privateKey: normalized });
    setFlow('import-ready');
  }
  async function withLoading(run: () => Promise<void>) { try { setLoading(true); setError(null); await run(); } catch (err) { setError(err instanceof Error ? err.message : String(err)); } finally { setLoading(false); } }

  if (!state) return <div className="app onboarding-shell"><div className="card hero-card centered-card">{error ? <><div className="title" style={{ fontSize: 24 }}>Wallet failed to load</div><div className="muted" style={{ marginTop: 8 }}>{error}</div><button className="btn primary clickable" style={{ marginTop: 12 }} onClick={() => refresh()}>Retry</button></> : 'Loading…'}</div></div>;
  if (pendingTx) return <ConfirmTransaction pending={pendingTx} state={state} onApprove={async () => action('wallet:approvePending', { id: pendingTx.id })} onReject={async () => action('wallet:rejectPending', { id: pendingTx.id })} />;
  if (pendingSig) return <ConfirmSignature pending={pendingSig} state={state} onApprove={async () => action('wallet:approvePending', { id: pendingSig.id })} onReject={async () => action('wallet:rejectPending', { id: pendingSig.id })} />;

  const props = { state, vault, refresh, action, setView };
  if ((!state.isSetup || !state.isUnlocked) && view === 'resetWallet') {
    return <div className="app onboarding-shell"><ResetWallet {...props} backView="home" /></div>;
  }
  if (!state.isSetup || !state.isUnlocked) return <div className="app onboarding-shell">{renderOnboarding()}</div>;

  const page = {
    home: <Home {...props} />,
    send: <Send {...props} />,
    receive: <Receive {...props} />,
    settings: <Settings {...props} />,
    networks: <Networks {...props} />,
    sites: <ConnectedSites {...props} />,
    token: <AddToken {...props} />,
    eip7702: <Eip7702 {...props} />,
    addChain: <AddChain {...props} />,
    manageAccounts: <ManageAccounts {...props} />,
    showPhrase: <SecretAccess {...props} mode="phrase" />,
    showPrivateKey: <SecretAccess {...props} mode="privateKey" />,
    resetWallet: <ResetWallet {...props} backView="settings" />,
  }[view];

  return <div className="app wallet-shell"><Header state={state} vault={vault} onOpenAccount={() => setShowAccountMenu(true)} onOpenNetwork={() => setShowNetworkMenu(true)} onOpenSettings={() => setView('settings')} onLock={async () => action('wallet:lock')} />{page}{copied ? <div className="toast-inline">Copied.</div> : null}{showAccountMenu ? <div className="sheet-backdrop" onClick={() => setShowAccountMenu(false)}><div className="sheet" onClick={(e) => e.stopPropagation()}><div className="sheet-title">Accounts</div>{(vault?.accounts || []).map((account, index) => <button key={account.address} className="sheet-item clickable" onClick={() => action('wallet:updateState', { patch: { activeAccountIndex: index, primaryAddress: account.address, primaryAccountName: account.name } }).then(() => setShowAccountMenu(false))}><div><strong>{account.name}</strong><div className="muted mono">{shortAddress(account.address)}</div></div><span>{state.activeAccountIndex === index ? '✓' : ''}</span></button>)}<button className="sheet-item clickable" onClick={async()=>{const addr=vault?.accounts[state.activeAccountIndex]?.address; if(addr){await copyText(addr); setCopied(true); setTimeout(()=>setCopied(false),1500); setShowAccountMenu(false);}}}><div><strong>Copy address</strong><div className="muted">Copy current wallet address</div></div><span>⧉</span></button><button className="sheet-item clickable" onClick={()=>{setShowAccountMenu(false); setView('manageAccounts');}}><div><strong>Manage accounts</strong><div className="muted">Create or import accounts</div></div><span>›</span></button></div></div> : null}{showNetworkMenu ? <div className="sheet-backdrop top-sheet-backdrop" onClick={() => setShowNetworkMenu(false)}><div className="sheet top-sheet" onClick={(e) => e.stopPropagation()}><div className="sheet-title">Networks</div>{state.chains.map((chain) => <button key={chain.id} className="sheet-item clickable" onClick={() => action('wallet:updateState', { patch: { settings: { activeChainId: chain.id } } }).then(() => setShowNetworkMenu(false))}><div><strong>{chain.name}</strong><div className="muted mono">{chain.symbol}</div></div><span>{state.settings.activeChainId === chain.id ? '✓' : ''}</span></button>)}<button className="sheet-item clickable" onClick={() => { setShowNetworkMenu(false); setView('addChain'); }}><div><strong>Add custom chain</strong><div className="muted">Manual chain setup</div></div><span>＋</span></button></div></div> : null}</div>;

  function renderOnboarding() {
    const previewAddress = vault?.accounts?.[0]?.address || state.primaryAddress;
    const top = <div className="brand-mark"><BrandLogo size={36} /><div><div className="eyebrow">CATSHIT wallet</div><div className="brand-sub">dark alley custody · mint ready</div></div></div>;
    if (flow === 'welcome') return <div className="card hero-card centered-card">{top}<div className="title">CATSHIT Wallet</div><p className="subtitle">Your wallet for CATSHIT, BSC, and AI-native minting.</p><div className="trust-copy">Keys stay on your device. Encrypted locally. Never shared with CATSHIT.</div><div className="cta-stack"><button className="btn primary big clickable" onClick={() => { resetCreateState(); setError(null); setFlow('create-password'); }}>Create New Wallet</button><button className="btn light big clickable" onClick={() => { resetImportState(); setError(null); setFlow('import-choose'); }}>Import Existing Wallet</button></div><div className="link-row"><button className="link-btn clickable" onClick={() => setError('A wallet stores your keys, lets you sign transactions, and proves account ownership onchain.')}>What is a wallet?</button><button className="link-btn clickable" onClick={() => setError('Write down your recovery phrase offline, never share it, and only install trusted wallet builds.')}>Security tips</button></div>{error ? <div className="inline-note danger-box">{error}</div> : null}</div>;
    if (flow === 'create-password') return <div className="card onboarding-card centered-card">{top}<StepRail steps={['Password', 'Recovery Phrase', 'Confirm Phrase', 'Wallet Ready']} current={1} /><div className="title medium">Create Password</div><Field label="Password"><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter a strong password" /></Field><Field label="Confirm Password"><input className="input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm password" /></Field><div className="strength-row"><span>Password strength</span><strong>{passwordStrengthLabel}</strong></div><ul className="check-list"><li className={password.length >= 8 ? 'ok' : ''}>Minimum 8 characters</li><li className={password === confirmPassword && password.length > 0 ? 'ok' : ''}>Passwords must match</li></ul><label className="checkbox"><input type="checkbox" checked={acceptedWarning} onChange={(e) => setAcceptedWarning(e.target.checked)} /> <span>I understand CATSHIT cannot recover my wallet if I lose my recovery phrase.</span></label>{error ? <div className="inline-note danger-box">{error}</div> : null}<div className="footer-actions"><button className="btn light clickable" onClick={() => setFlow('welcome')}>Back</button><button className="btn primary clickable" disabled={loading} onClick={() => withLoading(handleCreatePasswordContinue)}>Continue</button></div></div>;
    if (flow === 'create-phrase') return <div className="card onboarding-card">{top}<StepRail steps={['Password', 'Recovery Phrase', 'Confirm Phrase', 'Wallet Ready']} current={2} /><div className="title medium">Save Your Recovery Phrase</div><div className="warning-card">This phrase is the only way to recover your wallet. Never share it. CATSHIT will never ask for it.</div><div className="warning-inline">Make sure no one is looking at your screen.</div><div className={`phrase-wrap ${revealed ? 'revealed' : 'hidden'}`}>{words.map((word, index) => <div key={`${word}-${index}`} className="phrase-word"><span>{index + 1}</span><strong>{revealed ? word : '••••••'}</strong></div>)}</div><div className="footer-actions"><button className="btn light clickable" onClick={() => setRevealed((v) => !v)}>{revealed ? 'Hide' : 'Reveal'}</button><button className="btn secondary clickable" onClick={async () => { await copyText(pendingMnemonic); setCopied(true); setTimeout(()=>setCopied(false),1500); }}>Copy phrase</button><button className="btn primary clickable" onClick={() => setFlow('create-confirm')}>I saved it, continue</button></div></div>;
    if (flow === 'create-confirm') return <div className="card onboarding-card">{top}<StepRail steps={['Password', 'Recovery Phrase', 'Confirm Phrase', 'Wallet Ready']} current={3} /><div className="title medium">Confirm Recovery Phrase</div><p className="subtitle small">Enter the requested words to confirm you saved your phrase.</p><div className="col">{confirmIndexes.map((index) => <Field key={index} label={`Word #${index + 1}`}><input className="input" value={confirmAnswers[index] || ''} onChange={(e) => setConfirmAnswers((prev) => ({ ...prev, [index]: e.target.value }))} placeholder={`Enter word #${index + 1}`} /></Field>)}</div>{error ? <div className="inline-note danger-box">{error}</div> : null}<div className="footer-actions"><button className="btn light clickable" onClick={() => setFlow('create-phrase')}>Back</button><button className="btn primary clickable" disabled={loading} onClick={() => withLoading(handleCreateConfirm)}>Confirm & Create Wallet</button></div></div>;
    if (flow === 'create-ready') return <div className="card onboarding-card centered-card">{top}<StepRail steps={['Password', 'Recovery Phrase', 'Confirm Phrase', 'Wallet Ready']} current={4} /><div className="title medium">Wallet Ready</div><p className="subtitle">Your CATSHIT Wallet is ready. You can now connect to the CATSHIT website, sign delegation, and mint through ChatGPT.</p><div className="ready-pod"><span className="pill mono">{shortAddress(state.primaryAddress)}</span></div><button className="btn primary big clickable" onClick={() => setView('home')}>Open Wallet</button></div>;
    if (flow === 'import-choose') return <div className="card onboarding-card centered-card">{top}<StepRail steps={['Choose Import Method', 'Enter Secret', 'Set Password', 'Wallet Ready']} current={1} /><div className="title medium">Import Existing Wallet</div><div className="import-grid"><button className="import-card clickable" onClick={() => setFlow('import-phrase')}><strong>Import with Recovery Phrase</strong><span>Best for full wallet recovery and future account restore.</span></button><button className="import-card clickable" onClick={() => setFlow('import-key')}><strong>Import with Private Key</strong><span>Imports one account only. Use phrase import for full wallet recovery.</span></button></div><div className="footer-actions"><button className="btn light clickable" onClick={() => setFlow('welcome')}>Back</button></div></div>;
    if (flow === 'import-phrase') return <div className="card onboarding-card centered-card">{top}<StepRail steps={['Choose Import Method', 'Enter Secret', 'Set Password', 'Wallet Ready']} current={2} /><div className="title medium">Import Recovery Phrase</div><Field label="Recovery phrase"><textarea className="textarea large" value={importMnemonic} onChange={(e) => setImportMnemonic(e.target.value)} placeholder="Enter your 12 or 24 word recovery phrase" /></Field><Field label="Password"><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password for this device" /></Field><Field label="Confirm Password"><input className="input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm password" /></Field><div className="strength-row"><span>Password strength</span><strong>{passwordStrengthLabel}</strong></div><ul className="check-list"><li className={importWordCount===12 || importWordCount===24 ? 'ok' : ''}>Word count: {importWordCount || 0}</li><li className={importMnemonicValid ? 'ok' : ''}>BIP39 check: {importMnemonicValid ? 'valid' : 'needs review'}</li><li className={password.length >= 8 ? 'ok' : ''}>Minimum 8 characters</li><li className={password === confirmPassword && password.length > 0 ? 'ok' : ''}>Passwords match</li></ul><label className="checkbox"><input type="checkbox" checked={importAccepted} onChange={(e) => setImportAccepted(e.target.checked)} /> <span>I understand this wallet will be encrypted locally on this device.</span></label>{error ? <div className="inline-note danger-box">{error}</div> : null}<div className="footer-actions"><button className="btn light clickable" onClick={() => setFlow('import-choose')}>Back</button><button className="btn primary clickable" disabled={importWordCount < 12 || !importPasswordValid || !importAccepted || loading} onClick={() => withLoading(handleImportMnemonic)}>Import Wallet</button></div></div>;
    if (flow === 'import-key') return <div className="card onboarding-card centered-card">{top}<StepRail steps={['Choose Import Method', 'Enter Secret', 'Set Password', 'Wallet Ready']} current={2} /><div className="title medium">Import Private Key</div><div className="warning-card compact">Private key import only imports one account. For full wallet recovery, use recovery phrase.</div><Field label="Private key"><input className="input mono" value={importKey} onChange={(e) => setImportKey(e.target.value)} placeholder="0x… or raw 64 hex chars" /></Field><Field label="Password"><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password for this device" /></Field><Field label="Confirm Password"><input className="input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm password" /></Field><div className="strength-row"><span>Password strength</span><strong>{passwordStrengthLabel}</strong></div><ul className="check-list"><li className={/^0x[a-fA-F0-9]{64}$/.test(importKey.trim().startsWith('0x') ? importKey.trim() : `0x${importKey.trim()}`) ? 'ok' : ''}>Valid EVM private key</li><li className={password.length >= 8 ? 'ok' : ''}>Minimum 8 characters</li><li className={password === confirmPassword && password.length > 0 ? 'ok' : ''}>Passwords match</li></ul>{error ? <div className="inline-note danger-box">{error}</div> : null}<div className="footer-actions"><button className="btn light clickable" onClick={() => setFlow('import-choose')}>Back</button><button className="btn primary clickable" disabled={!importPasswordValid || !/^0x[a-fA-F0-9]{64}$/.test(importKey.trim().startsWith('0x') ? importKey.trim() : `0x${importKey.trim()}`) || loading} onClick={() => withLoading(handleImportKey)}>Import Wallet</button></div></div>;
    if (flow === 'import-ready') return <div className="card onboarding-card centered-card">{top}<StepRail steps={['Choose Import Method', 'Enter Secret', 'Set Password', 'Wallet Ready']} current={4} /><div className="title medium">Wallet Ready</div><p className="subtitle">Your CATSHIT Wallet is ready. You can now connect to the CATSHIT website, sign delegation, and mint through ChatGPT.</p><div className="ready-pod"><span className="pill mono">{shortAddress(state.primaryAddress)}</span></div><button className="btn primary big clickable" onClick={() => setView('home')}>Open Wallet</button></div>;
    return <div className="card onboarding-card centered-card">{top}<div className="title medium">Welcome Back</div><p className="subtitle">Unlock your CATSHIT Wallet to continue.</p>{previewAddress ? <div className="unlock-preview"><span className="avatar-dot" /> <span className="pill mono">{shortAddress(previewAddress)}</span></div> : null}<Field label="Password"><input className="input" type="password" value={unlockPassword} onChange={(e) => setUnlockPassword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void withLoading(async () => { await action('wallet:unlock', { password: unlockPassword }); setUnlockPassword(''); }); } }} placeholder="Enter your password" /></Field>{error ? <div className="inline-note danger-box">{error}</div> : null}<div className="footer-actions"><button className="btn primary clickable" disabled={loading} onClick={() => withLoading(async () => { await action('wallet:unlock', { password: unlockPassword }); setUnlockPassword(''); })}>Unlock</button></div><div className="link-row spaced"><button className="link-btn clickable" onClick={() => setError('CATSHIT cannot recover your password. Reset the wallet and re-import using your recovery phrase.')}>Forgot password?</button><button className="link-btn danger-link clickable" onClick={() => setView('resetWallet')}>Reset wallet</button></div></div>;
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="field"><span>{label}</span>{children}</label>; }
function StepRail({ steps, current }: { steps: string[]; current: number }) { return <div className="steps">{steps.map((step, index) => <div key={step} className={`step ${index + 1 <= current ? 'active' : ''}`}><span>{index + 1}</span><small>{step}</small></div>)}</div>; }
