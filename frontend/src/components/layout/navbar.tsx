'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Bell, LogOut, UserRound } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Logo } from '@/components/brand/logo';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface NotificationLite {
  isRead: boolean;
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, role, logout } = useAuth();

  // Shares the notifications page's query, so the badge and list stay in sync.
  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications');
      return res.data.data;
    },
    enabled: isAuthenticated,
  });
  const unread = ((notifications?.data ?? []) as NotificationLite[]).filter((n) => !n.isRead).length;

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const home = role === 'DRIVER' ? '/driver' : '/dashboard';
  const navLinks = isAuthenticated
    ? [
        { href: home, label: role === 'DRIVER' ? 'Drive' : 'Ride' },
        { href: '/notifications', label: 'Notifications' },
      ]
    : [];

  const displayName = user?.name || user?.email?.split('@')[0] || 'Me';
  const initials = displayName
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-rule bg-paper">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link
            href={isAuthenticated ? home : '/'}
            className="rounded-md text-ink"
            aria-label="CampusFlow home"
          >
            <Logo />
          </Link>

          {navLinks.length > 0 && (
            <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
              {navLinks.map(({ href, label }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative inline-flex h-14 items-center gap-2 px-3 text-sm font-bold transition-colors',
                      active ? 'text-ink' : 'text-ink-muted hover:text-ink'
                    )}
                  >
                    {label}
                    {href === '/notifications' && unread > 0 && <CountBadge count={unread} />}
                    {active && <span aria-hidden className="absolute inset-x-3 bottom-0 h-[3px] rounded-t-full bg-ink" />}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-1">
          {isAuthenticated && user ? (
            <>
              <Link
                href="/notifications"
                className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'relative md:hidden')}
                aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
              >
                <Bell className="size-5" />
                {unread > 0 && (
                  <span aria-hidden className="absolute top-2 right-2 size-2.5 rounded-full bg-signal ring-2 ring-paper" />
                )}
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label={`Account menu for ${displayName}`}
                  className="flex items-center gap-2 rounded-full py-1 pr-1 pl-1 transition-colors hover:bg-sunken sm:pr-3 data-[popup-open]:bg-sunken"
                >
                  <span className="grid size-8 place-items-center rounded-full bg-ink font-display text-xs font-extrabold text-paper">
                    {initials}
                  </span>
                  <span className="hidden max-w-[140px] truncate text-sm font-bold sm:block">{displayName}</span>
                </DropdownMenuTrigger>

                <DropdownMenuContent className="w-60" align="end" sideOffset={8}>
                  {/* Plain div — DropdownMenuLabel requires a Menu.Group wrapper in Base UI */}
                  <div className="px-2.5 py-2">
                    <p className="truncate text-sm font-bold">{displayName}</p>
                    <p className="truncate text-xs text-ink-muted">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/profile')}>
                    <UserRound />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" className="cursor-pointer" onClick={handleLogout}>
                    <LogOut />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link href="/login" className={buttonVariants({ variant: 'ghost' })}>
                Log in
              </Link>
              <Link href="/register" className={buttonVariants({ variant: 'ink' })}>
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function CountBadge({ count }: { count: number }) {
  return (
    <span className="tnum inline-grid h-5 min-w-5 place-items-center rounded-full bg-signal px-1.5 text-xs font-bold text-signal-ink">
      <span className="sr-only">, </span>
      {count > 9 ? '9+' : count}
      <span className="sr-only"> unread</span>
    </span>
  );
}
