import Link from 'next/link';
import { Star } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Navbar } from '@/components/layout/navbar';
import { Logo } from '@/components/brand/logo';
import { RouteStops, StopText, RideProgress, Plate } from '@/components/ride/route-line';
import { cn } from '@/lib/utils';

const STEPS = [
  { title: 'Choose two stops', body: 'Pick where you are and where you’re going from the campus stops.' },
  { title: 'Get matched', body: 'The nearest available driver gets your request and accepts it.' },
  { title: 'Meet at the pickup', body: 'Check the number plate shown in the app, then hop on.' },
  { title: 'Ride and arrive', body: 'Your fare is set by distance and shown with your ride.' },
];

const RIDING = [
  ['See your driver coming', 'Their location updates on the map until they reach you.'],
  ['Know the fare upfront', 'A base fare plus a per-kilometre rate. No surge.'],
  ['Change of plans', 'Cancel any time before your driver gets to the pickup.'],
];

const DRIVING = [
  ['Drive between classes', 'Go online or offline with one tap.'],
  ['See the route first', 'Every request shows the pickup and destination before you accept.'],
  ['Build your rating', 'Passengers see your rating and vehicle on every ride.'],
];

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />

      <main id="main" className="flex-1">
        {/* Hero: the product itself */}
        <section className="mx-auto grid max-w-7xl gap-12 px-4 pt-12 pb-20 sm:px-6 md:pt-20 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16 lg:pb-28">
          <div>
            <h1 className="max-w-[13ch] text-[2.75rem] leading-[0.98] tracking-[-0.035em] sm:text-6xl lg:text-[4.5rem]">
              Main Gate to Library, without the walk.
            </h1>
            <p className="mt-6 max-w-[46ch] text-lg text-ink-muted">
              Book a ride between campus stops, check your driver’s number plate, and follow them on the map
              until they pull up.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link href="/register" className={buttonVariants({ size: 'xl' })}>
                Book a ride
              </Link>
              <Link
                href="/register"
                className="font-bold text-ink underline decoration-rule-control decoration-2 underline-offset-[6px] transition-colors hover:decoration-ink"
              >
                Drive with CampusFlow
              </Link>
            </div>
          </div>

          <figure className="relative mx-auto w-full max-w-md lg:mx-0 lg:justify-self-end">
            <div className="rounded-2xl bg-surface p-6 shadow-sheet ring-1 ring-rule sm:p-7">
              <p className="text-sm text-ink-muted">
                Ride <span className="tnum font-bold text-ink">4K7Q2M</span>
              </p>
              <p className="mt-1 font-display text-3xl font-extrabold tracking-[-0.02em]">Driver on the way</p>
              <p className="mt-1 text-ink-muted">Head to your pickup point.</p>
              <RideProgress status="ACCEPTED" className="mt-6" drawOnMount />

              <div className="mt-7 flex items-center gap-3 rounded-xl border border-rule p-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-ink font-display text-lg font-extrabold text-paper">
                  R
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-bold">
                    Rohit M.
                    <span className="inline-flex items-center gap-1 text-sm font-normal text-ink-muted">
                      <Star aria-hidden className="size-3.5 fill-signal text-signal-edge" />
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
                className="mt-7"
                from={<StopText label="Pickup" name="Main Gate" />}
                to={<StopText label="Destination" name="Library" />}
              />
            </div>
            <figcaption className="mt-4 text-center text-sm text-ink-muted lg:text-left">
              What you see while your driver is on the way.
            </figcaption>
          </figure>
        </section>

        {/* How a ride runs: a real sequence, drawn as one line */}
        <section aria-labelledby="how" className="border-y border-rule bg-surface">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
            <h2 id="how" className="text-3xl sm:text-4xl">How a ride runs</h2>
            <ol className="relative mt-12 grid gap-10 md:grid-cols-4 md:gap-8">
              {STEPS.map((step, i) => (
                <li key={step.title} className="relative pl-10 md:pt-10 md:pl-0">
                  {/* Connector to the next stop, so the line ends at the last one */}
                  {i < STEPS.length - 1 && (
                    <span
                      aria-hidden
                      className="absolute top-2 -bottom-10 left-[7px] w-[3px] bg-ink md:top-[7px] md:-right-8 md:bottom-auto md:left-2 md:h-[3px] md:w-auto"
                    />
                  )}
                  <span
                    aria-hidden
                    className={cn(
                      'absolute top-0 left-0 z-10 size-[17px]',
                      i === STEPS.length - 1
                        ? 'rounded-[4px] bg-ink ring-[3px] ring-signal ring-inset'
                        : 'rounded-full border-[3px] border-ink bg-surface'
                    )}
                  />
                  <h3 className="text-xl">{step.title}</h3>
                  <p className="mt-2 max-w-[32ch] text-ink-muted">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Two audiences, plain lists */}
        <section className="mx-auto grid max-w-7xl gap-16 px-4 py-20 sm:px-6 md:grid-cols-2 md:gap-12">
          <AudienceList id="riding" title="Riding" items={RIDING} />
          <AudienceList id="driving" title="Driving" items={DRIVING} />
        </section>
      </main>

      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-4 text-ink">
            <Logo />
          </div>
          <p>Built for E-Summit 2026. Map data © OpenStreetMap contributors.</p>
          <nav aria-label="Footer" className="flex gap-6">
            <Link href="/login" className="font-bold text-ink hover:underline">Log in</Link>
            <Link href="/register" className="font-bold text-ink hover:underline">Sign up</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function AudienceList({ id, title, items }: { id: string; title: string; items: string[][] }) {
  return (
    <div>
      <h2 id={id} className="text-3xl">{title}</h2>
      <dl aria-labelledby={id} className="mt-6 divide-y divide-rule border-y border-rule">
        {items.map(([term, detail]) => (
          <div key={term} className="grid gap-1 py-5 sm:grid-cols-[14rem_1fr] sm:gap-6">
            <dt className="font-bold">{term}</dt>
            <dd className="text-ink-muted">{detail}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
