export function TokenRow({ name, symbol, balance, subtitle = '', value = '$0.00' }: { name: string; symbol: string; balance: string; subtitle?: string; value?: string }) {
  return (
    <div className="token-row token-card">
      <div className="token-icon">{symbol.slice(0, 1)}</div>
      <div className="token-info">
        <div className="token-symbol">{symbol}</div>
        <div className="muted">{name || subtitle}</div>
      </div>
      <div className="token-balance">
        <div>{balance}</div>
        <div className="muted">{value}</div>
      </div>
    </div>
  );
}
