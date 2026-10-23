'use client';

import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Car, Check, CheckCheck, CircleCheck, Loader2, Navigation } from 'lucide-react';
import { formatDistanceToNow, isToday } from 'date-fns';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { AppShell } from '@/components/layout/app-shell';
import { api } from '@/lib/api';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

const TYPE_ICON: Record<string, React.ElementType> = {
  RIDE_ASSIGNED: Car,
  RIDE_ACCEPTED: Navigation,
  RIDE_COMPLETED: CircleCheck,
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { isLoading: authLoading, role } = useRequireAuth();

  // GET /notifications → { success, data: { data: Notification[], total: number } }
  // res.data.data = { data: Notification[], total: number }
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications');
      return res.data.data; // { data: Notification[], total: number }
    },
    enabled: !authLoading,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.patch('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
  });

  // data = { data: Notification[], total: number }
  const notifications: Notification[] = data?.data ?? [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const groups = [
    { label: 'Today', items: notifications.filter((n) => isToday(new Date(n.createdAt))) },
    { label: 'Earlier', items: notifications.filter((n) => !isToday(new Date(n.createdAt))) },
  ].filter((g) => g.items.length > 0);
  const loading = authLoading || isLoading;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl">Notifications</h1>
            <p className="mt-1 text-ink-muted" aria-live="polite">
              {loading ? ' ' : unreadCount > 0 ? `${unreadCount} unread` : 'You’re all caught up.'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              {markAllReadMutation.isPending ? <Loader2 className="animate-spin" /> : <CheckCheck />}
              Mark all as read
            </Button>
          )}
        </div>

        {loading ? (
          <ul className="mt-8 divide-y divide-rule border-y border-rule" aria-busy="true" aria-label="Loading notifications">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="flex gap-4 py-5">
                <Skeleton className="size-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              </li>
            ))}
          </ul>
        ) : notifications.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed border-rule-control px-6 py-14 text-center">
            <Bell aria-hidden className="mx-auto size-6 text-ink-muted" />
            <h2 className="mt-4 text-xl">No notifications yet</h2>
            <p className="mx-auto mt-2 max-w-[36ch] text-ink-muted">
              Updates about your rides, like a driver accepting or a ride finishing, show up here.
            </p>
            <Link
              href={role === 'DRIVER' ? '/driver' : '/dashboard'}
              className={cn(buttonVariants({ variant: 'outline' }), 'mt-6')}
            >
              {role === 'DRIVER' ? 'Go to Drive' : 'Book a ride'}
            </Link>
          </div>
        ) : (
          groups.map((group) => (
            <section key={group.label} aria-labelledby={`group-${group.label}`} className="mt-10">
              <h2 id={`group-${group.label}`} className="font-sans text-sm font-bold tracking-normal text-ink-muted">
                {group.label}
              </h2>
              <ul className="mt-3 divide-y divide-rule border-y border-rule">
                {group.items.map((n) => {
                  const Icon = TYPE_ICON[n.type] ?? Bell;
                  return (
                    <li key={n.id} className="relative flex gap-4 py-5 pr-1">
                      {!n.isRead && (
                        <span aria-hidden className="absolute top-5 bottom-5 -left-4 w-1 rounded-r-full bg-signal sm:-left-6" />
                      )}
                      <span
                        aria-hidden
                        className={cn(
                          'grid size-9 shrink-0 place-items-center rounded-full',
                          n.isRead ? 'bg-sunken text-ink-muted' : 'bg-ink text-paper'
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <h3
                            className={cn('font-sans text-base font-bold tracking-normal', n.isRead ? 'text-ink-muted' : 'text-ink')}
                          >
                            {!n.isRead && <span className="sr-only">Unread: </span>}
                            {n.title}
                          </h3>
                          <time dateTime={n.createdAt} className="shrink-0 text-sm text-ink-muted">
                            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                          </time>
                        </div>
                        <p className={cn('mt-0.5', n.isRead ? 'text-ink-muted' : 'text-ink')}>{n.body}</p>
                      </div>
                      {!n.isRead && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => markReadMutation.mutate(n.id)}
                          disabled={markReadMutation.isPending && markReadMutation.variables === n.id}
                          aria-label={`Mark “${n.title}” as read`}
                          className="-mt-1 shrink-0"
                        >
                          {markReadMutation.isPending && markReadMutation.variables === n.id ? (
                            <Loader2 className="animate-spin" />
                          ) : (
                            <Check />
                          )}
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>
    </AppShell>
  );
}
