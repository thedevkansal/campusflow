import { cn } from '@/lib/utils';

/** Route mark: a pickup ring joined to a destination dot, on a teal tile. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" aria-hidden className={cn('size-8', className)}>
      <rect width="28" height="28" rx="9" className="fill-brand" />
      <path d="M9 19V12.5a3.5 3.5 0 0 1 3.5-3.5H19" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="9" cy="19.5" r="2.7" fill="#0b7f68" stroke="#fff" strokeWidth="2" />
      <circle cx="19.5" cy="9" r="3" fill="#fff" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark />
      <span className="text-[1.2rem] leading-none font-extrabold tracking-[-0.03em] text-ink">
        Campus<span className="text-brand">Flow</span>
      </span>
    </span>
  );
}
