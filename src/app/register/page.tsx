'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, User, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import Logo from '@/components/Logo';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading } = useAuthStore();
  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await register(form);
      router.push('/products');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="-mx-4 -my-8 grid min-h-[calc(100vh-4rem)] grid-cols-1 sm:-mx-6 lg:-mx-8 lg:grid-cols-2">
      {/* BRAND PANEL */}
      <div className="mesh-bg relative hidden flex-col justify-between overflow-hidden bg-[color:var(--color-console)] p-12 text-[color:var(--color-ink)] lg:flex">
        <Logo dark />
        <div>
          <p className="font-display text-3xl font-bold leading-snug">
            Join a store built on
            <br />
            real business logic.
          </p>
          <p className="mt-4 text-sm text-[color:var(--color-ink-soft)]">
            Inventory that reserves stock, roles that gate access, and orders that never lie
            about their status.
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
          <h1 className="font-display text-3xl font-bold text-[color:var(--color-ink)]">Create account</h1>
          <p className="mt-1 text-sm text-[color:var(--color-ink-soft)]">Start shopping in under a minute.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-[color:var(--color-danger-soft)] p-3 text-sm text-[color:var(--color-danger)]">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-field">First name</label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--color-ink-soft)]" />
                  <input
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="input-field pl-9"
                    placeholder="Jane"
                  />
                </div>
              </div>
              <div>
                <label className="label-field">Last name</label>
                <input
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className="input-field"
                  placeholder="Doe"
                />
              </div>
            </div>
            <div>
              <label className="label-field">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--color-ink-soft)]" />
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input-field pl-9"
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
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input-field pl-9"
                  placeholder="At least 8 characters"
                />
              </div>
            </div>
            <button type="submit" disabled={isLoading} className="btn btn-primary w-full py-3 text-base">
              {isLoading ? 'Creating...' : 'Create account'}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-[color:var(--color-ink-soft)]">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-[color:var(--color-brand)] hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
