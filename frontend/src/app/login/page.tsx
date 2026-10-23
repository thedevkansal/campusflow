'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { CircleAlert, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Field } from '@/components/ui/label';
import { AuthLayout } from '@/components/layout/auth-layout';
import { Notice } from '@/components/layout/app-shell';
import { api, getErrorMessage } from '@/lib/api';
import { useAuth } from '@/context/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const loginMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/auth/login', { email, password });
      return response.data.data;
    },
    onSuccess: (data) => {
      login(data.accessToken, data.user, data.refreshToken);
      if (data.user.role === 'DRIVER') {
        router.push('/driver');
      } else {
        router.push('/dashboard');
      }
    },
    onError: (err: any) => {
      setError(getErrorMessage(err, 'Login failed. Please check your credentials.'));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    loginMutation.mutate();
  };

  return (
    <AuthLayout
      title="Log in"
      subtitle="Passengers and drivers use the same account."
      footer={
        <>
          New to CampusFlow?{' '}
          <Link href="/register" className="font-bold text-ink underline decoration-rule-control underline-offset-4 hover:decoration-ink">
            Create an account
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

        <Field id="email" label="Email">
          <Input
            id="email"
            type="email"
            placeholder="you@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            aria-invalid={!!error || undefined}
          />
        </Field>

        <Field id="password" label="Password">
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            aria-invalid={!!error || undefined}
          />
        </Field>

        <Button type="submit" size="lg" className="w-full" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? (
            <>
              <Loader2 className="animate-spin" />
              Logging in…
            </>
          ) : (
            'Log in'
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
