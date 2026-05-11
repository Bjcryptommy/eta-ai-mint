import { ButtonHTMLAttributes, ReactNode } from 'react';
export function ActionButton({ children, tone='primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; tone?: 'primary'|'secondary'|'light' }) { return <button className={`btn ${tone}`} {...props}>{children}</button>; }
