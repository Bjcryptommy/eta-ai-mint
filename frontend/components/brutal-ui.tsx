import Link from 'next/link';
import { clsx } from 'clsx';
import { ButtonHTMLAttributes, ReactNode } from 'react';

export function BrutalCard({ children, className, tone = 'dark' }: { children: ReactNode; className?: string; tone?: 'dark' | 'mint' | 'gold' | 'black' | 'proof' | 'danger' | 'light'; }) {
  const toneClasses = {
    dark: 'bg-panel text-fog border-mint',
    mint: 'bg-mint text-ink border-ink',
    gold: 'bg-gold text-ink border-ink',
    black: 'bg-ink-2 text-fog border-mint',
    proof: 'bg-proof text-ink border-ink',
    danger: 'bg-danger text-ink border-ink',
    light: 'bg-light-card text-ink border-ink',
  };
  return <div className={clsx('rounded-[20px] border-[3px] brutal-shadow p-5 md:p-6', toneClasses[tone], className)}>{children}</div>;
}

type BrutalButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  href?: string;
  className?: string;
  tone?: 'light' | 'mint' | 'gold' | 'dark' | 'danger';
};

export function BrutalButton({ children, href, className, tone = 'light', type = 'button', ...props }: BrutalButtonProps) {
  const toneClasses: Record<NonNullable<BrutalButtonProps['tone']>, string> = {
    light: 'bg-light-card text-ink border-ink shadow-[4px_4px_0_#0c1222]',
    mint: 'bg-mint text-ink border-ink shadow-[4px_4px_0_#0c1222]',
    gold: 'bg-gold text-ink border-ink shadow-[4px_4px_0_#0c1222]',
    dark: 'bg-ink-2 text-fog border-mint shadow-[4px_4px_0_#29e7ff]',
    danger: 'bg-danger text-ink border-ink shadow-[4px_4px_0_#0c1222]',
  };
  const classes = clsx('brutal-hover inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-[3px] px-4 py-3 text-sm font-black uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-60', toneClasses[tone], className);
  if (href) return <Link href={href} className={classes}>{children}</Link>;
  return <button type={type} className={classes} {...props}>{children}</button>;
}

export function SectionLabel({ children, tone = 'mint', className }: { children: ReactNode; tone?: 'gold' | 'mint' | 'danger' | 'black' | 'light' | 'purple'; className?: string }) {
  const tones = {
    gold: 'bg-gold text-ink border-ink',
    mint: 'bg-mint text-ink border-ink',
    danger: 'bg-danger text-ink border-ink',
    black: 'bg-ink-2 text-fog border-mint',
    light: 'bg-light-card text-ink border-ink',
    purple: 'bg-purple text-fog border-ink',
  };
  return <div className={clsx('label-tilt mono-ui inline-flex rounded-xl border-[3px] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.25em]', tones[tone], className)}>{children}</div>;
}

export function HighlightText({ children, tone = 'mint' }: { children: ReactNode; tone?: 'mint' | 'gold' | 'danger' | 'proof' | 'green'; }) {
  const tones = {
    mint: 'bg-mint text-ink border-ink shadow-[3px_3px_0_#8b5cf6]',
    gold: 'bg-gold text-ink border-ink shadow-[3px_3px_0_#0c1222]',
    danger: 'bg-danger text-ink border-ink shadow-[3px_3px_0_#0c1222]',
    proof: 'bg-proof text-ink border-ink shadow-[3px_3px_0_#0c1222]',
    green: 'bg-green text-ink border-ink shadow-[3px_3px_0_#0c1222]',
  };
  return <span className={clsx('inline-block rounded-md border-[3px] px-2 py-0.5 leading-none', tones[tone])}>{children}</span>;
}

export function TagBadge({ children, tone = 'light' }: { children: ReactNode; tone?: 'light' | 'mint' | 'gold' | 'black' | 'danger' | 'purple' | 'green' }) {
  const tones = {
    light: 'bg-light-card text-ink border-ink',
    mint: 'bg-mint text-ink border-ink',
    gold: 'bg-gold text-ink border-ink',
    black: 'bg-ink-2 text-fog border-mint',
    danger: 'bg-danger text-ink border-ink',
    purple: 'bg-purple text-fog border-ink',
    green: 'bg-green text-ink border-ink',
  };
  return <span className={clsx('mono-ui inline-flex items-center rounded-xl border-[3px] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em]', tones[tone])}>{children}</span>;
}

