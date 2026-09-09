'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Truck, Radio } from 'lucide-react';
import api from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import type { Product } from '@/types';

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Secure by design',
    body: 'JWT access tokens live in memory only, refreshed through an httpOnly cookie — no tokens ever touch localStorage.',
  },
  {
    icon: Radio,
    title: 'Role-aware access',
    body: 'Customers, admins, and delivery partners each see exactly the surface built for their job — nothing more.',
  },
  {
    icon: Truck,
    title: 'Live order tracking',
    body: 'Every order carries a full status timeline, from placed to paid to out for delivery.',
  },
];

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/products', { params: { limit: 4 } })
      .then((res) => setProducts(res.data.items || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* ========================= */}
      {/* HERO */}
      {/* ========================= */}
      <section className="mesh-bg -mx-4 rounded-[2.25rem] px-6 py-24 text-center sm:-mx-6 sm:px-10 lg:-mx-8">
        <span className="animate-rise chip mx-auto bg-[color:var(--color-brand-soft)] text-[color:var(--color-brand-glow)]">
        </span>
        <h1 className="animate-rise mt-6 font-display text-4xl font-bold tracking-tight text-[color:var(--color-ink)] sm:text-7xl">
          Commerce, run the
          <br />
          <span className="text-gradient">right way.</span>
        </h1>
        <p className="animate-rise mt-6 max-w-2xl mx-auto text-lg text-[color:var(--color-ink-soft)]" style={{ animationDelay: '0.08s' }}>
          A modern, secure e-commerce experience with PostgreSQL-backed inventory,
          JWT + RBAC authentication, real-time order tracking, and solid business logic
          behind every click.
        </p>
        <div className="animate-rise mt-10 flex flex-wrap justify-center gap-4" style={{ animationDelay: '0.14s' }}>
          <Link href="/products" className="btn btn-primary px-6 py-3 text-base">
            Browse Products
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link href="/register" className="btn btn-ghost bg-[color:var(--color-surface)] px-6 py-3 text-base">
            Create Account
          </Link>
        </div>
      </section>

      {/* ========================= */}
      {/* FEATURES */}
      {/* ========================= */}
      <section className="stagger mt-16 grid gap-5 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="card card-interactive group p-6">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--color-brand)]/35 bg-[color:var(--color-brand-soft)] text-[color:var(--color-brand-glow)] transition-transform duration-300 group-hover:scale-105">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="font-display text-base font-semibold text-[color:var(--color-ink)]">
              {f.title}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--color-ink-soft)]">
              {f.body}
            </p>
          </div>
        ))}
      </section>

      {/* ========================= */}
      {/* FEATURED PRODUCTS */}
      {/* ========================= */}
      {(loading || products.length > 0) && (
        <section className="mt-20">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-signal)]">
                Fresh in
              </span>
              <h2 className="font-display text-2xl font-bold text-[color:var(--color-ink)]">
                Featured products
              </h2>
            </div>
            <Link
              href="/products"
              className="hidden text-sm font-semibold text-[color:var(--color-brand)] hover:underline sm:inline-flex sm:items-center sm:gap-1"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton h-72 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="stagger grid grid-cols-2 gap-6 lg:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
