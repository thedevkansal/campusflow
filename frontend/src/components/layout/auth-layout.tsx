import * as React from 'react';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { Logo } from '@/components/brand/logo';
import { CAMPUS_PLACES } from '@/lib/campus';

/**
 * Auth screen: a soft teal panel listing the campus stops beside a white form
 * card. The panel is hidden below lg so phones go straight to the form.
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
    <div className="grid min-h-dvh bg-paper lg:grid-cols-[1fr_minmax(520px,600px)]">
      <aside aria-hidden className="relative hidden overflow-hidden bg-brand-tint lg:flex lg:flex-col lg:p-12">
        <Link href="/" tabIndex={-1}>
          <Logo />
        </Link>

        <div className="my-auto max-w-lg">
          <p className="text-5xl leading-[1.05] font-extrabold tracking-[-0.03em] text-ink">
            Rides between campus stops, booked in two taps.
          </p>
          <p className="mt-4 max-w-md text-lg text-ink-muted">
            Pick where you are and where you’re going. A student driver nearby picks you up.
          </p>
          <ul className="mt-10 flex max-w-md flex-wrap gap-2.5">
            {CAMPUS_PLACES.map((place) => (
              <li
                key={place.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-surface px-4 py-2 text-sm font-bold text-ink shadow-card"
              >
                <MapPin className="size-4 text-brand" />
                {place.name}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main id="main" className="flex flex-col">
        <div className="flex h-16 items-center px-4 sm:px-6 lg:hidden">
          <Link href="/" aria-label="CampusFlow home">
            <Logo />
          </Link>
        </div>
        <div className="flex flex-1 flex-col px-4 pt-4 pb-12 sm:px-10 sm:pt-10 lg:justify-center lg:px-14 lg:py-10">
          <div className="mx-auto w-full max-w-md rounded-3xl bg-surface p-6 shadow-card sm:p-8">
            <h1 className="text-3xl">{title}</h1>
            <p className="mt-2 text-ink-muted">{subtitle}</p>
            <div className="mt-7">{children}</div>
            <div className="mt-7 border-t border-rule pt-5 text-sm text-ink-muted">{footer}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
