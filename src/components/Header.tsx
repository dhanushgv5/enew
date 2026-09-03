'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';
import { useWishlistStore } from '@/store/wishlist';
import { useConfirm } from './ConfirmProvider';
import Tooltip from './Tooltip';
import { ShoppingCart, LogOut, Menu, X } from 'lucide-react';
import Logo from './Logo';


export default function Header() {
  const { user, logout } = useAuthStore();
  const { itemCount, refreshCount, setItemCount } = useCartStore();
  const { refresh: refreshWishlist } = useWishlistStore();
  const confirm = useConfirm();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    const confirmed = await confirm({
      title: 'Log out?',
      description: 'You will need to sign in again to access your account.',
      confirmLabel: 'Log out',
      danger: true,
    });
    if (!confirmed) return;
    await logout();
    // Hard redirect (not router.push) so we always land on the home page,
    // even if the page we were on has its own "redirect to /login when
    // logged out" guard racing against this navigation.
    window.location.href = '/';
  };

  const isAdminStaff =
    user &&
    ['ADMIN', 'SUPER_ADMIN'].includes(user.role);

  const isDelivery = user?.role === 'DELIVERY_BOY';

  // Neither admin/super-admin staff nor delivery boys shop on the site -
  // they manage it. Only a plain customer sees the shopping-facing nav.
  const isShopper = !!user && !isAdminStaff && !isDelivery;

  useEffect(() => {
    if (isShopper) {
      refreshCount();
      refreshWishlist();
    } else {
      setItemCount(0);
    }
  }, [isShopper]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const initials =
    (user?.firstName?.[0] || user?.email?.[0] || '?').toUpperCase() +
    (user?.lastName?.[0] || '').toUpperCase();

  const navLinks: { href: string; label: string }[] = [];
  if (isDelivery) {
    navLinks.push({ href: '/delivery', label: 'My Deliveries' });
  }
  if (!isDelivery) {
    navLinks.push({ href: isAdminStaff ? '/admin/products' : '/products', label: 'Products' });
  }
  if (isShopper) {
    navLinks.push({ href: '/orders', label: 'My Orders' });
    navLinks.push({ href: '/returns', label: 'Returns' });
    navLinks.push({ href: '/wishlist', label: 'Wishlist' });
  }
  if (isAdminStaff) {
    navLinks.push({ href: '/admin/orders', label: 'Orders' });
    navLinks.push({ href: '/admin/returns', label: 'Returns' });
    navLinks.push({ href: '/admin/delivery-boys', label: 'Delivery Boys' });
  }
  if (user && !isAdminStaff) {
    navLinks.push({ href: '/profile', label: 'Profile' });
  }

  return (
    <header className="glass sticky top-0 z-50 border-b border-[color:var(--color-line)] shadow-[0_1px_0_0_color-mix(in_srgb,var(--color-ink)_8%,transparent)]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* ========================= */}
        {/* LOGO */}
        {/* ========================= */}

        <Link href="/" className="transition-transform hover:scale-[1.02]">
          <Logo />
        </Link>

        {/* ========================= */}
        {/* NAVIGATION */}
        {/* ========================= */}

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const active = pathname === link.href || pathname?.startsWith(link.href + '/');
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative rounded-full px-3.5 py-2 text-sm font-medium transition-all ${
                  active
                    ? 'bg-[color:var(--color-brand-soft)] text-[color:var(--color-brand-glow)]'
                    : 'text-[color:var(--color-ink-soft)] hover:bg-[color:var(--color-surface-hi)] hover:text-[color:var(--color-ink)]'
                }`}
              >
                {link.label}
                {active && (
                  <span className="absolute inset-x-4 -bottom-[7px] h-[2px] rounded-full bg-[color:var(--color-brand)] shadow-[0_0_12px_2px_color-mix(in_srgb,var(--color-brand)_70%,transparent)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* ========================= */}
        {/* RIGHT SIDE */}
        {/* ========================= */}

        <div className="flex items-center gap-2">

          {/* CART - CUSTOMERS/SHOPPERS ONLY */}

          {isShopper && (
            <Tooltip content="View cart">
              <Link
                href="/cart"
                className="relative rounded-full p-2 text-[color:var(--color-ink-soft)] transition-colors hover:bg-[color:var(--color-paper-dim)] hover:text-[color:var(--color-brand)]"
                aria-label="View cart"
              >
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <span className="pulse-badge absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[color:var(--color-brand)] px-1 text-[10px] font-semibold leading-none text-white">
                    {itemCount > 99 ? '99+' : itemCount}
                  </span>
                )}
              </Link>
            </Tooltip>
          )}

          {/* LOGGED IN */}

          {user ? (
            <div className="hidden items-center gap-3 sm:flex">
              {isAdminStaff ? (
                <div className="flex items-center gap-2 rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] py-1 pl-1 pr-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--color-brand)] text-[10px] font-bold text-white">
                    {initials}
                  </span>
                  <span className="text-sm text-[color:var(--color-ink-soft)]">
                    {user.firstName || user.email}
                  </span>
                </div>
              ) : (
                <Link
                  href="/profile"
                  className="flex items-center gap-2 rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] py-1 pl-1 pr-3 transition-colors hover:border-[color:var(--color-brand)]"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--color-brand)] text-[10px] font-bold text-white">
                    {initials}
                  </span>
                  <span className="text-sm text-[color:var(--color-ink-soft)]">
                    {user.firstName || user.email}
                  </span>
                </Link>
              )}

              <Tooltip content="Log out">
                <button
                  onClick={handleLogout}
                  className="rounded-full p-2 text-[color:var(--color-ink-soft)] transition-colors hover:bg-[color:var(--color-danger-soft)] hover:text-[color:var(--color-danger)]"
                  aria-label="Log out"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </Tooltip>
            </div>
          ) : (
            /* NOT LOGGED IN */

            <div className="hidden items-center gap-2 sm:flex">
              <Link href="/login" className="btn btn-ghost px-3 py-1.5 text-sm">
                Login
              </Link>
              <Link href="/register" className="btn btn-accent px-3.5 py-1.5 text-sm">
                Sign up
              </Link>
            </div>
          )}

          {/* MOBILE MENU TOGGLE */}
          <button
            className="rounded-lg p-2 text-[color:var(--color-ink-soft)] hover:bg-[color:var(--color-paper-dim)] md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* MOBILE PANEL */}
      {mobileOpen && (
        <div className="animate-fade border-t border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-[color:var(--color-ink)] hover:bg-[color:var(--color-paper-dim)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 border-t border-[color:var(--color-line)] pt-3">
            {user ? (
              <div className="flex items-center justify-between">
                <span className="text-sm text-[color:var(--color-ink-soft)]">
                  {user.firstName || user.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="btn btn-ghost px-3 py-1.5 text-sm"
                >
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link href="/login" className="btn btn-ghost flex-1 py-2 text-sm">
                  Login
                </Link>
                <Link href="/register" className="btn btn-accent flex-1 py-2 text-sm">
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
