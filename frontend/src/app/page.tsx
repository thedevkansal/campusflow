import Link from 'next/link';
import { ArrowRight, Check, Navigation, Star } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Navbar } from '@/components/layout/navbar';
import { Logo } from '@/components/brand/logo';
import { RouteStops, StopText, RideProgress, Plate, Avatar } from '@/components/ride/route-line';
import { cn } from '@/lib/utils';

const STEPS = [
  { title: 'Choose two stops', body: 'Pick where you are and where you’re going from the campus stops.' },
  { title: 'Get matched', body: 'The nearest available driver gets your request and accepts it.' },
  { title: 'Hop on and go', body: 'Check the number plate, ride, and pay a fare set by distance.' },
];

const RIDING = [
  'See your driver coming on the map',
  'Know the fare before you’re picked up',
  'Cancel any time before your driver arrives',
];

const DRIVING = [
  'Go online or offline with one tap',
  'See the pickup and destination before you accept',
  'Build your rating with every ride',
];

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <Navbar />

      <main id="main" className="flex-1">
        {/* Hero: the booking card is the first thing you see */}
        <section className="px-3 pt-3 sm:px-4 sm:pt-4">
          <div className="mx-auto grid max-w-7xl items-center gap-10 rounded-[32px] bg-brand-tint px-5 py-10 sm:px-10 sm:py-14 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:px-14 lg:py-20">
            <div>
              <h1 className="max-w-[14ch] text-[2.6rem] leading-[1.02] sm:text-6xl">
                Get across campus in minutes.
              </h1>
              <p className="mt-5 max-w-[44ch] text-lg text-ink-muted">
                Book a ride between campus stops, see your driver on the map, and know the fare before
                you go.
              </p>

              <div className="mt-8 max-w-xl rounded-3xl bg-surface p-3 shadow-sheet sm:p-4">
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-center">
                  <div className="flex items-center gap-3 rounded-2xl bg-sunken px-4 py-3">
                    <span aria-hidden className="size-3 shrink-0 rounded-full border-[3px] border-brand bg-surface" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-ink-muted">From</p>
                      <p className="truncate font-bold">Main Gate</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl bg-sunken px-4 py-3">
                    <span aria-hidden className="size-3 shrink-0 rounded-full bg-brand" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-ink-muted">To</p>
                      <p className="truncate font-bold">Library</p>
                    </div>
                  </div>
                  <Link href="/register" className={cn(buttonVariants({ size: 'lg' }), 'h-14')}>
                    Find a ride
                    <ArrowRight />
                  </Link>
                </div>
              </div>
              <p className="mt-4 text-sm text-ink-muted">
                Already have an account?{' '}
                <Link href="/login" className="font-bold text-brand-strong hover:underline">
                  Log in
                </Link>
              </p>
            </div>

            {/* What a ride looks like once it's booked */}
            <figure className="mx-auto w-full max-w-md lg:justify-self-end">
              <div className="rounded-3xl bg-surface p-6 shadow-sheet sm:p-7">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-success-tint px-3 py-1 text-xs font-bold text-success">
                    <Navigation aria-hidden className="size-3.5" />
                    Driver on the way
                  </span>
                  <span className="text-sm font-semibold text-ink-muted">3 min away</span>
                </div>
                <p className="mt-4 text-2xl font-extrabold tracking-[-0.02em]">Rohit is heading to you</p>
                <RideProgress status="ACCEPTED" className="mt-5" drawOnMount />

                <div className="mt-6 flex items-center gap-3 rounded-2xl bg-sunken p-4">
                  <Avatar name="Rohit M" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-bold">
                      Rohit M.
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-ink-muted">
                        <Star aria-hidden className="size-3.5 fill-star text-star" />
                        <span className="tnum">4.9</span>
                      </span>
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
                      <Plate>KA05MX4821</Plate>
                      Grey Activa
                    </p>
                  </div>
                </div>

                <RouteStops
                  className="mt-5"
                  from={<StopText label="Pickup" name="Main Gate" />}
                  to={<StopText label="Destination" name="Library" />}
                />
              </div>
              <figcaption className="sr-only">Example of a ride in progress</figcaption>
            </figure>
          </div>
        </section>

        {/* How it works: a real sequence */}
        <section aria-labelledby="how" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <h2 id="how" className="text-3xl sm:text-4xl">How it works</h2>
          <p className="mt-3 max-w-[52ch] text-lg text-ink-muted">Three steps from your current stop to the next one.</p>
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="rounded-3xl bg-paper p-7">
                <span
                  aria-hidden
                  className="tnum grid size-11 place-items-center rounded-full bg-brand text-lg font-extrabold text-white"
                >
                  {i + 1}
                </span>
                <h3 className="mt-5 text-xl">{step.title}</h3>
                <p className="mt-2 text-ink-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Two audiences */}
        <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-20 sm:px-6 md:grid-cols-2">
          <AudiencePanel
            title="Riding"
            body="For getting to class, the library, or back to the hostel."
            items={RIDING}
            cta={{ href: '/register', label: 'Book a ride' }}
            tone="plain"
          />
          <AudiencePanel
            title="Driving"
            body="For students with a vehicle and a free hour between classes."
            items={DRIVING}
            cta={{ href: '/register', label: 'Start driving' }}
            tone="tint"
          />
        </section>
      </main>

      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo />
          <p>Built for E-Summit 2026. Map data © OpenStreetMap contributors.</p>
          <nav aria-label="Footer" className="flex gap-6">
            <Link href="/login" className="font-bold text-ink hover:text-brand-strong">Log in</Link>
            <Link href="/register" className="font-bold text-ink hover:text-brand-strong">Sign up</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function AudiencePanel({
  title,
  body,
  items,
  cta,
  tone,
}: {
  title: string;
  body: string;
  items: string[];
  cta: { href: string; label: string };
  tone: 'plain' | 'tint';
}) {
  return (
    <div className={cn('flex flex-col rounded-[32px] p-8 sm:p-10', tone === 'tint' ? 'bg-brand-tint' : 'bg-paper')}>
      <h2 className="text-3xl">{title}</h2>
      <p className="mt-2 text-ink-muted">{body}</p>
      <ul className="mt-6 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-3 font-semibold">
            <span aria-hidden className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-brand text-white">
              <Check className="size-3.5" strokeWidth={3} />
            </span>
            {item}
          </li>
        ))}
      </ul>
      <Link
        href={cta.href}
        className={cn(buttonVariants({ variant: tone === 'tint' ? 'default' : 'outline', size: 'lg' }), 'mt-8 self-start')}
      >
        {cta.label}
      </Link>
    </div>
  );
}
