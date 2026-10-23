'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowUpDown, CircleAlert, CircleCheck, Loader2, Star, WifiOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { AppShell, MapLayout, Notice } from '@/components/layout/app-shell';
import { RouteStops, StopText, RideProgress, LiveDot, Plate } from '@/components/ride/route-line';
import { Map } from '@/components/map';
import { api, getErrorMessage } from '@/lib/api';
import { useSocket } from '@/context/socket-context';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { ENDED_STATUSES, PASSENGER_STATUS, shortRideId } from '@/lib/ride-status';

// Campus pickup / drop-off points. Ride requests send these real coordinates so
// matching, fare estimates and the map all reflect the chosen route.
const CAMPUS_PLACES = [
  { id: 'main-gate', name: 'Main Gate', lat: 12.9716, lng: 77.5946 },
  { id: 'library', name: 'Library', lat: 12.978, lng: 77.598 },
  { id: 'academic-block', name: 'Academic Block', lat: 12.9748, lng: 77.5962 },
  { id: 'hostels', name: 'Hostels', lat: 12.9695, lng: 77.5992 },
  { id: 'sports-complex', name: 'Sports Complex', lat: 12.9762, lng: 77.5918 },
  { id: 'cafeteria', name: 'Cafeteria', lat: 12.9731, lng: 77.5975 },
] as const;

// Matches PASSENGER_CANCELLABLE_STATUSES in backend rides.repository.ts
// (docs/RIDE_STATE_MACHINE.md: passengers cannot cancel once the driver is ARRIVING)
const PASSENGER_CANCELLABLE = ['REQUESTED', 'SEARCHING', 'ASSIGNED', 'ACCEPTED'];
const SEARCHING = ['REQUESTED', 'SEARCHING'];

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { passengerSocket } = useSocket();
  const [pickupId, setPickupId] = useState<string>(CAMPUS_PLACES[0].id);
  const [destId, setDestId] = useState<string>(CAMPUS_PLACES[1].id);
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

  useEffect(() => {
    if (activeRide?.id) setLastRideId(activeRide.id);
  }, [activeRide?.id]);

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

  // Create Ride
  const createMutation = useMutation({
    mutationFn: async () => {
      const pickup = CAMPUS_PLACES.find((p) => p.id === pickupId)!;
      const dest = CAMPUS_PLACES.find((p) => p.id === destId)!;
      const payload = {
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        pickupAddress: pickup.name,
        destLat: dest.lat,
        destLng: dest.lng,
        destAddress: dest.name,
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
    if (pickupId === destId) {
      setError('Pickup and destination must be different');
      return;
    }
    setError('');
    createMutation.mutate();
  };

  const swapStops = () => {
    setPickupId(destId);
    setDestId(pickupId);
    setError('');
  };

  const canCancel = activeRide && PASSENGER_CANCELLABLE.includes(activeRide.status);
  const sameStop = pickupId === destId;
  const pickupPlace = CAMPUS_PLACES.find((p) => p.id === pickupId)!;
  const destPlace = CAMPUS_PLACES.find((p) => p.id === destId)!;

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
              pickup={{ lat: pickupPlace.lat, lng: pickupPlace.lng, label: pickupPlace.name }}
              destination={sameStop ? undefined : { lat: destPlace.lat, lng: destPlace.lng, label: destPlace.name }}
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
              <p className="mt-2 text-ink-muted">Pick two campus stops and we’ll match you with the nearest driver.</p>

              <form onSubmit={handleRequestRide} className="mt-8" noValidate>
                <RouteStops
                  variant="control"
                  from={<StopSelect id="pickup" label="From" value={pickupId} onChange={setPickupId} />}
                  to={
                    <StopSelect
                      id="destination"
                      label="To"
                      value={destId}
                      onChange={setDestId}
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

                <div aria-live="polite" className="mt-4 min-h-0">
                  {sameStop ? (
                    <p className="text-sm text-danger">Choose a destination that’s different from your pickup.</p>
                  ) : error ? (
                    <Notice tone="danger" icon={<CircleAlert />}>{error}</Notice>
                  ) : null}
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
              <section aria-label="Your driver" className="mt-8 flex items-center gap-3 rounded-xl border border-rule bg-surface p-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-ink font-display text-lg font-extrabold text-paper">
                  {driver.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-bold">
                    <span className="truncate">{driver.name}</span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-sm text-ink-muted">
                      <Star aria-hidden className="size-3.5 fill-signal text-signal-edge" />
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
              <div className="mt-8 flex items-center gap-3 rounded-xl border border-dashed border-rule-control p-4 text-sm text-ink-muted">
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
              <dl className="mt-8 grid grid-cols-2 border-y border-rule">
                <div className="py-4">
                  <dt className="text-sm text-ink-muted">Estimated fare</dt>
                  <dd className="tnum font-display text-2xl font-extrabold">₹{activeRide.estimatedFare}</dd>
                </div>
                <div className="border-l border-rule py-4 pl-4">
                  <dt className="text-sm text-ink-muted">Distance</dt>
                  <dd className="tnum font-display text-2xl font-extrabold">
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
  value,
  onChange,
  invalid,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs text-ink-muted">
        {label}
      </label>
      <NativeSelect
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid || undefined}
        className="h-12 font-display text-lg font-extrabold"
        required
      >
        {CAMPUS_PLACES.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </NativeSelect>
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
