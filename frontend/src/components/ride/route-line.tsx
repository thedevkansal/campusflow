import * as React from 'react';
import { cn } from '@/lib/utils';
import { RIDE_STOPS, stopIndex } from '@/lib/ride-status';

/** Pickup → destination, as two pins joined by a dotted connector. */
export function RouteStops({
  from,
  to,
  className,
  action,
  variant = 'text',
}: {
  from: React.ReactNode;
  to: React.ReactNode;
  className?: string;
  /** Optional control placed between the stops (e.g. swap). */
  action?: React.ReactNode;
  /** 'control' aligns the pins with labelled form controls instead of text. */
  variant?: 'text' | 'control';
}) {
  const control = variant === 'control';
  return (
    <div className={cn('relative grid grid-cols-[1.25rem_1fr] gap-x-3', className)}>
      <span
        aria-hidden
        className={cn(
          'absolute left-[0.5625rem] w-0 border-l-[3px] border-dotted border-brand-tint-2',
          control ? 'top-[3.4rem] bottom-[1.9rem]' : 'top-[1.6rem] bottom-[1.6rem]'
        )}
      />
      <StopPin kind="from" control={control} />
      <div className={cn('min-w-0 pb-3', action && 'pr-14')}>{from}</div>
      <StopPin kind="to" control={control} />
      <div className={cn('min-w-0', action && 'pr-14')}>{to}</div>
      {action && (
        <div className={cn('absolute right-0 -translate-y-1/2', control ? 'top-[calc(50%+0.75rem)]' : 'top-1/2')}>
          {action}
        </div>
      )}
    </div>
  );
}

function StopPin({ kind, control }: { kind: 'from' | 'to'; control?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn('relative z-10 flex h-12 items-center justify-center self-start', control && 'mt-[1.6rem]')}
    >
      {kind === 'from' ? (
        <span className="size-4 rounded-full border-[4px] border-brand bg-surface" />
      ) : (
        <span className="size-4 rounded-full bg-brand ring-4 ring-brand-tint-2" />
      )}
    </span>
  );
}

/** Text block for a stop inside RouteStops. */
export function StopText({ label, name }: { label: string; name: React.ReactNode }) {
  return (
    <div className="flex min-h-12 flex-col justify-center">
      <span className="text-xs font-semibold text-ink-muted">{label}</span>
      <span className="text-lg leading-tight font-bold">{name}</span>
    </div>
  );
}

/**
 * Ride lifecycle as a segmented tracker (like a delivery order tracker).
 * Done segments are teal; the current one fills when the status advances.
 */
export function RideProgress({
  status,
  className,
  drawOnMount = false,
}: {
  status: string;
  className?: string;
  /** Fill the current segment once on first paint (landing hero). */
  drawOnMount?: boolean;
}) {
  const current = stopIndex(status);
  return (
    <div className={className}>
      <ol className="flex gap-1.5" aria-label="Ride progress">
        {RIDE_STOPS.map((stop, i) => {
          const state = i < current ? 'past' : i === current ? 'current' : 'future';
          return (
            <li
              key={stop.key}
              aria-current={state === 'current' ? 'step' : undefined}
              className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-brand-tint-2/70"
            >
              <span className="sr-only">
                {stop.label}
                {state === 'past' ? ' (done)' : state === 'current' ? ' (now)' : ''}
              </span>
              <span
                aria-hidden
                className={cn(
                  'absolute inset-y-0 left-0 rounded-full bg-brand transition-[width] duration-500 ease-out',
                  state === 'past' && 'w-full',
                  state === 'current' && 'w-full',
                  state === 'future' && 'w-0',
                  state === 'current' && drawOnMount && 'origin-left animate-[fill_900ms_var(--ease-out)_250ms_both]'
                )}
              />
            </li>
          );
        })}
      </ol>
      {current >= 0 && (
        <p className="mt-2 text-xs font-semibold text-ink-muted">
          Step {current + 1} of {RIDE_STOPS.length}: {RIDE_STOPS[current].label}
        </p>
      )}
    </div>
  );
}

/** Pulsing dot for live states (searching, online). */
export function LiveDot({ className, tone = 'brand' }: { className?: string; tone?: 'brand' | 'success' | 'idle' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block size-2.5 shrink-0 rounded-full',
        tone === 'brand' && 'animate-live bg-brand text-brand',
        tone === 'success' && 'animate-live bg-success text-success',
        tone === 'idle' && 'bg-rule-control',
        className
      )}
    />
  );
}

/** Vehicle number rendered as a number plate. */
export function Plate({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('plate text-sm', className)}>
      <span className="sr-only">Vehicle number </span>
      {children}
    </span>
  );
}

/** Round initials avatar on a teal tint. */
export function Avatar({ name, size = 'md', className }: { name: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      aria-hidden
      className={cn(
        'grid shrink-0 place-items-center rounded-full bg-brand-tint font-extrabold text-brand-strong',
        size === 'sm' && 'size-8 text-xs',
        size === 'md' && 'size-12 text-base',
        size === 'lg' && 'size-16 text-xl',
        className
      )}
    >
      {initials || '?'}
    </span>
  );
}
