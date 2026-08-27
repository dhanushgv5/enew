'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PackageSearch, ChevronRight } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import StatusBadge from '@/components/StatusBadge';
import type { Order } from '@/types';

export default function OrdersPage() {
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasHydrated) return;

    if (!user) {
      router.push('/login');
      return;
    }
    if (['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      router.push('/admin');
      return;
    }
    api
      .get('/orders')
      .then((res) => setOrders(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, hasHydrated]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton h-32 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-8 font-display text-3xl font-bold text-[color:var(--color-ink)]">My Orders</h1>
      {orders.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-16 text-center">
          <PackageSearch className="h-10 w-10 text-[color:var(--color-ink-soft)]" />
          <p className="text-[color:var(--color-ink-soft)]">You have no orders yet.</p>
          <Link href="/products" className="btn btn-accent mt-2 px-5 py-2.5 text-sm">
            Start shopping
          </Link>
        </div>
      ) : (
        <div className="stagger space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="card group block p-6 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-display font-semibold text-[color:var(--color-ink)]">{order.orderNumber}</p>
                  <p className="text-sm text-[color:var(--color-ink-soft)]">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <StatusBadge status={order.status} />
                    <p className="mt-1 font-display font-semibold text-[color:var(--color-ink)]">
                      ${Number(order.total).toFixed(2)}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[color:var(--color-ink-soft)] transition-transform group-hover:translate-x-1" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                {order.items?.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-paper-dim)]"
                    title={item.name}
                  >
                    {item.product?.images?.[0] && (
                      <img
                        src={item.product.images[0]}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                ))}
                {order.items && order.items.length > 5 && (
                  <span className="text-sm text-[color:var(--color-ink-soft)]">
                    +{order.items.length - 5} more
                  </span>
                )}
                <span className="ml-2 text-sm text-[color:var(--color-ink-soft)]">
                  {order.items?.length || 0} item(s)
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
