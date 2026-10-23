import * as React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { CAMPUS_PLACES } from '@/lib/campus';

/**
 * Split auth screen: a "stop board" (the campus line, like signage at a
 * station) beside the form. The board is hidden below lg.
 */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: React.ReactNode;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(480px,560px)]">
      <aside
        aria-hidden
        className="relative hidden overflow-hidden bg-[#17222f] text-[#e8ebe6] lg:flex lg:flex-col lg:justify-between lg:p-12"
      >
        <Link href="/" tabIndex={-1} className="text-[#e8ebe6]">
          <Logo inverse />
        </Link>

        <div>
          <p className="max-w-md font-display text-4xl leading-[1.02] font-extrabold tracking-[-0.03em]">
            Rides between campus stops, booked in two taps.
          </p>
          <ol className="relative mt-12 max-w-sm">
            <span className="absolute top-3 bottom-3 left-[7px] w-[3px] rounded-full bg-[#e8ebe6]/30" />
            {CAMPUS_PLACES.map((place, i) => (
              <li key={place.id} className="relative flex items-center gap-5 py-2.5">
                <span
                  className={
                    i === 1
                      ? 'relative z-10 size-[17px] rounded-[4px] bg-[#ffc21a]'
                      : 'relative z-10 size-[17px] rounded-full border-[3px] border-[#e8ebe6] bg-[#17222f]'
                  }
                />
                <span className="font-display text-xl font-bold">{place.name}</span>
              </li>
            ))}
          </ol>
        </div>

        <p className="text-sm text-[#e8ebe6]/60">Six stops. Live tracking from pickup to drop.</p>
      </aside>

      <main id="main" className="flex flex-col bg-paper">
        <div className="flex h-14 items-center px-4 sm:px-6 lg:hidden">
          <Link href="/" aria-label="CampusFlow home" className="text-ink">
            <Logo />
          </Link>
        </div>
        <div className="flex flex-1 flex-col justify-center px-4 py-10 sm:px-10 lg:px-14">
          <div className="mx-auto w-full max-w-sm">
            <h1 className="text-3xl sm:text-4xl">{title}</h1>
            <p className="mt-2 text-ink-muted">{subtitle}</p>
            <div className="mt-8">{children}</div>
            <div className="mt-8 border-t border-rule pt-6 text-sm text-ink-muted">{footer}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
