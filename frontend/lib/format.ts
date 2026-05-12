import { formatUnits } from 'viem';

function isLikelyBaseUnits(value?: string | number | null) {
  if (value === null || value === undefined) return false;
  const str = String(value).trim();
  return /^\d{16,}$/.test(str);
}

function withCommas(value: string, maxFractionDigits = 4) {
  const [whole, fraction = ''] = value.split('.');
  const trimmedFraction = fraction.replace(/0+$/, '').slice(0, maxFractionDigits);
  const formattedWhole = Number(whole || '0').toLocaleString();
  return trimmedFraction ? `${formattedWhole}.${trimmedFraction}` : formattedWhole;
}

export function formatTokenAmount(value?: string | number | null, symbol?: string, decimals = 18) {
  if (value === null || value === undefined || value === '') return '—';
  const str = String(value).trim();
  const human = isLikelyBaseUnits(str) ? formatUnits(BigInt(str), decimals) : str;
  const formatted = /^\d+(\.\d+)?$/.test(human) ? withCommas(human) : human;
  return symbol ? `${formatted} ${symbol}` : formatted;
}

export function formatCount(value?: string | number | null, suffix?: string) {
  if (value === null || value === undefined || value === '') return '—';
  const num = typeof value === 'number' ? value : Number(value);
  const formatted = Number.isFinite(num) ? num.toLocaleString() : String(value);
  return suffix ? `${formatted} ${suffix}` : formatted;
}
