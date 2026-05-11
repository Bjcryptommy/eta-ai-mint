import { useState } from 'react';
import type { PersistedState, VaultData } from '../../shared/types';
import { shortAddress, copyText } from '../../shared/utils';

export function ManageAccounts({ state, vault, action, setView }: { state: PersistedState; vault: VaultData | null; action: any; setView: any }) {
  const [password, setPassword] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(value: string, key: string) {
    await copyText(value); setCopied(key); setTimeout(()=>setCopied(null),1500);
  }

  return <div className="card light"><div className="page-top"><button className="back-link" onClick={()=>setView('settings')}>← Back</button><div className="title medium">Manage Accounts</div></div><div className="list">{(vault?.accounts || []).map((account, index)=><button key={account.address} className="settings-item" onClick={()=>action('wallet:updateState',{patch:{activeAccountIndex:index,primaryAddress:account.address,primaryAccountName:account.name}}).then(()=>setView('home'))}><div><strong>{account.name}</strong><div className="muted mono">{shortAddress(account.address)}</div></div><span>{state.activeAccountIndex===index?'✓':'›'}</span></button>)}</div><div className="field"><span>Password</span><input className="input" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Password for account actions" /></div><div className="footer-actions"><button className="btn light" onClick={()=>action('wallet:addDerivedAccount',{password}).then(()=>setView('home')).catch((e:any)=>setError(e.message))}>Create account</button><button className="btn light" onClick={()=>copy(vault?.accounts[state.activeAccountIndex]?.address || '', 'address')}>Copy address</button></div><label className="field"><span>Import private key account</span><input className="input mono" value={privateKey} onChange={(e)=>setPrivateKey(e.target.value)} placeholder="0x... or raw private key" /></label><button className="btn primary big" onClick={()=>action('wallet:importPrivateKeyAccount',{password,privateKey:privateKey.trim().startsWith('0x')?privateKey.trim():`0x${privateKey.trim()}`}).then(()=>setView('home')).catch((e:any)=>setError(e.message))}>Import account</button>{copied ? <div className="toast-inline">Copied.</div> : null}{error ? <div className="inline-note danger-box">{error}</div> : null}</div>;
}
