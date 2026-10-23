import { cn } from '@/lib/utils';

/** Route mark: an open stop, a line, and a signal-ringed destination. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" aria-hidden className={cn('size-7', className)}>
      <rect width="28" height="28" rx="7" className="fill-ink" />
      <path d="M9 19.5V12a3.5 3.5 0 0 1 3.5-3.5H19" className="stroke-paper" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="9" cy="19.5" r="2.6" className="fill-ink stroke-paper" strokeWidth="2" />
      <rect x="16.5" y="6" width="5" height="5" rx="1" className="fill-signal" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark />
      <span className="font-display text-[1.15rem] leading-none font-extrabold tracking-[-0.03em]">CampusFlow</span>
    </span>
  );
}
