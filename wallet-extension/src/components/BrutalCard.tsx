import { ReactNode } from 'react';
export function BrutalCard({ children, light = false }: { children: ReactNode; light?: boolean }) { return <div className={`card ${light ? 'light' : ''}`}>{children}</div>; }
