'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleAlert, Loader2, Power, Star, WifiOff } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { AppShell, MapLayout, Notice } from '@/components/layout/app-shell';
import { RouteStops, StopText, RideProgress, LiveDot, Plate } from '@/components/ride/route-line';
import { Map } from '@/components/map';
import { api, getErrorMessage } from '@/lib/api';
import { useSocket } from '@/context/socket-context';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { DRIVER_STATUS, shortRideId } from '@/lib/ride-status';
import { CAMPUS_CENTER } from '@/lib/campus';
import { cn } from '@/lib/utils';

// Campus center fallback for when geolocation is unavailable
const CAMPUS_LAT = CAMPUS_CENTER.lat;
const CAMPUS_LNG = CAMPUS_CENTER.lng;

// The one next step for each status. Labels match the toast that confirms them.
const NEXT_ACTION: Record<string, { action: string; label: string; done: string }> = {
  ASSIGNED: { action: 'accept', label: 'Accept ride', done: 'Ride accepted' },
  ACCEPTED: { action: 'arrive', label: 'I’ve arrived', done: 'Marked as arrived' },
  ARRIVING: { action: 'start', label: 'Start ride', done: 'Ride started' },
  IN_PROGRESS: { action: 'complete', label: 'Complete ride', done: 'Ride completed' },
};

function getGeolocation(): Promise<{ latitude: number; longitude: number; heading: number; speed: number }> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ latitude: CAMPUS_LAT, longitude: CAMPUS_LNG, heading: 0, speed: 0 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          heading: pos.coords.heading ?? 0,
          // Geolocation API returns speed in m/s; convert to km/h
          speed: pos.coords.speed != null ? pos.coords.speed * 3.6 : 0,
        });
      },
      () => {
        // Fallback to campus coordinates on permission denied / error
        resolve({ latitude: CAMPUS_LAT, longitude: CAMPUS_LNG, heading: 0, speed: 0 });
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  });
}

