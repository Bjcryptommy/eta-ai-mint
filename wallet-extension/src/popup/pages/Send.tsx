import { useEffect, useMemo, useState } from 'react';
import { isAddress } from 'viem';
import { getChainById } from '../../shared/chains';
import type { PersistedState, VaultData } from '../../shared/types';

export function Send({ state, vault, action, setView }: { state: PersistedState; vault: VaultData | null; action: any; setView: any }) {
  const [asset] = useState('native');
  const [amount, setAmount] = useState('');
  const [to, setTo] = useState('');
  const [available, setAvailable] = useState('0');
  const [step, setStep] = useState<'form' | 'confirm' | 'done'>('form');
  const [estimate, setEstimate] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const chain = getChainById(state.settings.activeChainId, state.chains);
  const account = vault?.accounts[state.activeAccountIndex];

  useEffect(() => { action('wallet:getBalance').then((res:any)=>setAvailable(res.balance.formatted)).catch(()=>null); }, [state.settings.activeChainId]);

  const maxAmount = useMemo(() => Number(available || 0), [available]);

  async function continueSend() {
    setError(null);
    if (!isAddress(to)) throw new Error('Enter a valid recipient address.');
    if (!amount || Number(amount) <= 0) throw new Error('Enter an amount greater than zero.');
    if (Number(amount) > maxAmount) throw new Error('Insufficient balance.');
    const res = await action('wallet:estimateSend', { to, amount });
    const fee = Number(res?.estimate?.feeFormatted || 0);
    if (Number(amount) + fee > maxAmount) throw new Error(`Insufficient ${chain.symbol} for amount plus gas.`);
    setEstimate(res.estimate);
    setStep('confirm');
  }

  async function confirmSend() {
    setError(null);
    const res = await action('wallet:sendNative', { to, amount });
    setResult(res);
    setStep('done');
  }

  if (step === 'confirm') return <div className="card"><div className="page-top"><button className="back-link" onClick={()=>setStep('form')}>← Back</button><div className="title medium">Confirm Send</div></div><div className="review-list"><ReviewRow label="From" value={account?.address || ''} /><ReviewRow label="To" value={to} /><ReviewRow label="Asset" value={chain.symbol} /><ReviewRow label="Amount" value={`${amount} ${chain.symbol}`} /><ReviewRow label="Network" value={chain.name} /><ReviewRow label="Estimated gas" value={`${estimate?.feeFormatted || '0'} ${chain.symbol}`} /><ReviewRow label="Total" value={`${(Number(amount) + Number(estimate?.feeFormatted || 0)).toFixed(6)} ${chain.symbol}`} /></div>{error ? <div className="inline-note danger-box">{error}</div> : null}<div className="footer-actions"><button className="btn light" onClick={()=>setStep('form')}>Edit</button><button className="btn primary" onClick={()=>confirmSend().catch((e)=>setError(e.message))}>Confirm Send</button></div></div>;
  if (step === 'done') return <div className="card"><div className="title medium">Transfer sent</div><div className="notice-card">Transaction submitted successfully.</div><div className="mono break-all">{result?.hash}</div><div className="footer-actions">{result?.explorer ? <button className="btn light" onClick={()=>window.open(result.explorer,'_blank','noopener,noreferrer')}>View on explorer</button> : <button className="btn light" disabled>No explorer</button>}<button className="btn primary" onClick={()=>setView('home')}>Done</button></div></div>;

  return <div className="card"><div className="page-top"><button className="back-link" onClick={()=>setView('home')}>← Back</button><div className="title medium">Send</div></div><label className="field"><span>Asset</span><div className="input static-input">{chain.symbol}</div></label><label className="field"><span>Available balance</span><div className="input static-input">{Number(available || 0).toFixed(6)} {chain.symbol}</div></label><label className="field"><span>Amount</span><div className="input-group"><input className="input" value={amount} onChange={(e)=>setAmount(e.target.value)} placeholder="0.0" /><button className="inline-btn" onClick={()=>setAmount(String(maxAmount))}>Max</button></div></label><label className="field"><span>Recipient address</span><input className="input mono" value={to} onChange={(e)=>setTo(e.target.value)} placeholder="0x..." /></label><div className="review-list slim"><ReviewRow label="Network fee" value={estimate?.feeFormatted ? `${estimate.feeFormatted} ${chain.symbol}` : 'Estimate on continue'} /><ReviewRow label="Network" value={chain.name} /></div>{error ? <div className="inline-note danger-box">{error}</div> : null}<button className="btn primary big" onClick={()=>continueSend().catch((e)=>setError(e.message))}>Continue</button></div>;
}

function ReviewRow({ label, value }: { label: string; value: string }) { return <div className="review-row"><span>{label}</span><strong className="mono">{value}</strong></div>; }
