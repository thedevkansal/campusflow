import * as React from 'react';
import { Navbar } from '@/components/layout/navbar';
import { cn } from '@/lib/utils';

/** Header + page body. Every signed-in page uses this. */
export function AppShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-[200] rounded-md bg-ink px-3 py-2 text-paper focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main" className={cn('flex flex-1 flex-col', className)}>
        {children}
      </main>
    </div>
  );
}

/**
 * Map-first layout: a sheet of controls beside a full-height map on desktop;
 * map on top, sheet below on small screens.
 */
export function MapLayout({
  sheet,
  map,
  hideMapOnMobile = false,
}: {
  sheet: React.ReactNode;
  map: React.ReactNode;
  /** Skip the map on small screens when it carries no information yet. */
  hideMapOnMobile?: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[minmax(380px,460px)_1fr]">
      <div
        className={cn(
          'relative h-[36vh] min-h-56 border-b border-rule lg:sticky lg:top-14 lg:order-2 lg:block lg:h-[calc(100dvh-3.5rem)] lg:border-b-0',
          hideMapOnMobile && 'hidden'
        )}
      >
        {map}
      </div>
      <div className="bg-paper lg:order-1 lg:border-r lg:border-rule">
        <div className="mx-auto w-full max-w-xl px-4 pt-6 pb-10 sm:px-6 lg:pt-8">{sheet}</div>
      </div>
    </div>
  );
}

/** Inline notice for page-level conditions (connection lost, etc.). */
export function Notice({
  tone = 'caution',
  icon,
  children,
  className,
}: {
  tone?: 'caution' | 'danger' | 'neutral';
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2.5 rounded-md px-3 py-2.5 text-sm [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0',
        tone === 'caution' && 'bg-signal-tint text-caution-ink',
        tone === 'danger' && 'bg-danger-tint text-danger',
        tone === 'neutral' && 'bg-sunken text-ink-muted',
        className
      )}
    >
      {icon}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
