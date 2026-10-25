'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowUpDown, CircleAlert, CircleCheck, Loader2, LocateFixed, MapPinOff, Star, WifiOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { AppShell, MapLayout, Notice } from '@/components/layout/app-shell';
import { RouteStops, StopText, RideProgress, LiveDot, Plate } from '@/components/ride/route-line';
import { Map, type LatLng } from '@/components/map';
import { api, getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useSocket } from '@/context/socket-context';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { CAMPUS_PLACES } from '@/lib/campus';
import { ENDED_STATUSES, PASSENGER_STATUS, shortRideId } from '@/lib/ride-status';

// Matches PASSENGER_CANCELLABLE_STATUSES in backend rides.repository.ts
// (docs/RIDE_STATE_MACHINE.md: passengers cannot cancel once the driver is ARRIVING)
const PASSENGER_CANCELLABLE = ['REQUESTED', 'SEARCHING', 'ASSIGNED', 'ACCEPTED'];
const SEARCHING = ['REQUESTED', 'SEARCHING'];

// A pickup or destination: a campus stop (key = place id), the passenger's
// current location ('current') or a pin dropped on the map ('map').
interface Stop extends LatLng {
  key: string;
  label: string;
}

type LocationState = 'asking' | 'granted' | 'denied' | 'unavailable';

interface FareEstimate {
  distanceKm: number;
  estimatedFare: number;
  durationMin: number | null;
  route: [number, number][];
  source: 'road' | 'straight-line';
}

function placeStop(id: string): Stop {
  const p = CAMPUS_PLACES.find((place) => place.id === id)!;
  return { key: p.id, lat: p.lat, lng: p.lng, label: p.name };
}

function sameSpot(a: LatLng, b: LatLng) {
  return Math.abs(a.lat - b.lat) < 1e-5 && Math.abs(a.lng - b.lng) < 1e-5;
}

