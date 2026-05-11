export function BrandLogo({ size = 34 }: { size?: number }) {
  return <div className="brand-logo-box" style={{ width: size, height: size }}><img src="/icons/icon128.png" alt="CATSHIT Wallet logo" className="brand-logo-img" /></div>;
}
