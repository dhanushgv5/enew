'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  RotateCcw,
  Star,
  Users,
  ArrowRight,
  ImageOff,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import ReviewStars from '@/components/ReviewStars';
import type { DashboardOverview } from '@/types';

function money(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AdminDashboardPage() {
  const { hasHydrated } = useAuthStore();
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasHydrated) return;
    api
      .get('/dashboard/overview')
      .then((res) => setData(res.data))
      .catch((e) => toast.error(e.response?.data?.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, [hasHydrated]);

  if (!hasHydrated || loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="skeleton h-80 rounded-2xl" />
          <div className="skeleton h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!data) {
    return <p className="text-[color:var(--color-ink-soft)]">Couldn&rsquo;t load the dashboard.</p>;
  }

  const pending = data.orders.byStatus['PENDING'] || 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-[color:var(--color-ink)]">Dashboard</h1>
        <p className="text-sm text-[color:var(--color-ink-soft)]">Overview of your store&rsquo;s activity.</p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Revenue this month"
          value={money(data.revenue.thisMonth)}
          icon={DollarSign}
          tone="ok"
          hint={`${money(data.revenue.today)} today`}
        />
        <StatCard
          label="Total orders"
          value={data.orders.total}
          icon={ShoppingCart}
          tone="brand"
          hint={pending ? `${pending} awaiting payment` : undefined}
        />
        <StatCard
          label="Low stock"
          value={data.products.lowStockCount}
          icon={AlertTriangle}
          tone="signal"
          hint={`${data.products.outOfStock} out of stock`}
        />
        <StatCard
          label="Pending returns"
          value={data.returns.pending}
          icon={RotateCcw}
          tone="danger"
        />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <StatCard label="Customers" value={data.customers.total} icon={Users} tone="brand" />
        <StatCard
          label="Average rating"
          value={data.reviews.average.toFixed(1)}
          icon={Star}
          tone="signal"
          hint={`${data.reviews.total} review${data.reviews.total === 1 ? '' : 's'}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent orders */}
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-[color:var(--color-ink)]">Recent orders</h2>
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--color-brand)] hover:underline"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {data.recentOrders.length === 0 ? (
            <p className="py-6 text-center text-sm text-[color:var(--color-ink-soft)]">No orders yet.</p>
          ) : (
            <div className="space-y-3">
              {data.recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[color:var(--color-ink)]">{order.orderNumber}</p>
                    <p className="text-xs text-[color:var(--color-ink-soft)]">
                      {order.user?.firstName || order.user?.email}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-3">
                    <span className="font-medium text-[color:var(--color-ink)]">
                      ${Number(order.total).toFixed(2)}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent reviews */}
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-[color:var(--color-ink)]">Recent reviews</h2>
            <Link
              href="/admin/reviews"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--color-brand)] hover:underline"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {data.recentReviews.length === 0 ? (
            <p className="py-6 text-center text-sm text-[color:var(--color-ink-soft)]">No reviews yet.</p>
          ) : (
            <div className="space-y-3">
              {data.recentReviews.map((review) => (
                <div key={review.id} className="text-sm">
                  <div className="flex items-center gap-2">
                    <ReviewStars value={review.rating} size={13} />
                    <span className="truncate font-medium text-[color:var(--color-ink)]">
                      {review.product.name}
                    </span>
                  </div>
                  <p className="text-xs text-[color:var(--color-ink-soft)]">
                    {review.user?.firstName || 'Anonymous'} &middot;{' '}
                    {new Date(review.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Low stock products */}
      {data.lowStockProducts.length > 0 && (
        <div className="card mt-6 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 font-semibold text-[color:var(--color-ink)]">
              <AlertTriangle className="h-4 w-4 text-[color:var(--color-signal)]" /> Low stock
            </h2>
            <Link
              href="/admin/products"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--color-brand)] hover:underline"
            >
              Manage products <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {data.lowStockProducts.map((p) => (
              <div key={p.id} className="flex items-center gap-2 rounded-xl border border-[color:var(--color-line)] p-2">
                <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-[color:var(--color-paper-dim)]">
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[color:var(--color-ink-soft)]">
                      <ImageOff className="h-4 w-4" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-[color:var(--color-ink)]">{p.name}</p>
                  <p className="text-xs font-semibold text-[color:var(--color-signal)]">{p.stock} left</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