export default function DriverDashboardPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { driverSocket } = useSocket();
  const [isOnline, setIsOnline] = useState(false);
  const [error, setError] = useState('');
  const [socketError, setSocketError] = useState('');
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { isLoading: authLoading } = useRequireAuth('DRIVER');

  // Fetch driver profile — checks if driver profile exists and gets current status
  const { data: driverProfile, isLoading: isProfileLoading, error: profileError } = useQuery({
    queryKey: ['driverProfile'],
    queryFn: async () => {
      const res = await api.get('/drivers/profile');
      return res.data.data;
    },
    enabled: !authLoading,
    retry: false,
  });

  // Fetch active ride — uses driver-specific endpoint (DRIVER role)
  // Returns null on 404 so React Query clears stale data after ride completion
  const { data: activeRide, isLoading: isRideLoading } = useQuery({
    queryKey: ['activeRide'],
    queryFn: async () => {
      try {
        const res = await api.get('/rides/driver-active');
        return res.data.data ?? null;
      } catch (err: any) {
        if (err?.response?.status === 404) return null;
        throw err;
      }
    },
    enabled: !authLoading && !!driverProfile,
    retry: (count, err: any) => err?.response?.status !== 404 && count < 2,
  });

  // Sync online state from profile
  useEffect(() => {
    if (driverProfile?.status === 'ONLINE') {
      setIsOnline(true);
    }
  }, [driverProfile]);

  // Attach event listeners to the shared socket from SocketProvider.
  // Do NOT connect/disconnect here — SocketProvider manages the connection lifecycle.
  useEffect(() => {
    const socket = driverSocket;
    if (!socket || !driverProfile) return;

    const onConnectError = (err: Error) => setSocketError(err.message);
    const onConnect = () => {
      setSocketError('');
      socket.emit('session:restore', {
        lastEventTimestamp: new Date(Date.now() - 3600000).toISOString(),
      });
    };
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['activeRide'] });

    socket.on('connect_error', onConnectError);
    socket.on('connect', onConnect);
    socket.on('ride_assigned', invalidate);
    socket.on('ride_cancelled', invalidate);
    socket.on('ride_completed', invalidate);
    socket.on('ride_updated', invalidate);

    if (socket.connected) {
      socket.emit('session:restore', {
        lastEventTimestamp: new Date(Date.now() - 3600000).toISOString(),
      });
    }

    return () => {
      socket.off('connect_error', onConnectError);
      socket.off('connect', onConnect);
      socket.off('ride_assigned', invalidate);
      socket.off('ride_cancelled', invalidate);
      socket.off('ride_completed', invalidate);
      socket.off('ride_updated', invalidate);
    };
  }, [driverSocket, driverProfile, queryClient]);

  // Location streaming — uses Geolocation API with campus fallback
  // Re-runs when the socket instance changes so the interval never holds a
  // stale (null or replaced) socket reference.
  useEffect(() => {
    if (!isOnline || !driverSocket) {
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
      return;
    }

    const emitLocation = async () => {
      try {
        if (!driverSocket?.connected) return;
        const loc = await getGeolocation();
        driverSocket.emit('driver:location', {
          ...loc,
          timestamp: new Date().toISOString(),
        });
      } catch {
        // Socket might not be ready yet; skip this tick
      }
    };

    emitLocation();
    locationIntervalRef.current = setInterval(emitLocation, 2000);

    return () => {
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
    };
  }, [isOnline, driverSocket]);

  // Online toggle
  const toggleOnlineMutation = useMutation({
    mutationFn: async (goOnline: boolean) => {
      if (goOnline) {
        // Send our position so matching can find us before the first heartbeat.
        const { latitude, longitude } = await getGeolocation();
        await api.post('/drivers/online', { latitude, longitude });
      } else {
        await api.post('/drivers/offline');
      }
      return goOnline;
    },
    onSuccess: (goOnline) => {
      setIsOnline(goOnline);
      setError('');
      toast.success(goOnline ? 'You’re online' : 'You’re offline');
    },
    onError: (err: any) => {
      setError(getErrorMessage(err, 'Failed to update status'));
    },
  });

  // Ride lifecycle actions
  const actionMutation = useMutation({
    mutationFn: async ({ action, rideId }: { action: string; rideId: string }) => {
      let endpoint = `/rides/${rideId}/${action}`;
      let payload: Record<string, unknown> = {};

      if (action === 'cancel-driver') {
        payload = { reasonCode: 'NOT_AVAILABLE' };
      }

      const res = await api.post(endpoint, payload);
      return res.data.data;
    },
    onSuccess: (_data, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['activeRide'] });
      // The backend returns the driver to ONLINE after a ride ends; re-read it
      // so the availability card doesn't claim the driver is offline.
      queryClient.invalidateQueries({ queryKey: ['driverProfile'] });
      setError('');
      const done =
        action === 'cancel-driver'
          ? 'Ride declined'
          : Object.values(NEXT_ACTION).find((a) => a.action === action)?.done;
      if (done) toast.success(done);
    },
    onError: (err: any) => {
      setError(getErrorMessage(err, 'Action failed'));
    },
  });

  if (authLoading || isProfileLoading) {
    return (
      <AppShell>
        <MapLayout hideMapOnMobile map={<Skeleton className="size-full rounded-none" />} sheet={<DriverSkeleton />} />
      </AppShell>
    );
  }

  // Driver profile not found — prompt to set up
  const profileNotFound = (profileError as any)?.response?.status === 404;
  if (profileNotFound || (!driverProfile && !isProfileLoading)) {
    return (
      <AppShell className="items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <h1 className="text-3xl">Add your vehicle to start driving</h1>
          <p className="mt-3 text-ink-muted">
            Your account doesn’t have a driver profile yet. Register as a driver with your vehicle number so
            passengers can recognise you.
          </p>
          <Link href="/register" className={cn(buttonVariants({ size: 'lg' }), 'mt-8')}>
            Register as a driver
          </Link>
        </div>
      </AppShell>
    );
  }

  const next = activeRide ? NEXT_ACTION[activeRide.status] : undefined;
  const isPending = actionMutation.isPending;
  const rideStatus = activeRide
    ? DRIVER_STATUS[activeRide.status] ?? { title: activeRide.status.replace(/_/g, ' ').toLowerCase(), detail: '' }
    : null;

  const sheet = (
    <>
      {socketError && (
        <Notice icon={<WifiOff />} className="mb-5">
          <p className="font-bold">Live updates paused</p>
          <p>New requests may not appear until we reconnect. ({socketError})</p>
        </Notice>
      )}

      {/* Availability. While a ride is active it collapses to a status strip. */}
      {activeRide ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-success-tint px-4 py-3 text-sm text-success">
          <LiveDot tone="success" />
          <span className="font-bold">On a ride</span>
          <span className="ml-auto flex items-center gap-2 text-ink-muted">
            <Plate>{driverProfile.vehicleNumber}</Plate>
          </span>
        </div>
      ) : (
        <section
          aria-labelledby="availability"
          className={cn('rounded-3xl p-5 transition-colors', isOnline ? 'bg-success-tint' : 'bg-surface shadow-card lg:bg-sunken lg:shadow-none')}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="availability" className="flex items-center gap-2.5 text-xl">
                <LiveDot tone={isOnline ? 'success' : 'idle'} />
                {isOnline ? 'You’re online' : 'You’re offline'}
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                {isOnline
                  ? 'New ride requests near you will appear here.'
                  : 'Go online when you’re ready to take rides.'}
              </p>
            </div>
          </div>
          <Button
            size="lg"
            variant={isOnline ? 'outline' : 'default'}
            className="mt-4 w-full"
            aria-pressed={isOnline}
            onClick={() => toggleOnlineMutation.mutate(!isOnline)}
            disabled={toggleOnlineMutation.isPending}
          >
            {toggleOnlineMutation.isPending ? <Loader2 className="animate-spin" /> : <Power />}
            {isOnline ? 'Go offline' : 'Go online'}
          </Button>
  
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-rule pt-4 text-sm text-ink-muted">
            <Plate>{driverProfile.vehicleNumber}</Plate>
            {driverProfile.vehicleModel && <span>{driverProfile.vehicleModel}</span>}
            {driverProfile.rating && (
              <span className="ml-auto inline-flex items-center gap-1">
                <Star aria-hidden className="size-3.5 fill-star text-star" />
                <span className="tnum font-bold text-ink">{Number(driverProfile.rating).toFixed(1)}</span>
                <span className="sr-only">rating</span>
              </span>
            )}
          </div>
        </section>
      )}

      {error && (
        <Notice tone="danger" icon={<CircleAlert />} className="mt-4">
          {error}
        </Notice>
      )}

      {/* Current ride */}
      <section aria-label="Current ride" className="mt-8">
        {isRideLoading ? (
          <div className="space-y-4" aria-busy="true">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : !activeRide ? (
          <div className="py-6">
            <h2 className="flex items-center gap-2.5 text-2xl">
              {isOnline && <LiveDot />}
              {isOnline ? 'Waiting for a request' : 'No ride right now'}
            </h2>
            <p className="mt-2 text-ink-muted">
              {isOnline
                ? 'Keep this screen open. You’ll see the pickup and destination before you accept.'
                : 'Rides are only offered while you’re online.'}
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-ink-muted">
              Ride <span className="tnum font-bold text-ink">{shortRideId(activeRide.id)}</span>
            </p>
            <div aria-live="polite">
              <h2 className="mt-1 text-3xl first-letter:uppercase">{rideStatus!.title}</h2>
              {rideStatus!.detail && <p className="mt-1.5 text-ink-muted">{rideStatus!.detail}</p>}
            </div>

            <RideProgress status={activeRide.status} className="mt-6" />

            <div className="mt-6 flex items-center gap-3 rounded-2xl bg-surface shadow-card lg:bg-sunken lg:shadow-none p-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-tint text-lg font-extrabold text-brand-strong">
                {(activeRide.passengerName ?? 'P').charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{activeRide.passengerName || 'Passenger'}</p>
                <p className="text-sm text-ink-muted">Passenger</p>
              </div>
              {activeRide.estimatedFare && (
                <div className="text-right">
                  <p className="text-sm text-ink-muted">Est. fare</p>
                  <p className="tnum text-xl font-extrabold">₹{activeRide.estimatedFare}</p>
                </div>
              )}
            </div>

            <RouteStops
              className="mt-8"
              from={<StopText label="Pickup" name={activeRide.pickup.address} />}
              to={<StopText label="Destination" name={activeRide.destination.address} />}
            />

            {/* Thumb-zone action: sticks to the bottom of the screen on mobile */}
            {next && (
              <div className="sticky bottom-0 z-20 -mx-4 mt-8 border-t border-rule bg-paper px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:border-0 lg:p-0">
                <div className="flex gap-3">
                  <Button
                    size="xl"
                    className="flex-1"
                    onClick={() => actionMutation.mutate({ action: next.action, rideId: activeRide.id })}
                    disabled={isPending}
                  >
                    {isPending && <Loader2 className="size-5 animate-spin" />}
                    {next.label}
                  </Button>
                  {activeRide.status === 'ASSIGNED' && (
                    <ConfirmDialog
                      title="Decline this ride?"
                      description="We’ll offer it to another driver."
                      confirmLabel="Decline ride"
                      cancelLabel="Go back"
                      onConfirm={() => actionMutation.mutate({ action: 'cancel-driver', rideId: activeRide.id })}
                      trigger={
                        <Button variant="outline" size="xl" disabled={isPending}>
                          Decline
                        </Button>
                      }
                    />
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );

  return (
    <AppShell>
      <MapLayout
        hideMapOnMobile={!activeRide}
        map={
          <Map
            className="size-full"
            pickup={
              activeRide
                ? {
                    lat: parseFloat(activeRide.pickup.lat),
                    lng: parseFloat(activeRide.pickup.lng),
                    label: activeRide.pickup.address || 'Pickup',
                  }
                : undefined
            }
            destination={
              activeRide
                ? {
                    lat: parseFloat(activeRide.destination.lat),
                    lng: parseFloat(activeRide.destination.lng),
                    label: activeRide.destination.address || 'Destination',
                  }
                : undefined
            }
          />
        }
        sheet={sheet}
      />
    </AppShell>
  );
}

function DriverSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading driver dashboard">
      <Skeleton className="h-44 w-full rounded-xl" />
      <Skeleton className="mt-8 h-8 w-56" />
      <Skeleton className="mt-3 h-4 w-72 max-w-full" />
    </div>
  );
}
