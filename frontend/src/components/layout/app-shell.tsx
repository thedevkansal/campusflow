import * as React from 'react';
import { Navbar } from '@/components/layout/navbar';
import { cn } from '@/lib/utils';

/** Header + page body. Every signed-in page uses this. */
export function AppShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-[200] rounded-full bg-brand px-4 py-2 font-bold text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
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
 * Map-first layout, like a ride or delivery app: the map fills the screen and a
 * white sheet floats over it on desktop. On phones the map sits on top and the
 * sheet slides up over its bottom edge.
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
    <div className="relative flex flex-1 flex-col lg:block">
      <div
        className={cn(
          'relative h-[38vh] min-h-60 lg:absolute lg:inset-0 lg:h-auto',
          hideMapOnMobile && 'hidden lg:block'
        )}
      >
        {map}
      </div>
      <div
        className={cn(
          'relative z-[500] flex-1 bg-paper lg:pointer-events-none lg:absolute lg:inset-y-0 lg:left-0 lg:flex lg:w-[min(480px,100%)] lg:items-start lg:bg-transparent lg:p-6',
          !hideMapOnMobile && '-mt-6 rounded-t-[28px] lg:mt-0 lg:rounded-none'
        )}
      >
        <div className="mx-auto w-full max-w-xl px-4 pt-6 pb-10 sm:px-6 lg:pointer-events-auto lg:max-h-full lg:overflow-y-auto lg:rounded-3xl lg:bg-surface lg:p-7 lg:shadow-sheet">
          {!hideMapOnMobile && (
            <span aria-hidden className="mx-auto -mt-2 mb-5 block h-1.5 w-10 rounded-full bg-rule-control/40 lg:hidden" />
          )}
          {sheet}
        </div>
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
  tone?: 'caution' | 'danger' | 'neutral' | 'success';
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2.5 rounded-2xl px-4 py-3 text-sm [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0',
        tone === 'caution' && 'bg-warning-tint text-warning',
        tone === 'danger' && 'bg-danger-tint text-danger',
        tone === 'neutral' && 'bg-brand-tint text-brand-strong',
        tone === 'success' && 'bg-success-tint text-success',
        className
      )}
    >
      {icon}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
