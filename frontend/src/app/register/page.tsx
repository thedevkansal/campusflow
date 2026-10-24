'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { RadioGroup } from '@base-ui/react/radio-group';
import { Radio } from '@base-ui/react/radio';
import { CircleAlert, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Field } from '@/components/ui/label';
import { AuthLayout } from '@/components/layout/auth-layout';
import { Notice } from '@/components/layout/app-shell';
import { Plate } from '@/components/ride/route-line';
import {
  api,
  getErrorMessage,
  refreshAccessToken,
  REFRESH_TOKEN_KEY,
  TOKEN_KEY,
  USER_KEY,
} from '@/lib/api';
import { useAuth } from '@/context/auth-context';

const ROLES = [
  { value: 'PASSENGER', title: 'Ride', body: 'Book rides between campus stops.' },
  { value: 'DRIVER', title: 'Drive', body: 'Give rides when you’re free.' },
] as const;

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'PASSENGER' | 'DRIVER'>('PASSENGER');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [error, setError] = useState('');

  const registerMutation = useMutation({
    mutationFn: async () => {
      // Step 1: Create account
      await api.post('/auth/register', { name, email, password, role });

      // Step 2: Login to get tokens
      const loginRes = await api.post('/auth/login', { email, password });
      const { accessToken, refreshToken, user: userData } = loginRes.data.data;

      // Persist tokens so subsequent calls use them
      localStorage.setItem(TOKEN_KEY, accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));

      if (role === 'DRIVER') {
        // Step 3: Register vehicle profile
        await api.post('/drivers/register', {
          vehicleNumber: vehicleNumber || 'KA01AB0000',
          vehicleModel: vehicleModel || undefined,
        });

        // Step 4: Refresh so the new access token includes driverId
        // (avoids a second /auth/login, which is rate limited per IP)
        const freshToken = await refreshAccessToken();
        if (!freshToken) throw new Error('Could not start your driver session');
        return {
          token: freshToken,
          refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY) ?? undefined,
          user: userData,
        };
      }

      return { token: accessToken, refreshToken, user: userData };
    },
    onSuccess: ({ token, refreshToken, user: userData }) => {
      login(token, userData, refreshToken);
      router.push(userData.role === 'DRIVER' ? '/driver' : '/dashboard');
    },
    onError: (err: any) => {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setError(getErrorMessage(err, err?.message || 'Registration failed. Please try again.'));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    registerMutation.mutate();
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Use your university email. You can ride or drive."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-bold text-brand-strong underline decoration-brand-tint-2 decoration-2 underline-offset-4 hover:decoration-brand">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <Notice tone="danger" icon={<CircleAlert />}>
            {error}
          </Notice>
        )}

        <fieldset>
          <legend className="mb-2 text-sm font-bold">I want to</legend>
          <RadioGroup
            value={role}
            onValueChange={(v) => setRole(v as 'PASSENGER' | 'DRIVER')}
            className="grid grid-cols-2 gap-3"
          >
            {ROLES.map((r) => (
              <label
                key={r.value}
                className="group relative flex cursor-pointer flex-col gap-1 rounded-lg border border-rule-control bg-surface p-4 transition-[border-color,box-shadow] duration-[120ms] hover:border-ink/60 has-[[data-checked]]:border-brand has-[[data-checked]]:bg-brand-tint/50 has-[[data-checked]]:shadow-[inset_0_0_0_1px_var(--brand)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring"
              >
                <span className="flex items-center justify-between">
                  <span id={`role-${r.value}`} className="font-display text-lg font-extrabold">{r.title}</span>
                  <Radio.Root
                    value={r.value}
                    aria-labelledby={`role-${r.value}`}
                    aria-describedby={`role-${r.value}-body`}
                    className="grid size-5 place-items-center rounded-full border-2 border-rule-control bg-surface outline-none data-[checked]:border-brand"
                  >
                    <Radio.Indicator className="size-2.5 rounded-full bg-brand" />
                  </Radio.Root>
                </span>
                <span id={`role-${r.value}-body`} className="text-sm text-ink-muted">{r.body}</span>
              </label>
            ))}
          </RadioGroup>
        </fieldset>

        <Field id="name" label="Full name">
          <Input
            id="name"
            placeholder="Aanya Rao"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
        </Field>

        <Field id="email" label="Email">
          <Input
            id="email"
            type="email"
            placeholder="you@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </Field>

        <Field id="password" label="Password" hint="At least 8 characters.">
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            aria-describedby="password-hint"
          />
        </Field>

        {role === 'DRIVER' && (
          <fieldset className="space-y-5 border-t border-rule pt-5">
            <legend className="sr-only">Vehicle</legend>
            <Field
              id="vehicleNumber"
              label="Vehicle number"
              hint={
                <span className="flex items-center gap-2">
                  Passengers will see
                  <Plate className="text-xs">{vehicleNumber || 'KA01AB1234'}</Plate>
                </span>
              }
            >
              <Input
                id="vehicleNumber"
                placeholder="KA01AB1234"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                required
                autoCapitalize="characters"
                className="font-display font-bold tracking-[0.06em]"
                aria-describedby="vehicleNumber-hint"
              />
            </Field>
            <Field id="vehicleModel" label="Vehicle model" optional>
              <Input
                id="vehicleModel"
                placeholder="Honda Activa"
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
              />
            </Field>
          </fieldset>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={registerMutation.isPending}>
          {registerMutation.isPending ? (
            <>
              <Loader2 className="animate-spin" />
              Creating account…
            </>
          ) : (
            'Create account'
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
