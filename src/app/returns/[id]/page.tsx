'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ChevronLeft, Clock, ImageOff, XCircle } from 'lucide-react';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth';
import { useConfirm } from '@/components/ConfirmProvider';
import StatusBadge from '@/components/StatusBadge';
import { statusMeta } from '@/lib/status';
import type { ReturnRequest } from '@/types';

const CUSTOMER_CANCELLABLE_STATUSES = ['REQUESTED', 'APPROVED', 'PICKUP_SCHEDULED'];

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/api\/?$/, '');
function photoUrl(path: string) {
  return path.startsWith('http') ? path : `${API_ORIGIN}${path}`;
}

export default function ReturnDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();
  const confirm = useConfirm();

  const [request, setRequest] = useState<ReturnRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const loadRequest = async () => {
    try {
      const { data } = await api.get(`/returns/${params.id}`);
      setRequest(data);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load request');
      router.push('/returns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasHydrated) return;
    if (!user) {
      router.push('/login');
      return;
    }
    loadRequest();
  }, [user, hasHydrated, params.id]);

  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    if (!socket) return;

    const onReturnUpdate = (updated: ReturnRequest) => {
      if (updated.id === params.id) {
        setRequest(updated);
      }
    };
    socket.on('return:update', onReturnUpdate);
    return () => {
      socket.off('return:update', onReturnUpdate);
    };
  }, [user, params.id]);

  const cancelRequest = async () => {
    if (!request) return;
    const confirmed = await confirm({
      title: 'Withdraw request',
      description: `Withdraw this ${request.type === 'RETURN' ? 'return' : 'replacement'} request?`,
      confirmLabel: 'Withdraw',
      danger: true,
    });
    if (!confirmed) return;

    setCancelling(true);
    try {
      await api.patch(`/returns/${request.id}/cancel`);
      toast.success('Request withdrawn.');
      await loadRequest();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to withdraw request');
    } finally {
      setCancelling(false);
    }
  };

  if (!hasHydrated || loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="skeleton h-8 w-40 rounded-lg" />
        <div className="skeleton h-80 rounded-2xl" />
      </div>
    );
  }

  if (!request) return null;

  const canCancel = CUSTOMER_CANCELLABLE_STATUSES.includes(request.status);

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/returns"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-brand)]"
      >
        <ChevronLeft className="h-4 w-4" /> Back to returns
      </Link>

      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-bold text-[color:var(--color-ink)]">
              {request.type === 'RETURN' ? 'Return' : 'Replacement'} request
            </h1>
            <p className="text-sm text-[color:var(--color-ink-soft)]">
              Submitted {new Date(request.createdAt).toLocaleDateString()}
            </p>
          </div>
          <StatusBadge status={request.status} />
        </div>

        {/* Item */}
        <div className="mt-6 flex items-center gap-4 border-t border-[color:var(--color-line)] pt-6">
          <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-paper-dim)]">
            {request.orderItem?.product?.images?.[0] ? (
              <img
                src={request.orderItem.product.images[0]}
                alt={request.orderItem.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[color:var(--color-ink-soft)]">
                <ImageOff className="h-5 w-5" />
              </div>
            )}
          </div>
          <div className="flex-1">
            {request.orderItem?.product?.slug ? (
              <Link
                href={`/products/${request.orderItem.product.slug}`}
                className="font-medium text-[color:var(--color-ink)] hover:text-[color:var(--color-brand)]"
              >
                {request.orderItem?.name}
              </Link>
            ) : (
              <p className="font-medium text-[color:var(--color-ink)]">{request.orderItem?.name}</p>
            )}
            <p className="text-sm text-[color:var(--color-ink-soft)]">Qty {request.quantity}</p>
          </div>
          {request.order && (
            <Link
              href={`/orders/${request.order.id}`}
              className="text-sm font-semibold text-[color:var(--color-brand)] hover:underline"
            >
              {request.order.orderNumber}
            </Link>
          )}
        </div>

        {/* Reason / description */}
        <div className="mt-6 space-y-3 border-t border-[color:var(--color-line)] pt-6 text-sm">
          <div>
            <p className="font-semibold text-[color:var(--color-ink)]">Reason</p>
            <p className="text-[color:var(--color-ink-soft)]">{request.reason}</p>
          </div>
          {request.description && (
            <div>
              <p className="font-semibold text-[color:var(--color-ink)]">Details</p>
              <p className="text-[color:var(--color-ink-soft)]">{request.description}</p>
            </div>
          )}
          {!!request.photos?.length && (
            <div>
              <p className="mb-2 font-semibold text-[color:var(--color-ink)]">Photos</p>
              <div className="flex flex-wrap gap-2">
                {request.photos.map((p) => (
                  <a key={p} href={photoUrl(p)} target="_blank" rel="noreferrer">
                    <img
                      src={photoUrl(p)}
                      alt="Return photo"
                      className="h-16 w-16 rounded-lg border border-[color:var(--color-line)] object-cover"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}
          {request.status === 'REFUNDED' && request.refundAmount != null && (
            <div>
              <p className="font-semibold text-[color:var(--color-ink)]">Refund amount</p>
              <p className="text-[color:var(--color-ok)]">${Number(request.refundAmount).toFixed(2)}</p>
            </div>
          )}
          {request.adminNote && (
            <div>
              <p className="font-semibold text-[color:var(--color-ink)]">Note from support</p>
              <p className="text-[color:var(--color-ink-soft)]">{request.adminNote}</p>
            </div>
          )}
        </div>

        {/* Timeline */}
        {request.statusHistory && request.statusHistory.length > 0 && (
          <div className="mt-6 border-t border-[color:var(--color-line)] pt-6">
            <h2 className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-[color:var(--color-ink)]">
              <Clock className="h-4 w-4 text-[color:var(--color-brand)]" /> Timeline
            </h2>
            <ul className="space-y-0">
              {request.statusHistory.map((h, i) => {
                const meta = statusMeta(h.status);
                const isLast = i === request.statusHistory!.length - 1;
                return (
                  <li key={h.id} className="relative flex gap-4 pb-6 last:pb-0">
                    {!isLast && (
                      <span className="absolute left-[7px] top-4 h-full w-px bg-[color:var(--color-line)]" />
                    )}
                    <span
                      className="relative z-10 mt-1 h-4 w-4 flex-shrink-0 rounded-full border-2 border-[color:var(--color-surface)]"
                      style={{ backgroundColor: meta.dot }}
                    />
                    <div className="flex flex-1 flex-wrap items-center justify-between gap-x-4 gap-y-1">
                      <span className="text-sm font-medium text-[color:var(--color-ink)]">
                        {meta.label}
                        {h.note ? ` — ${h.note}` : ''}
                      </span>
                      <span className="text-xs text-[color:var(--color-ink-soft)]">
                        {new Date(h.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Withdraw */}
        {canCancel && (
          <div className="mt-6 border-t border-[color:var(--color-line)] pt-6">
            <button onClick={cancelRequest} disabled={cancelling} className="btn btn-danger px-4 py-2 text-sm">
              <XCircle className="h-4 w-4" />
              {cancelling ? 'Withdrawing...' : 'Withdraw request'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
