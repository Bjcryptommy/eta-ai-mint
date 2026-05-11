import { appConfig } from '@/lib/config';

export function LiveRibbon() {
  return (
    <div className="live-ribbon">
      <div className="live-ribbon-track">
        <span>CATSHIT • delegated AI mint • {appConfig.networkName}</span>
        <span>live relayer path tested</span>
        <span>mcp path tested</span>
        <span>sepolia now • mainnet-ready structure later</span>
        <span>revoke included from day one</span>
      </div>
    </div>
  );
}