/** Road route + fare quote from GET /rides/estimate (cached per coordinate pair). */
function useFareEstimate(from: LatLng | null, to: LatLng | null, enabled: boolean) {
  const params =
    from && to
      ? {
          pickupLat: +from.lat.toFixed(5),
          pickupLng: +from.lng.toFixed(5),
          destLat: +to.lat.toFixed(5),
          destLng: +to.lng.toFixed(5),
        }
      : null;
  return useQuery({
    queryKey: ['fareEstimate', params],
    queryFn: async () => {
      const res = await api.get('/rides/estimate', { params });
      return res.data.data as FareEstimate;
    },
    enabled: enabled && !!params,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    retry: 1,
  });
}

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { passengerSocket } = useSocket();
  const [pickup, setPickup] = useState<Stop>(() => placeStop('main-gate'));
  const [dest, setDest] = useState<Stop>(() => placeStop('central-library'));
  // Which stop a tap on the map sets.
  const [mapTarget, setMapTarget] = useState<'pickup' | 'destination'>('destination');
  const [myLocation, setMyLocation] = useState<LatLng | null>(null);
  const [locState, setLocState] = useState<LocationState>('asking');
  // Once the passenger picks a pickup themselves, a late GPS fix must not overwrite it.
  const pickupChosen = useRef(false);
  const [error, setError] = useState('');
  const [socketError, setSocketError] = useState('');
  // The ride this session last requested, so its outcome can be shown after it
  // leaves /rides/active (e.g. NO_DRIVER_FOUND, DRIVER_CANCELLED, COMPLETED).
  const [lastRideId, setLastRideId] = useState<string | null>(null);

  const { isLoading: authLoading } = useRequireAuth('PASSENGER');

  // Fetch active ride — returns null on 404 to clear stale data after cancellation/completion
  const { data: activeRide, isLoading: rideLoading } = useQuery({
    queryKey: ['activeRide'],
    queryFn: async () => {
      try {
        const res = await api.get('/rides/active');
        return res.data.data ?? null;
      } catch (err: any) {
        if (err?.response?.status === 404) return null;
        throw err;
      }
    },
    enabled: !authLoading,
    retry: (count, err: any) => err?.response?.status !== 404 && count < 2,
  });

  const { data: lastRide } = useQuery({
    queryKey: ['ride', lastRideId],
    queryFn: async () => {
      const res = await api.get(`/rides/${lastRideId}`);
      return res.data.data ?? null;
    },
    enabled: !!lastRideId && !rideLoading && !activeRide,
    staleTime: 0,
  });

  // Remember the active ride's id (render-time update, no effect needed).
  if (activeRide?.id && activeRide.id !== lastRideId) setLastRideId(activeRide.id);

  // Attach event listeners to the shared socket from SocketProvider.
  // We do NOT connect/disconnect here — that is managed by SocketProvider
  // so the connection survives page navigation within the app.
  useEffect(() => {
    const socket = passengerSocket;
    if (!socket) return;

    const onConnectError = (err: Error) => setSocketError(err.message);
    const onConnect = () => {
      setSocketError('');
      socket.emit('session:restore', {
        lastEventTimestamp: new Date(Date.now() - 3600000).toISOString(),
      });
    };
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['activeRide'] });
    const onLocationUpdate = (data: any) => {
      queryClient.setQueryData(['activeRide'], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          currentDriverLocation: {
            lat: data.latitude.toString(),
            lng: data.longitude.toString(),
            heading: data.heading?.toString(),
          },
        };
      });
    };

    socket.on('connect_error', onConnectError);
    socket.on('connect', onConnect);
    socket.on('ride_assigned', invalidate);
    socket.on('ride_accepted', invalidate);
    socket.on('ride_updated', invalidate);
    socket.on('ride_cancelled', invalidate);
    socket.on('ride_completed', invalidate);
    socket.on('driver:location_update', onLocationUpdate);

    // Emit session:restore if already connected
    if (socket.connected) {
      socket.emit('session:restore', {
        lastEventTimestamp: new Date(Date.now() - 3600000).toISOString(),
      });
    }

    // Remove only the listeners we added — do NOT disconnect the socket.
    return () => {
      socket.off('connect_error', onConnectError);
      socket.off('connect', onConnect);
      socket.off('ride_assigned', invalidate);
      socket.off('ride_accepted', invalidate);
      socket.off('ride_updated', invalidate);
      socket.off('ride_cancelled', invalidate);
      socket.off('ride_completed', invalidate);
      socket.off('driver:location_update', onLocationUpdate);
    };
  }, [passengerSocket, queryClient]);

  const showPicker = !authLoading && !rideLoading && !activeRide;

  // Ask for the passenger's location; on success it becomes the pickup
  // (unless they already chose one). Denied → stops and map pins still work.
  const requestLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      void Promise.resolve().then(() => setLocState('unavailable'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyLocation(here);
        setLocState('granted');
        if (!pickupChosen.current) setPickup({ key: 'current', ...here, label: 'Current location' });
      },
      (err) => setLocState(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, []);

  useEffect(() => {
    if (showPicker) requestLocation();
  }, [showPicker, requestLocation]);

  const sameStop = sameSpot(pickup, dest);
  const { data: quote, isFetching: quoting, isError: quoteFailed } = useFareEstimate(
    pickup,
    dest,
    showPicker && !sameStop,
  );
  // Road route for the map during a ride (same cached endpoint as the quote).
  const ridePickup = activeRide ? { lat: parseFloat(activeRide.pickup.lat), lng: parseFloat(activeRide.pickup.lng) } : null;
  const rideDest = activeRide ? { lat: parseFloat(activeRide.destination.lat), lng: parseFloat(activeRide.destination.lng) } : null;
  const { data: rideRoute } = useFareEstimate(ridePickup, rideDest, !!activeRide);

  // Create Ride
  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        pickupAddress: pickup.label,
        destLat: dest.lat,
        destLng: dest.lng,
        destAddress: dest.label,
      };
      const res = await api.post('/rides', payload);
      return res.data.data;
    },
    onSuccess: (ride) => {
      if (ride?.id) setLastRideId(ride.id);
      queryClient.invalidateQueries({ queryKey: ['activeRide'] });
      setError('');
      toast.success('Ride requested', 'Finding the closest driver now.');
    },
    onError: (err: any) => {
      setError(getErrorMessage(err, 'Failed to request ride'));
    },
  });

  // Cancel Ride
  const cancelMutation = useMutation({
    mutationFn: async (rideId: string) => {
      const res = await api.post(`/rides/${rideId}/cancel`, { reasonCode: 'CHANGED_MIND' });
      return res.data.data;
    },
    onSuccess: () => {
      setLastRideId(null);
      queryClient.invalidateQueries({ queryKey: ['activeRide'] });
      toast.success('Ride cancelled');
    },
    onError: (err: any) => {
      setError(getErrorMessage(err, 'Could not cancel ride'));
    },
  });

  const handleRequestRide = (e: React.FormEvent) => {
    e.preventDefault();
    if (sameStop) {
      setError('Pickup and destination must be different');
      return;
    }
    setError('');
    createMutation.mutate();
  };

  const changePickup = (stop: Stop) => {
    pickupChosen.current = true;
    setPickup(stop);
    setError('');
  };
  const changeDest = (stop: Stop) => {
    setDest(stop);
    setError('');
  };

  const swapStops = () => {
    pickupChosen.current = true;
    setPickup(dest);
    setDest(pickup);
    setError('');
  };

  const pinStop = (point: LatLng, which: 'pickup' | 'destination'): Stop => ({
    key: 'map',
    ...point,
    label: which === 'pickup' ? 'Pickup pin' : 'Destination pin',
  });

  const handleMapClick = (point: LatLng) => {
    if (mapTarget === 'pickup') {
      changePickup(pinStop(point, 'pickup'));
      // Natural next step after placing a pickup is the destination.
      setMapTarget('destination');
    } else {
      changeDest(pinStop(point, 'destination'));
    }
  };

  const retryLocation = () => {
    setLocState('asking');
    pickupChosen.current = false;
    requestLocation();
  };

  const canCancel = activeRide && PASSENGER_CANCELLABLE.includes(activeRide.status);

  if (authLoading || rideLoading) {
    return (
      <AppShell>
        <MapLayout map={<Skeleton className="size-full rounded-none" />} sheet={<SheetSkeleton />} />
      </AppShell>
    );
  }

  const connectionNotice = socketError && (
    <Notice icon={<WifiOff />} className="mb-5">
      <p className="font-bold">Live updates paused</p>
      <p>Your ride status may lag until we reconnect. ({socketError})</p>
    </Notice>
  );

  // ── No ride: route picker ────────────────────────────────────────────────
  if (!activeRide) {
    const outcome =
      lastRide && (ENDED_STATUSES.includes(lastRide.status) || lastRide.status === 'COMPLETED')
        ? { ...PASSENGER_STATUS[lastRide.status], completed: lastRide.status === 'COMPLETED' }
        : null;
    return (
      <AppShell>
        <MapLayout
          map={
            <Map
              className="size-full"
              pickup={pickup}
              destination={sameStop ? undefined : dest}
              route={quote && !sameStop ? quote.route : undefined}
              onMapClick={handleMapClick}
              onPickupDrag={(p) => changePickup(pinStop(p, 'pickup'))}
              onDestinationDrag={(p) => changeDest(pinStop(p, 'destination'))}
            />
          }
          sheet={
            <>
              {connectionNotice}
              {outcome && (
                <Notice
                  tone={outcome.completed ? 'neutral' : 'caution'}
                  icon={outcome.completed ? <CircleCheck /> : <CircleAlert />}
                  className="mb-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-ink">{outcome.title}</p>
                      <p>
                        {outcome.completed
                          ? `${lastRide.pickup.address} to ${lastRide.destination.address}.${lastRide.estimatedFare ? ` Fare ₹${lastRide.estimatedFare}.` : ''}`
                          : outcome.detail}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLastRideId(null)}
                      className="-mt-1 -mr-1 grid size-8 shrink-0 place-items-center rounded-md hover:bg-ink/5"
                      aria-label="Dismiss"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </Notice>
              )}
              <h1 className="text-3xl sm:text-4xl">Where to?</h1>
              <p className="mt-2 text-ink-muted">
                Pick a campus stop or tap the map. We’ll price the road route and match you with the nearest driver.
              </p>

              {locState === 'asking' && (
                <p className="mt-4 inline-flex items-center gap-2 text-sm text-ink-muted" aria-live="polite">
                  <Loader2 aria-hidden className="size-4 animate-spin" />
                  Finding your location…
                </p>
              )}
              {(locState === 'denied' || locState === 'unavailable') && (
                <Notice icon={<MapPinOff />} className="mt-4">
                  <p className="font-bold">
                    {locState === 'denied' ? 'Location access is off' : 'Couldn’t get your location'}
                  </p>
                  <p>
                    {locState === 'denied'
                      ? 'Pick a stop or tap the map instead. To use your location, allow it in your browser’s site settings.'
                      : 'Pick a stop or tap the map instead.'}
                  </p>
                  <Button type="button" variant="link" size="sm" onClick={retryLocation} className="mt-1">
                    Try again
                  </Button>
                </Notice>
              )}

              <form onSubmit={handleRequestRide} className="mt-6" noValidate>
                <RouteStops
                  variant="control"
                  from={
                    <StopSelect
                      id="pickup"
                      label="From"
                      stop={pickup}
                      myLocation={myLocation}
                      onChange={changePickup}
                    />
                  }
                  to={
                    <StopSelect
                      id="destination"
                      label="To"
                      stop={dest}
                      myLocation={myLocation}
                      onChange={changeDest}
                      invalid={sameStop}
                    />
                  }
                  action={
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={swapStops}
                      aria-label="Swap pickup and destination"
                      className="rounded-full"
                    >
                      <ArrowUpDown />
                    </Button>
                  }
                />

                <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted">
                  <span>Tap the map to set</span>
                  <div role="group" aria-label="Map tap sets" className="inline-flex rounded-full bg-sunken p-0.5">
                    {(['pickup', 'destination'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        aria-pressed={mapTarget === t}
                        onClick={() => setMapTarget(t)}
                        className={cn(
                          'rounded-full px-3 py-1 font-semibold capitalize transition-colors',
                          mapTarget === t ? 'bg-surface text-ink shadow-card' : 'hover:text-ink'
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  {myLocation && pickup.key !== 'current' && (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={() => changePickup({ key: 'current', ...myLocation, label: 'Current location' })}
                      className="ml-auto"
                    >
                      <LocateFixed /> Use my location
                    </Button>
                  )}
                </div>

                <div aria-live="polite" className="mt-4 min-h-0">
                  {sameStop ? (
                    <p className="text-sm text-danger">Choose a destination that’s different from your pickup.</p>
                  ) : error ? (
                    <Notice tone="danger" icon={<CircleAlert />}>{error}</Notice>
                  ) : (
                    <FareQuote quote={quote} loading={quoting && !quote} failed={quoteFailed && !quote} />
                  )}
                </div>

                <Button
                  type="submit"
                  size="xl"
                  className="mt-6 w-full"
                  disabled={createMutation.isPending || sameStop}
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="size-5 animate-spin" />
                      Requesting…
                    </>
                  ) : (
                    'Request ride'
                  )}
                </Button>
                <p className="mt-3 text-sm text-ink-muted">
                  You can cancel any time before your driver reaches the pickup.
                </p>
              </form>
            </>
          }
        />
      </AppShell>
    );
  }

  // ── Active ride ──────────────────────────────────────────────────────────
  const status = PASSENGER_STATUS[activeRide.status] ?? {
    title: activeRide.status.replace(/_/g, ' ').toLowerCase(),
    detail: '',
  };
  const isSearching = SEARCHING.includes(activeRide.status);
  const driver = activeRide.driver;

  return (
    <AppShell>
      <MapLayout
        map={
          <Map
            className="size-full"
            pickup={{
              lat: parseFloat(activeRide.pickup.lat),
              lng: parseFloat(activeRide.pickup.lng),
              label: activeRide.pickup.address || 'Pickup',
            }}
            destination={{
              lat: parseFloat(activeRide.destination.lat),
              lng: parseFloat(activeRide.destination.lng),
              label: activeRide.destination.address || 'Destination',
            }}
            route={rideRoute?.route}
            driver={
              activeRide.currentDriverLocation
                ? {
                    lat: parseFloat(activeRide.currentDriverLocation.lat),
                    lng: parseFloat(activeRide.currentDriverLocation.lng),
                    label: driver?.name ?? 'Driver',
                  }
                : undefined
            }
          />
        }
        sheet={
          <>
            {connectionNotice}
            <div className="flex items-center justify-between gap-3 text-sm text-ink-muted">
              <span className="inline-flex items-center gap-2">
                {isSearching && <LiveDot />}
                Ride <span className="tnum font-bold text-ink">{shortRideId(activeRide.id)}</span>
              </span>
            </div>

            <div aria-live="polite">
              <h1 className="mt-2 text-3xl first-letter:uppercase">{status.title}</h1>
              {status.detail && <p className="mt-1.5 text-ink-muted">{status.detail}</p>}
            </div>

            <RideProgress status={activeRide.status} className="mt-6" />

            {driver ? (
              <section aria-label="Your driver" className="mt-6 flex items-center gap-3 rounded-2xl bg-surface shadow-card lg:bg-sunken lg:shadow-none p-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-tint text-lg font-extrabold text-brand-strong">
                  {driver.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-bold">
                    <span className="truncate">{driver.name}</span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-sm text-ink-muted">
                      <Star aria-hidden className="size-3.5 fill-star text-star" />
                      <span className="tnum">{Number(driver.rating).toFixed(1)}</span>
                      <span className="sr-only">rating</span>
                    </span>
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted">
                    <Plate>{driver.vehicleNumber}</Plate>
                    <span className="truncate">
                      {[driver.vehicleColor, driver.vehicleModel].filter(Boolean).join(' ')}
                    </span>
                  </p>
                </div>
              </section>
            ) : isSearching ? (
              <div className="mt-6 flex items-center gap-3 rounded-2xl bg-brand-tint p-4 text-sm font-semibold text-brand-strong">
                <Loader2 aria-hidden className="size-4 animate-spin" />
                Looking for drivers near {activeRide.pickup.address}…
              </div>
            ) : null}

            <RouteStops
              className="mt-8"
              from={<StopText label="Pickup" name={activeRide.pickup.address} />}
              to={<StopText label="Destination" name={activeRide.destination.address} />}
            />

            {activeRide.estimatedFare && (
              <dl className="mt-6 grid grid-cols-2 rounded-2xl bg-surface shadow-card lg:bg-sunken lg:shadow-none px-4">
                <div className="py-4">
                  <dt className="text-sm text-ink-muted">Estimated fare</dt>
                  <dd className="tnum text-2xl font-extrabold">₹{activeRide.estimatedFare}</dd>
                </div>
                <div className="border-l border-rule py-4 pl-4">
                  <dt className="text-sm text-ink-muted">Distance</dt>
                  <dd className="tnum text-2xl font-extrabold">
                    {activeRide.estimatedDistanceKm}
                    <span className="ml-1 text-base text-ink-muted">km</span>
                  </dd>
                </div>
              </dl>
            )}

            <div className="mt-6 space-y-3">
              {error && <Notice tone="danger" icon={<CircleAlert />}>{error}</Notice>}
              {canCancel ? (
                <ConfirmDialog
                  title="Cancel this ride?"
                  description={
                    driver
                      ? `${driver.name} is already assigned to you. You'll need to request again if you change your mind.`
                      : "We'll stop looking for a driver."
                  }
                  confirmLabel="Cancel ride"
                  cancelLabel="Keep ride"
                  onConfirm={() => cancelMutation.mutate(activeRide.id)}
                  trigger={
                    <Button variant="destructive" size="lg" className="w-full" disabled={cancelMutation.isPending}>
                      {cancelMutation.isPending ? (
                        <>
                          <Loader2 className="animate-spin" />
                          Cancelling…
                        </>
                      ) : (
                        'Cancel ride'
                      )}
                    </Button>
                  }
                />
              ) : (
                <p className="text-sm text-ink-muted">
                  Rides can’t be cancelled once your driver is at the pickup.
                </p>
              )}
            </div>
          </>
        }
      />
    </AppShell>
  );
}

function StopSelect({
  id,
  label,
  stop,
  myLocation,
  onChange,
  invalid,
}: {
  id: string;
  label: string;
  stop: Stop;
  myLocation: LatLng | null;
  onChange: (stop: Stop) => void;
  invalid?: boolean;
}) {
  const handleChange = (key: string) => {
    if (key === 'current' && myLocation) onChange({ key, ...myLocation, label: 'Current location' });
    else if (key !== 'map' && key !== 'current') onChange(placeStop(key));
  };
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs text-ink-muted">
        {label}
      </label>
      <NativeSelect
        id={id}
        value={stop.key}
        onChange={(e) => handleChange(e.target.value)}
        aria-invalid={invalid || undefined}
        className="h-12 text-lg font-extrabold"
        required
      >
        {myLocation && <option value="current">Current location</option>}
        {stop.key === 'map' && <option value="map">{stop.label} (on map)</option>}
        <optgroup label="IIT Roorkee stops">
          {CAMPUS_PLACES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </optgroup>
      </NativeSelect>
    </div>
  );
}

function FareQuote({ quote, loading, failed }: { quote?: FareEstimate; loading: boolean; failed: boolean }) {
  if (loading) return <Skeleton className="h-[4.5rem] w-full rounded-2xl" />;
  if (failed || !quote) {
    return failed ? (
      <p className="text-sm text-ink-muted">We couldn’t price this route right now. You’ll see the fare after you request.</p>
    ) : null;
  }
  return (
    <div className="rounded-2xl bg-surface px-4 py-3 shadow-card lg:bg-sunken lg:shadow-none">
      <div className="flex items-baseline justify-between gap-3">
        <p>
          <span className="sr-only">Estimated fare </span>
          <span className="tnum text-2xl font-extrabold">₹{quote.estimatedFare.toFixed(2)}</span>
        </p>
        <p className="tnum text-sm text-ink-muted">
          {quote.distanceKm.toFixed(1)} km{quote.durationMin != null && ` · ${Math.max(1, quote.durationMin)} min`}
        </p>
      </div>
      <p className="mt-0.5 text-xs text-ink-muted">
        {quote.source === 'road'
          ? 'Estimated for the road route shown on the map.'
          : 'Road route unavailable, so this is based on straight-line distance.'}
      </p>
    </div>
  );
}

function SheetSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your ride">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="mt-3 h-5 w-72 max-w-full" />
      <div className="mt-8 space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
      <Skeleton className="mt-8 h-14 w-full" />
    </div>
  );
}
