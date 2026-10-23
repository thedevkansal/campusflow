'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CircleAlert, Loader2, LogOut, Pencil, Star } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { AppShell, Notice } from '@/components/layout/app-shell';
import { Plate } from '@/components/ride/route-line';
import { api } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileData {
  id: string;
  name: string;
  email: string;
  role: 'PASSENGER' | 'DRIVER' | 'ADMIN';
  averageRating?: string;
  totalRatings?: number;
  totalRides?: number;
  createdAt: string;
  driverId?: string;
}

interface DriverProfile {
  id: string;
  vehicleNumber: string;
  vehicleModel: string | null;
  vehicleColor: string | null;
  rating: string;
  totalRatings: number;
  status: string;
  isVerified: boolean;
}

interface EditDriverForm {
  vehicleNumber: string;
  vehicleModel: string;
  vehicleColor: string;
}

const ROLE_LABEL = { PASSENGER: 'Passenger', DRIVER: 'Driver', ADMIN: 'Admin' } as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { logout, role, isAuthenticated, isLoading: authLoading } = useAuth();

  const [isEditingVehicle, setIsEditingVehicle] = useState(false);
  const [vehicleForm, setVehicleForm] = useState<EditDriverForm>({
    vehicleNumber: '',
    vehicleModel: '',
    vehicleColor: '',
  });

  // Guard: redirect to login if not authenticated (after hydration completes).
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // ── Data fetching ──────────────────────────────────────────────────────────
  // Uses dedicated query keys (profile:auth, profile:driver) to avoid
  // conflicting with the dashboard's ['activeRide'] or ['driverProfile'] keys.

  const {
    data: profile,
    isLoading: isProfileLoading,
    isError: isProfileError,
  } = useQuery<ProfileData>({
    queryKey: ['profile:auth'],
    queryFn: async () => {
      const res = await api.get('/auth/profile');
      return res.data.data;
    },
    enabled: !authLoading && isAuthenticated,
    retry: false,
    staleTime: 60_000,
  });

  const {
    data: driverProfile,
    isLoading: isDriverLoading,
  } = useQuery<DriverProfile>({
    queryKey: ['profile:driver'],
    queryFn: async () => {
      const res = await api.get('/drivers/profile');
      return res.data.data;
    },
    enabled: !authLoading && isAuthenticated && role === 'DRIVER',
    retry: false,
    staleTime: 60_000,
  });

  // ── Vehicle edit mutation ──────────────────────────────────────────────────

  const updateVehicleMutation = useMutation({
    mutationFn: async (data: Partial<EditDriverForm>) => {
      const res = await api.patch('/drivers/profile', data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile:driver'] });
      setIsEditingVehicle(false);
      toast.success('Vehicle details saved');
    },
  });

  const handleStartEdit = () => {
    if (driverProfile) {
      setVehicleForm({
        vehicleNumber: driverProfile.vehicleNumber,
        vehicleModel: driverProfile.vehicleModel ?? '',
        vehicleColor: driverProfile.vehicleColor ?? '',
      });
    }
    updateVehicleMutation.reset();
    setIsEditingVehicle(true);
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // ── Loading / error / auth states ─────────────────────────────────────────

  if (authLoading || isProfileLoading) {
    return (
      <AppShell>
        <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6" aria-busy="true" aria-label="Loading profile">
          <div className="flex items-center gap-4">
            <Skeleton className="size-16 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </div>
          </div>
          <Skeleton className="mt-10 h-24 w-full" />
          <Skeleton className="mt-8 h-40 w-full" />
        </div>
      </AppShell>
    );
  }

  if (isProfileError || !profile) {
    return (
      <AppShell className="items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm text-center">
          <CircleAlert aria-hidden className="mx-auto size-6 text-danger" />
          <h1 className="mt-4 text-2xl">We couldn’t load your profile</h1>
          <p className="mt-2 text-ink-muted">Check your connection and try again.</p>
          <Button
            variant="outline"
            className="mt-6"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['profile:auth'] })}
          >
            Try again
          </Button>
        </div>
      </AppShell>
    );
  }

  // ── Derived values ────────────────────────────────────────────────────────

  const memberSince = profile.createdAt ? format(new Date(profile.createdAt), 'MMMM yyyy') : null;

  const displayRating =
    role === 'DRIVER' && driverProfile
      ? parseFloat(driverProfile.rating).toFixed(1)
      : profile.averageRating
      ? parseFloat(profile.averageRating).toFixed(1)
      : '5.0';

  const displayTotalRatings =
    role === 'DRIVER' && driverProfile
      ? driverProfile.totalRatings
      : (profile.totalRatings ?? 0);

  const displayName =
    profile.name || profile.email?.split('@')[0] || 'User';
  const initials = displayName
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const vehicleError = (updateVehicleMutation.error as any)?.response?.data?.message;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Identity */}
        <header className="flex items-center gap-4 sm:gap-5">
          <span className="grid size-16 shrink-0 place-items-center rounded-full bg-ink font-display text-2xl font-extrabold text-paper">
            {initials}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-3xl sm:text-4xl">{displayName}</h1>
            <p className="mt-1 text-ink-muted">
              {ROLE_LABEL[profile.role]}
              {memberSince && <>, joined {memberSince}</>}
            </p>
          </div>
        </header>

        {/* Stats: plain numbers on a rule, not tiles */}
        <dl className="mt-10 grid grid-cols-2 border-y border-rule">
          <div className="py-5 pr-4">
            <dt className="text-sm text-ink-muted">Rating</dt>
            <dd className="mt-1 flex items-baseline gap-2">
              <span className="tnum font-display text-3xl font-extrabold">{displayRating}</span>
              <Star aria-hidden className="size-4 translate-y-[-2px] fill-signal text-signal-edge" />
              <span className="text-sm text-ink-muted">
                from {displayTotalRatings} {displayTotalRatings === 1 ? 'rating' : 'ratings'}
              </span>
            </dd>
          </div>
          <div className="border-l border-rule py-5 pl-4 sm:pl-6">
            <dt className="text-sm text-ink-muted">Rides</dt>
            <dd className="tnum mt-1 font-display text-3xl font-extrabold">{profile.totalRides ?? 0}</dd>
          </div>
        </dl>

        {/* Account */}
        <section aria-labelledby="account" className="mt-10">
          <h2 id="account" className="text-xl">Account</h2>
          <dl className="mt-4 divide-y divide-rule rounded-xl border border-rule bg-surface">
            <InfoRow label="Name" value={profile.name} />
            <InfoRow label="Email" value={profile.email} />
            <InfoRow label="Account type" value={ROLE_LABEL[profile.role]} />
          </dl>
        </section>

        {/* Vehicle */}
        {role === 'DRIVER' && (
          <section aria-labelledby="vehicle" className="mt-10">
            <div className="flex items-center justify-between gap-4">
              <h2 id="vehicle" className="text-xl">Vehicle</h2>
              {!isEditingVehicle && driverProfile && (
                <Button variant="ghost" size="sm" onClick={handleStartEdit}>
                  <Pencil />
                  Edit
                </Button>
              )}
            </div>

            <div className="mt-4 rounded-xl border border-rule bg-surface p-5">
              {isDriverLoading ? (
                <div className="space-y-3" aria-busy="true">
                  <Skeleton className="h-8 w-40" />
                  <Skeleton className="h-4 w-56" />
                </div>
              ) : !driverProfile ? (
                <p className="text-ink-muted">No vehicle on file yet.</p>
              ) : isEditingVehicle ? (
                <form
                  className="space-y-5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    updateVehicleMutation.mutate({
                      vehicleNumber: vehicleForm.vehicleNumber || undefined,
                      vehicleModel: vehicleForm.vehicleModel || undefined,
                      vehicleColor: vehicleForm.vehicleColor || undefined,
                    });
                  }}
                >
                  {vehicleError && (
                    <Notice tone="danger" icon={<CircleAlert />}>
                      {Array.isArray(vehicleError) ? vehicleError.join(', ') : vehicleError}
                    </Notice>
                  )}
                  <Field id="vehicleNumber" label="Vehicle number">
                    <Input
                      id="vehicleNumber"
                      value={vehicleForm.vehicleNumber}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleNumber: e.target.value.toUpperCase() })}
                      className="font-display font-bold tracking-[0.06em]"
                    />
                  </Field>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field id="vehicleModel" label="Model" optional>
                      <Input
                        id="vehicleModel"
                        value={vehicleForm.vehicleModel}
                        placeholder="Honda Activa"
                        onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleModel: e.target.value })}
                      />
                    </Field>
                    <Field id="vehicleColor" label="Colour" optional>
                      <Input
                        id="vehicleColor"
                        value={vehicleForm.vehicleColor}
                        placeholder="Grey"
                        onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleColor: e.target.value })}
                      />
                    </Field>
                  </div>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditingVehicle(false)}
                      disabled={updateVehicleMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateVehicleMutation.isPending}>
                      {updateVehicleMutation.isPending && <Loader2 className="animate-spin" />}
                      Save vehicle
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                  <Plate className="text-lg">{driverProfile.vehicleNumber}</Plate>
                  <p className="text-ink-muted">
                    {[driverProfile.vehicleColor, driverProfile.vehicleModel].filter(Boolean).join(' ') ||
                      'Add your model and colour so passengers can spot you.'}
                  </p>
                  <div className="flex w-full flex-wrap gap-2 border-t border-rule pt-4">
                    <StatusPill tone={driverProfile.isVerified ? 'success' : 'caution'}>
                      {driverProfile.isVerified ? 'Verified' : 'Not verified yet'}
                    </StatusPill>
                    <StatusPill tone={driverProfile.status === 'ONLINE' ? 'success' : 'neutral'}>
                      {driverProfile.status === 'ONLINE'
                        ? 'Online'
                        : driverProfile.status.charAt(0) + driverProfile.status.slice(1).toLowerCase().replace(/_/g, ' ')}
                    </StatusPill>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        <div className="mt-12 border-t border-rule pt-6">
          <Button variant="destructive" onClick={handleLogout}>
            <LogOut />
            Log out
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="grid gap-1 px-5 py-4 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="min-w-0 truncate font-bold">{value ?? '—'}</dd>
    </div>
  );
}

function StatusPill({ tone, children }: { tone: 'success' | 'caution' | 'neutral'; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-bold',
        tone === 'success' && 'bg-success-tint text-success',
        tone === 'caution' && 'bg-signal-tint text-caution-ink',
        tone === 'neutral' && 'bg-sunken text-ink-muted'
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
