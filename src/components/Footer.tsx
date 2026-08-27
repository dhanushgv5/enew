import Link from 'next/link';
import { ShoppingBag, Github, Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/30">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900">
                ShopFlow
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-slate-500">
              A modern, secure e-commerce experience with real-time updates,
              role-based access, and solid business logic.
            </p>
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-900">
              Shop
            </h4>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link
                  href="/products"
                  className="text-sm text-slate-500 transition hover:text-indigo-600"
                >
                  All Products
                </Link>
              </li>
              <li>
                <Link
                  href="/cart"
                  className="text-sm text-slate-500 transition hover:text-indigo-600"
                >
                  Cart
                </Link>
              </li>
              <li>
                <Link
                  href="/orders"
                  className="text-sm text-slate-500 transition hover:text-indigo-600"
                >
                  My Orders
                </Link>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-900">
              Account
            </h4>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link
                  href="/login"
                  className="text-sm text-slate-500 transition hover:text-indigo-600"
                >
                  Login
                </Link>
              </li>
              <li>
                <Link
                  href="/register"
                  className="text-sm text-slate-500 transition hover:text-indigo-600"
                >
                  Create Account
                </Link>
              </li>
            </ul>
          </div>

          {/* Tech */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-900">
              Built With
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-500">
              <li>Next.js + NestJS</li>
              <li>PostgreSQL + JWT + RBAC</li>
              <li>Real-time updates</li>
              <li>Tailwind CSS</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-8 sm:flex-row">
          <p className="text-sm text-slate-400">
            © {new Date().getFullYear()} ShopFlow. Demo project for learning.
          </p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Production-ready demo
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
