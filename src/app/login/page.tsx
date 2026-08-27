'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import Logo from '@/components/Logo';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      const loggedInUser = useAuthStore.getState().user;
      if (loggedInUser && ['ADMIN', 'SUPER_ADMIN'].includes(loggedInUser.role)) {
        router.push('/admin');
      } else if (loggedInUser?.role === 'DELIVERY_BOY') {
        router.push('/delivery');
      } else {
        router.push('/products');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="-mx-4 -my-8 grid min-h-[calc(100vh-4rem)] grid-cols-1 sm:-mx-6 lg:-mx-8 lg:grid-cols-2">
      {/* BRAND PANEL */}
      <div className="mesh-bg relative hidden flex-col justify-between overflow-hidden bg-[color:var(--color-console)] p-12 text-[color:var(--color-ink)] lg:flex">
        <Logo dark />
        <div>
          <p className="font-display text-3xl font-bold leading-snug">
            "Order tracking that actually
            <br />
            tells you the truth."
          </p>
          <p className="mt-4 text-sm text-[color:var(--color-ink-soft)]">
            Every status change, timestamped and visible — from checkout to your doorstep.
          </p>
        </div>
        <p className="text-xs text-[color:var(--color-ink-soft)]">© {new Date().getFullYear()} ShopFlow</p>
      </div>

      {/* FORM PANEL */}
      <div className="flex items-center justify-center px-4 py-16 sm:px-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h1 className="font-display text-3xl font-bold text-[color:var(--color-ink)]">Welcome back</h1>
          <p className="mt-1 text-sm text-[color:var(--color-ink-soft)]">Sign in to continue to your account.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-[color:var(--color-danger-soft)] p-3 text-sm text-[color:var(--color-danger)]">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}
            <div>
              <label className="label-field">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--color-ink-soft)]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 rounded-xl border border-gray-300 bg-white pl-12 pr-4 text-gray-900 placeholder:text-gray-500 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div>
              <label className="label-field">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--color-ink-soft)]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 rounded-xl border border-gray-300 bg-white pl-12 pr-4 text-gray-900 placeholder:text-gray-500 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <button type="submit" disabled={isLoading} className="btn btn-primary w-full py-3 text-base">
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-[color:var(--color-ink-soft)]">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-semibold text-[color:var(--color-brand)] hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
