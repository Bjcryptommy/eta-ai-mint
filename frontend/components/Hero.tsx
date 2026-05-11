import { TokenInfo } from '@/lib/types';
import { appConfig, shortAddr } from '@/lib/config';
import { CatMascot } from './CatMascot';

export function Hero({ tokenInfo }: { tokenInfo: TokenInfo | null }) {
  return (
    <section className="hero" id="overview">
      <div className="hero-panel hero-main">
        <div className="orb orb-a" />
        <div className="orb orb-b" />
        <span className="kicker">cat native • delegated mint • {appConfig.networkName}</span>
        <h1>catshit feels fun, but the mint path is built like a real product.</h1>
        <p>
          One delegation flow. One protected relayer. One MCP path for ChatGPT later. A frontend that already works on testnet now and stays easy to switch to mainnet when you are ready.
        </p>
        <div className="cta-row">
          <a className="btn btn-primary" href="#mint">Try the mint flow</a>
          <a className="btn btn-secondary" href="#proof">Open proof</a>
        </div>
        <div className="hero-grid">
          <div className="stat"><div className="label">Mint price</div><div className="value">{tokenInfo?.mintPriceEth ?? '—'} ETH</div></div>
          <div className="stat"><div className="label">Remaining</div><div className="value">{tokenInfo?.remaining ?? '—'}</div></div>
          <div className="stat"><div className="label">Delegate</div><div className="value value-small">{shortAddr(tokenInfo?.delegateAddress, 6)}</div></div>
        </div>
      </div>
      <div className="hero-panel hero-art">
        <div className="art-wrap floaty"><CatMascot /></div>
        <div className="hero-note">
          <div className="eyebrow">Live design note</div>
          <div className="hero-note-title">Frontend first, AI next.</div>
          <p>This page already talks to the same protected backend and contract stack that ChatGPT will use. No throwaway demo layer.</p>
        </div>
      </div>
    </section>
  );
}
