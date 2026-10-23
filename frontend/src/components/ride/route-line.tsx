import * as React from 'react';
import { cn } from '@/lib/utils';
import { RIDE_STOPS, stopIndex } from '@/lib/ride-status';

/** Vertical "From → To" route, drawn like a line on a transit map. */
export function RouteStops({
  from,
  to,
  className,
  action,
}: {
  from: React.ReactNode;
  to: React.ReactNode;
  className?: string;
  /** Optional control placed on the line between the stops (e.g. swap). */
  action?: React.ReactNode;
}) {
  return (
    <div className={cn('relative grid grid-cols-[1.25rem_1fr] gap-x-3', className)}>
      {/* The line */}
      <span aria-hidden className="absolute top-[1.15rem] bottom-[1.15rem] left-[0.5625rem] w-[3px] rounded-full bg-ink" />
      <StopDot kind="from" />
      <div className="min-w-0 pb-4">{from}</div>
      <StopDot kind="to" />
      <div className="min-w-0">{to}</div>
      {action && <div className="absolute top-1/2 right-0 -translate-y-1/2">{action}</div>}
    </div>
  );
}

function StopDot({ kind }: { kind: 'from' | 'to' }) {
  return (
    <span aria-hidden className="relative z-10 flex h-[2.3rem] items-center justify-center">
      {kind === 'from' ? (
        <span className="size-3.5 rounded-full border-[3px] border-ink bg-surface" />
      ) : (
        <span className="size-4 rounded-[3px] bg-ink ring-[3px] ring-signal ring-inset" />
      )}
    </span>
  );
}

/** Text block for a stop inside RouteStops. */
export function StopText({ label, name }: { label: string; name: React.ReactNode }) {
  return (
    <div className="flex min-h-[2.3rem] flex-col justify-center">
      <span className="text-xs text-ink-muted">{label}</span>
      <span className="font-display text-lg leading-tight font-extrabold">{name}</span>
    </div>
  );
}

/**
 * The ride lifecycle as a transit line. Completed segments fill with the signal
 * colour; the fill animates when the status advances.
 */
export function RideProgress({ status, className }: { status: string; className?: string }) {
  const current = stopIndex(status);
  const last = RIDE_STOPS.length - 1;
  const pct = current <= 0 ? 0 : (current / last) * 100;

  return (
    <div className={cn('px-1.5', className)}>
      <ol className="relative flex items-center justify-between" aria-label="Ride progress">
        <span aria-hidden className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-rule" />
        <span
          aria-hidden
          className="absolute top-1/2 left-0 h-[3px] -translate-y-1/2 rounded-full bg-ink transition-[width] duration-[320ms] ease-out"
          style={{ width: `${pct}%` }}
        />
        {RIDE_STOPS.map((stop, i) => {
          const state = i < current ? 'past' : i === current ? 'current' : 'future';
          return (
            <li
              key={stop.key}
              aria-current={state === 'current' ? 'step' : undefined}
              className="relative z-10"
            >
              <span className="sr-only">
                {stop.label}
                {state === 'past' ? ' (done)' : state === 'current' ? ' (now)' : ''}
              </span>
              <span
                aria-hidden
                className={cn(
                  'block rounded-full transition-all duration-200',
                  state === 'past' && 'size-2.5 bg-ink',
                  state === 'current' && 'size-4 border-[3px] border-ink bg-signal',
                  state === 'future' && 'size-2.5 border-2 border-rule-control bg-surface'
                )}
              />
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Pulsing dot for live states (searching, online). */
export function LiveDot({ className, tone = 'signal' }: { className?: string; tone?: 'signal' | 'success' | 'idle' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block size-2.5 shrink-0 rounded-full',
        tone === 'signal' && 'animate-live bg-signal text-signal-edge',
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
