import { cn } from '@/lib/utils';

/** Route mark: an open stop, a line, and a signal-filled destination. */
export function LogoMark({ className, inverse = false }: { className?: string; inverse?: boolean }) {
  // `inverse` is for fixed-dark surfaces (the auth stop board), independent of theme.
  const tile = inverse ? 'fill-[#e8ebe6]' : 'fill-ink';
  const line = inverse ? 'stroke-[#17222f]' : 'stroke-paper';
  return (
    <svg viewBox="0 0 28 28" aria-hidden className={cn('size-7', className)}>
      <rect width="28" height="28" rx="7" className={tile} />
      <path d="M9 19.5V12a3.5 3.5 0 0 1 3.5-3.5H19" className={line} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="9" cy="19.5" r="2.6" className={cn(tile, line)} strokeWidth="2" />
      <rect x="16.5" y="6" width="5" height="5" rx="1" className="fill-signal" />
    </svg>
  );
}

export function Logo({ className, inverse }: { className?: string; inverse?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark inverse={inverse} />
      <span className="font-display text-[1.15rem] leading-none font-extrabold tracking-[-0.03em]">CampusFlow</span>
    </span>
  );
}
