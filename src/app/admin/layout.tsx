'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Package,
  ShoppingCart,
  Truck,
  LogOut,
  ShieldHalf,
  MessageSquareText,
  RotateCcw,
  LayoutDashboard,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import Tooltip from '@/components/Tooltip';
import { useConfirm } from '@/components/ConfirmProvider';
import Logo from '@/components/Logo';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/returns', label: 'Returns', icon: RotateCcw },
  { href: '/admin/reviews', label: 'Reviews', icon: MessageSquareText },
  { href: '/admin/delivery-boys', label: 'Delivery Boys', icon: Truck },
];

// '/admin' itself needs an exact match - otherwise it'd also light up as
// "active" on every other admin route, since they all start with '/admin'.
function isNavActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const { user, hasHydrated, logout } =
    useAuthStore();
  const confirm = useConfirm();

  const handleLogout = async () => {
    const confirmed = await confirm({
      title: 'Log out?',
      description: 'You will need to sign in again to access the admin console.',
      confirmLabel: 'Log out',
      danger: true,
    });
    if (!confirmed) return;
    await logout();
    window.location.href = '/';
  };

  useEffect(() => {
    if (!hasHydrated) return;

    if (!user) {
      router.push('/login');
      return;
    }

    if (
      !['ADMIN', 'SUPER_ADMIN'].includes(
        user.role,
      )
    ) {
      router.push('/products');
    }
  }, [user, hasHydrated, router]);

  if (!hasHydrated) {
    return (
      <div className="py-20 text-center text-[color:var(--color-ink-soft)]">
        Checking authentication...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="py-20 text-center text-[color:var(--color-ink-soft)]">
        Redirecting to login...
      </div>
    );
  }

  if (
    !['ADMIN', 'SUPER_ADMIN'].includes(
      user.role,
    )
  ) {
    return (
      <div className="py-20 text-center text-[color:var(--color-ink-soft)]">
        Redirecting...
      </div>
    );
  }

  const initials =
    (user.firstName?.[0] || user.email?.[0] || '?').toUpperCase() +
    (user.lastName?.[0] || '').toUpperCase();

  return (
    <div className="-mx-4 -my-8 sm:-mx-6 lg:-mx-8 lg:flex lg:min-h-[calc(100vh-4rem)]">

      {/* ========================= */}
      {/* SIDEBAR (desktop) */}
      {/* ========================= */}
      <aside className="console-shell hidden w-64 flex-shrink-0 flex-col justify-between p-6 lg:flex">
        <div>
          <Logo dark />

          <div className="mt-8 flex items-center gap-2 rounded-xl bg-[color:var(--color-paper-dim)] px-3 py-2">
            <ShieldHalf className="h-4 w-4 text-[color:var(--color-signal)]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-ink-soft)]">
              {user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'} console
            </span>
          </div>

          <nav className="mt-6 flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active = isNavActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-[color:var(--color-brand)] text-white'
                      : 'text-[color:var(--color-ink-soft)] hover:bg-[color:var(--color-paper-dim)] hover:text-[color:var(--color-ink)]'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-[color:var(--color-console-line)] p-3">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--color-brand)] text-xs font-bold text-white">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[color:var(--color-ink)]">
              {user.firstName || user.email}
            </p>
          </div>
          <Tooltip content="Log out">
            <button
              onClick={handleLogout}
              className="rounded-lg p-1.5 text-[color:var(--color-ink-soft)] hover:bg-[color:var(--color-paper-dim)] hover:text-[color:var(--color-ink)]"
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </Tooltip>
        </div>
      </aside>

      {/* ========================= */}
      {/* MOBILE TAB BAR */}
      {/* ========================= */}
      <div className="console-shell flex gap-1 overflow-x-auto px-4 py-3 lg:hidden">
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
                active ? 'bg-[color:var(--color-brand)] text-white' : 'text-[color:var(--color-ink-soft)]'
              }`}
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* ========================= */}
      {/* CONTENT */}
      {/* ========================= */}
      <div className="flex-1 bg-[color:var(--color-paper)] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        <div className="mb-6 flex items-center justify-between border-b border-[color:var(--color-line)] pb-5">
          <div>
            <h1 className="font-display text-2xl font-bold text-[color:var(--color-ink)]">
              {user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
            </h1>
            <p className="mt-1 text-sm text-[color:var(--color-ink-soft)]">
              Manage your ShopFlow system
            </p>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