export function AddressPill({ value }: { value?: string | null }) {
  return <span className="mono-ui inline-flex max-w-full items-center rounded-full border-[3px] border-mint bg-ink-2 px-3 py-1 text-xs font-bold break-all text-fog">{value || '—'}</span>;
}

export function InfoBox({ title, children, tone = 'dark' }: { title?: ReactNode; children: ReactNode; tone?: 'light' | 'mint' | 'gold' | 'black' | 'dark' }) {
  return (
    <div className={clsx('rounded-[18px] border-[3px] p-4', tone === 'black' ? 'border-mint bg-ink-2 text-fog' : tone === 'mint' ? 'border-mint bg-mint/16 text-ink' : tone === 'gold' ? 'border-gold bg-gold/12 text-ink' : tone === 'light' ? 'border-ink bg-light-card-2 text-ink' : 'border-mint bg-panel-2 text-fog')}>
      {title ? <div className="mono-ui mb-2 text-xs font-bold uppercase tracking-[0.2em] opacity-80">{title}</div> : null}
      <div className="text-sm leading-6">{children}</div>
    </div>
  );
}

export function ContractRow({ label, value, href }: { label: string; value?: string | null; href?: string }) {
  return (
    <div className="grid gap-2 border-t-2 border-dashed border-fog/18 py-3 first:border-t-0 first:pt-0 md:grid-cols-[120px,1fr]">
      <div className="mono-ui text-xs font-bold uppercase tracking-[0.2em] text-fog/70">{label}</div>
      <div>{href && value ? <a className="break-all underline decoration-2 underline-offset-4" href={href} target="_blank">{value}</a> : <AddressPill value={value} />}</div>
    </div>
  );
}

export function StepCard({ number, title, children, tone = 'dark' }: { number: string; title: string; children: ReactNode; tone?: 'dark' | 'mint' | 'gold' | 'light'; }) {
  return (
    <BrutalCard tone={tone} className="relative h-full">
      <div className="absolute right-4 top-4 rounded-xl border-[3px] border-mint bg-ink-2 px-3 py-1 text-xs font-black text-fog">{number}</div>
      <div className="display-text mt-8 text-3xl leading-none">{title}</div>
      <div className="mt-4 text-sm leading-6">{children}</div>
    </BrutalCard>
  );
}

export function ProofCard({ title, badge, children }: { title: string; badge: string; children: ReactNode }) {
  return (
    <BrutalCard tone="light" className="text-ink">
      <div className="flex items-start justify-between gap-3">
        <div className="display-text text-3xl leading-none">{title}</div>
        <TagBadge tone="mint">{badge}</TagBadge>
      </div>
      <div className="mt-4 text-sm leading-6 text-ink/85">{children}</div>
    </BrutalCard>
  );
}

export function StatusRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid gap-2 border-t-2 border-dashed border-fog/14 py-3 first:border-t-0 first:pt-0 md:grid-cols-[160px,1fr]">
      <div className="mono-ui text-[11px] font-bold uppercase tracking-[0.24em] text-current/70">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}

export function StickerGrid({ items }: { items: { emoji: string; label: string }[] }) {
  const tones = ['light', 'mint', 'light', 'light'] as const;
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item, index) => (
        <BrutalCard key={item.label} tone={tones[index % tones.length]} className={clsx('flex aspect-square flex-col items-center justify-center gap-4 text-center relative overflow-hidden', index % 4 === 1 && 'bg-mint/25 text-ink', index % 4 === 3 && 'bg-light-card-2 text-ink shadow-[6px_6px_0_#8b5cf6]')}>
          <div className="absolute right-3 top-3 text-base opacity-50">🐾</div>
          <div className="text-5xl">{item.emoji}</div>
          <div className="mono-ui text-xs font-bold uppercase tracking-[0.18em]">{item.label}</div>
        </BrutalCard>
      ))}
    </div>
  );
}
