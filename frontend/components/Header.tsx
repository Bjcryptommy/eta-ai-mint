import Link from 'next/link';
import { appConfig } from '@/lib/config';

export function Header() {
  return (
    <div className="nav">
      <div className="brand">
        <div className="brand-mark">CS</div>
        <div>
          <div style={{ fontSize: 20 }}>catshit</div>
          <div className="brand-sub">AI mint • {appConfig.networkName}</div>
        </div>
      </div>
      <div className="nav-links">
        <Link href="#overview">overview</Link>
        <Link href="#mint">mint</Link>
        <Link href="#proof">proof</Link>
        <Link href="#revoke">revoke</Link>
      </div>
    </div>
  );
}
