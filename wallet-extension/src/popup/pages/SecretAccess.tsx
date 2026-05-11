import { useState } from 'react';
import type { PersistedState, VaultData } from '../../shared/types';
import { copyText } from '../../shared/utils';

export function SecretAccess({ mode, state, vault, action, setView }: { mode: 'phrase' | 'privateKey'; state: PersistedState; vault: VaultData | null; action: any; setView: any }) {
  const [password, setPassword] = useState('');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const title = mode === 'phrase' ? 'Show Recovery Phrase' : 'Export Private Key';

  async function reveal() {
    if (mode === 'phrase') {
      const res = await action('wallet:revealRecoveryPhrase', { password });
      setSecret(res.mnemonic);
    } else {
      const res = await action('wallet:exportPrivateKey', { password, address: vault?.accounts[state.activeAccountIndex]?.address });
      setSecret(res.privateKey);
    }
  }

  return <div className="card light"><div className="page-top"><button className="back-link" onClick={()=>setView('settings')}>← Back</button><div className="title medium">{title}</div></div><div className="warning-card compact">This is sensitive information. Make sure no one is looking at your screen. CATSHIT will never ask for it.</div><label className="field"><span>Password confirmation</span><input className="input" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Enter wallet password" /></label><button className="btn primary big" onClick={()=>reveal().catch((e)=>setError(e.message))}>Reveal</button>{secret ? <div className="secret-box mono">{secret}</div> : null}{secret ? <button className="btn light big" onClick={async()=>{await copyText(secret); setCopied(true); setTimeout(()=>setCopied(false),1500);}}>Copy</button> : null}{copied ? <div className="toast-inline">Copied.</div> : null}{error ? <div className="inline-note danger-box">{error}</div> : null}</div>;
}
