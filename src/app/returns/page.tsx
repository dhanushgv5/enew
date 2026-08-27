'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RotateCcw, ChevronRight, ImageOff } from 'lucide-react';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth';
import StatusBadge from '@/components/StatusBadge';
import type { ReturnRequest } from '@/types';

export default function ReturnsPage() {
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReturns = () => {
    api
      .get('/returns/mine')
      .then((res) => setReturns(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

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
    loadReturns();
  }, [user, hasHydrated]);

  // Live updates - reflect admin decisions the instant they happen.
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    if (!socket) return;

    const onReturnUpdate = (updated: ReturnRequest) => {
      setReturns((prev) => {
        const exists = prev.some((r) => r.id === updated.id);
        return exists ? prev.map((r) => (r.id === updated.id ? updated : r)) : [updated, ...prev];
      });
    };
    socket.on('return:update', onReturnUpdate);
    return () => {
      socket.off('return:update', onReturnUpdate);
    };
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton h-28 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-8 font-display text-3xl font-bold text-[color:var(--color-ink)]">
        Returns &amp; Replacements
      </h1>
      {returns.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-16 text-center">
          <RotateCcw className="h-10 w-10 text-[color:var(--color-ink-soft)]" />
          <p className="text-[color:var(--color-ink-soft)]">
            You haven&rsquo;t requested any returns or replacements yet.
          </p>
          <Link href="/orders" className="btn btn-accent mt-2 px-5 py-2.5 text-sm">
            View your orders
          </Link>
        </div>
      ) : (
        <div className="stagger space-y-4">
          {returns.map((r) => (
            <Link
              key={r.id}
              href={`/returns/${r.id}`}
              className="card group flex items-center gap-4 p-5 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
            >
              <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-paper-dim)]">
                {r.orderItem?.product?.images?.[0] ? (
                  <img
                    src={r.orderItem.product.images[0]}
                    alt={r.orderItem.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[color:var(--color-ink-soft)]">
                    <ImageOff className="h-5 w-5" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-[color:var(--color-ink)]">
                  {r.type === 'RETURN' ? 'Return' : 'Replacement'} &middot; {r.orderItem?.name}
                </p>
                <p className="text-sm text-[color:var(--color-ink-soft)]">
                  Order {r.order?.orderNumber} &middot; Qty {r.quantity} &middot;{' '}
                  {new Date(r.createdAt).toLocaleDateString()}
                </p>
              </div>
              <StatusBadge status={r.status} />
              <ChevronRight className="h-4 w-4 text-[color:var(--color-ink-soft)] transition-transform group-hover:translate-x-1" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
