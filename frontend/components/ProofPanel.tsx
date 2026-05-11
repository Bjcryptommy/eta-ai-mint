import { TokenInfo } from '@/lib/types';
import { appConfig, shortAddr } from '@/lib/config';

export function ProofPanel({ tokenInfo }: { tokenInfo: TokenInfo | null }) {
  return (
    <div className="card" id="proof">
      <div className="card-head">
        <div>
          <div className="eyebrow">Proof</div>
          <div className="section-title">Onchain facts</div>
        </div>
        <span className="state-pill">{appConfig.networkName}</span>
      </div>
      <dl className="kv">
        <dt>Token</dt><dd><a href={`${appConfig.explorerBase}/address/${tokenInfo?.tokenAddress}`} target="_blank">{shortAddr(tokenInfo?.tokenAddress, 6)}</a></dd>
        <dt>Delegate</dt><dd><a href={`${appConfig.explorerBase}/address/${tokenInfo?.delegateAddress}`} target="_blank">{shortAddr(tokenInfo?.delegateAddress, 6)}</a></dd>
        <dt>Relayer</dt><dd>{shortAddr(tokenInfo?.relayerAddress, 6)}</dd>
        <dt>Fee receiver</dt><dd>{shortAddr(tokenInfo?.feeReceiver, 6)}</dd>
        <dt>Mint amount</dt><dd>{tokenInfo?.mintAmount ?? '—'}</dd>
        <dt>Mint price</dt><dd>{tokenInfo?.mintPriceEth ?? '—'} ETH</dd>
        <dt>Max per wallet</dt><dd>{tokenInfo?.maxPerWallet ?? '—'}</dd>
        <dt>Remaining</dt><dd>{tokenInfo?.remaining ?? '—'}</dd>
        <dt>Total mints</dt><dd>{tokenInfo?.totalMints ?? '—'}</dd>
      </dl>
      <div className="notice" style={{ marginTop: 16 }}>Switching to mainnet later should mainly be an env + address swap, not a frontend rewrite.</div>
    </div>
  );
}
