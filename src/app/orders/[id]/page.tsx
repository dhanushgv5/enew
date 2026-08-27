'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ChevronLeft, MapPin, Clock, ImageOff, XCircle, Pencil, X, RotateCcw, ImagePlus, ExternalLink } from 'lucide-react';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth';
import { useConfirm } from '@/components/ConfirmProvider';
import StatusBadge from '@/components/StatusBadge';
import AddressFormFields from '@/components/AddressFormFields';
import { statusMeta } from '@/lib/status';
import type { Order, ReturnRequest } from '@/types';

// Mirrors CUSTOMER_CANCELLABLE_STATUSES on the backend - cancellation is
// cut off once the order is OUT_FOR_DELIVERY.
const CANCELLABLE_STATUSES = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED'];

// Mirrors ADDRESS_EDITABLE_STATUSES on the backend - once an order ships
// the label is already printed, so the address can no longer move.
const ADDRESS_EDITABLE_STATUSES = ['PENDING', 'PAID', 'PROCESSING'];

// Mirrors RETURN_WINDOW_DAYS on the backend.
const RETURN_WINDOW_DAYS = 7;

const RETURN_REASONS = [
  'Item damaged or defective',
  'Wrong item received',
  'Item not as described',
  'No longer needed',
  'Better price found elsewhere',
  'Other',
];

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/api\/?$/, '');
function photoUrl(path: string) {
  return path.startsWith('http') ? path : `${API_ORIGIN}${path}`;
}

const emptyAddressForm = {
  firstName: '',
  lastName: '',
  street: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  phone: '',
};

const emptyReturnForm = {
  type: 'RETURN' as 'RETURN' | 'REPLACEMENT',
  quantity: 1,
  reason: RETURN_REASONS[0],
  description: '',
};

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();
  const confirm = useConfirm();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  // ---- Change address ----
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState(emptyAddressForm);
  const [savingAddress, setSavingAddress] = useState(false);

  // ---- Return / Replace ----
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [openReturnItemId, setOpenReturnItemId] = useState<string | null>(null);
  const [returnForm, setReturnForm] = useState(emptyReturnForm);
  const [returnPhotos, setReturnPhotos] = useState<File[]>([]);
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [cancellingReturnId, setCancellingReturnId] = useState<string | null>(null);

  const loadOrder = async () => {
    try {
      const { data } = await api.get(`/orders/${params.id}`);
      setOrder(data);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load order');
      router.push('/orders');
    } finally {
      setLoading(false);
    }
  };

  const loadReturns = async () => {
    try {
      const { data } = await api.get('/returns/mine', { params: { orderId: params.id } });
      setReturns(data);
    } catch (e: any) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!hasHydrated) return;
    if (!user) {
      router.push('/login');
      return;
    }
    loadOrder();
    loadReturns();
  }, [user, hasHydrated, params.id]);

  // Live updates: if this order changes anywhere else (e.g. the address is
  // edited from another tab, or an admin updates the order), refresh here
  // instantly instead of waiting for a manual reload.
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    if (!socket) return;

    const onOrderUpdate = (updated: Order) => {
      if (updated.id === params.id) {
        setOrder(updated);
      }
    };
    const onReturnUpdate = (updated: ReturnRequest) => {
      if (updated.orderId === params.id) {
        setReturns((prev) => {
          const exists = prev.some((r) => r.id === updated.id);
          return exists ? prev.map((r) => (r.id === updated.id ? updated : r)) : [updated, ...prev];
        });
      }
    };
    socket.on('order:update', onOrderUpdate);
    socket.on('return:update', onReturnUpdate);
    return () => {
      socket.off('order:update', onOrderUpdate);
      socket.off('return:update', onReturnUpdate);
    };
  }, [user, params.id]);

  const cancelOrder = async () => {
    if (!order) return;
    const confirmed = await confirm({
      title: 'Cancel order',
      description: `Cancel order ${order.orderNumber}? This can't be undone.`,
      confirmLabel: 'Cancel order',
      danger: true,
    });
    if (!confirmed) return;

    setCancelling(true);
    try {
      await api.patch(`/orders/${order.id}/status`, { status: 'CANCELLED' });
      toast.success('Order cancelled.');
      await loadOrder();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  const openAddressForm = () => {
    if (!order?.shippingAddress) return;
    const addr = order.shippingAddress;
    setAddressForm({
      firstName: addr.firstName,
      lastName: addr.lastName,
      street: addr.street,
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode,
      country: addr.country,
      phone: addr.phone || '',
    });
    setShowAddressForm(true);
  };

  const saveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setSavingAddress(true);
    try {
      const { data } = await api.patch(`/orders/${order.id}/address`, {
        shippingAddress: addressForm,
      });
      setOrder(data);
      toast.success('Shipping address updated.');
      setShowAddressForm(false);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to update address');
    } finally {
      setSavingAddress(false);
    }
  };

  const returnedQtyByItem = returns.reduce<Record<string, number>>((acc, r) => {
    if (r.status !== 'REJECTED' && r.status !== 'CANCELLED') {
      acc[r.orderItemId] = (acc[r.orderItemId] || 0) + r.quantity;
    }
    return acc;
  }, {});

  const openReturnForm = (itemId: string) => {
    setReturnForm(emptyReturnForm);
    setReturnPhotos([]);
    setOpenReturnItemId(itemId);
  };

  const submitReturn = async (e: React.FormEvent, itemId: string) => {
    e.preventDefault();
    setSubmittingReturn(true);
    try {
      let photos: string[] = [];
      if (returnPhotos.length) {
        const fd = new FormData();
        returnPhotos.forEach((file) => fd.append('photos', file));
        const { data } = await api.post('/returns/photos', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        photos = data.urls;
      }

      await api.post('/returns', {
        orderItemId: itemId,
        type: returnForm.type,
        quantity: returnForm.quantity,
        reason: returnForm.reason,
        description: returnForm.description || undefined,
        photos,
      });
      toast.success(returnForm.type === 'RETURN' ? 'Return requested.' : 'Replacement requested.');
      setOpenReturnItemId(null);
      await loadReturns();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmittingReturn(false);
    }
  };

  const cancelReturn = async (request: ReturnRequest) => {
    const confirmed = await confirm({
      title: 'Cancel request',
      description: `Withdraw this ${request.type === 'RETURN' ? 'return' : 'replacement'} request?`,
      confirmLabel: 'Withdraw',
      danger: true,
    });
    if (!confirmed) return;

    setCancellingReturnId(request.id);
    try {
      await api.patch(`/returns/${request.id}/cancel`);
      toast.success('Request withdrawn.');
      await loadReturns();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to cancel request');
    } finally {
      setCancellingReturnId(null);
    }
  };

  if (!hasHydrated || loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="skeleton h-8 w-40 rounded-lg" />
        <div className="skeleton h-96 rounded-2xl" />
      </div>
    );
  }

  if (!order) return null;

  const canCancel = CANCELLABLE_STATUSES.includes(order.status);
  const canEditAddress = ADDRESS_EDITABLE_STATUSES.includes(order.status);
  const addr = order.shippingAddress;

  const returnDeadline = order.deliveredAt
    ? new Date(new Date(order.deliveredAt).getTime() + RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000)
    : null;
  const withinReturnWindow = order.status === 'DELIVERED' && (!returnDeadline || new Date() <= returnDeadline);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/orders"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-brand)]"
      >
        <ChevronLeft className="h-4 w-4" /> Back to orders
      </Link>

      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-bold text-[color:var(--color-ink)]">{order.orderNumber}</h1>
            <p className="text-sm text-[color:var(--color-ink-soft)]">
              Placed {new Date(order.createdAt).toLocaleDateString()}
            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {/* Items */}
        <div className="mt-6 space-y-4 border-t border-[color:var(--color-line)] pt-6">
          {order.items?.map((item) => {
            const alreadyRequested = returnedQtyByItem[item.id] || 0;
            const remainingEligible = item.quantity - alreadyRequested;
            const canRequestForItem = withinReturnWindow && remainingEligible > 0;

            return (
              <div key={item.id} className="border-b border-[color:var(--color-line)] pb-4 last:border-0 last:pb-0">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-paper-dim)]">
                    {item.product?.images?.[0] ? (
                      <img
                        src={item.product.images[0]}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[color:var(--color-ink-soft)]">
                        <ImageOff className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    {item.product?.slug ? (
                      <Link
                        href={`/products/${item.product.slug}`}
                        className="font-medium text-[color:var(--color-ink)] hover:text-[color:var(--color-brand)]"
                      >
                        {item.name}
                      </Link>
                    ) : (
                      <p className="font-medium text-[color:var(--color-ink)]">{item.name}</p>
                    )}
                    <p className="text-sm text-[color:var(--color-ink-soft)]">
                      Qty {item.quantity} &times; ${Number(item.price).toFixed(2)}
                    </p>
                  </div>
                  <p className="font-medium text-[color:var(--color-ink)]">
                    ${(Number(item.price) * item.quantity).toFixed(2)}
                  </p>
                </div>

                {canRequestForItem && openReturnItemId !== item.id && (
                  <button
                    onClick={() => openReturnForm(item.id)}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--color-brand)] hover:underline"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Return or replace
                  </button>
                )}

                {openReturnItemId === item.id && (
                  <form
                    onSubmit={(e) => submitReturn(e, item.id)}
                    className="mt-3 space-y-4 rounded-xl border border-[color:var(--color-line)] p-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-[color:var(--color-ink)]">
                        Return or replace &ldquo;{item.name}&rdquo;
                      </h3>
                      <button
                        type="button"
                        onClick={() => setOpenReturnItemId(null)}
                        className="rounded-lg p-1 text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)]"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setReturnForm({ ...returnForm, type: 'RETURN' })}
                        className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                          returnForm.type === 'RETURN'
                            ? 'border-[color:var(--color-brand)] bg-[color:var(--color-brand-soft)] text-[color:var(--color-brand)]'
                            : 'border-[color:var(--color-line)] text-[color:var(--color-ink-soft)]'
                        }`}
                      >
                        Return for refund
                      </button>
                      <button
                        type="button"
                        onClick={() => setReturnForm({ ...returnForm, type: 'REPLACEMENT' })}
                        className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                          returnForm.type === 'REPLACEMENT'
                            ? 'border-[color:var(--color-brand)] bg-[color:var(--color-brand-soft)] text-[color:var(--color-brand)]'
                            : 'border-[color:var(--color-line)] text-[color:var(--color-ink-soft)]'
                        }`}
                      >
                        Replace item
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label-field">Quantity</label>
                        <input
                          type="number"
                          min={1}
                          max={remainingEligible}
                          required
                          value={returnForm.quantity}
                          onChange={(e) =>
                            setReturnForm({ ...returnForm, quantity: Number(e.target.value) })
                          }
                          className="input-field"
                        />
                        <p className="mt-1 text-xs text-[color:var(--color-ink-soft)]">
                          Up to {remainingEligible} eligible
                        </p>
                      </div>
                      <div>
                        <label className="label-field">Reason</label>
                        <select
                          value={returnForm.reason}
                          onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })}
                          className="input-field"
                        >
                          {RETURN_REASONS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="label-field">Additional details (optional)</label>
                      <textarea
                        rows={3}
                        maxLength={2000}
                        value={returnForm.description}
                        onChange={(e) => setReturnForm({ ...returnForm, description: e.target.value })}
                        className="input-field"
                        placeholder="Tell us more about the issue"
                      />
                    </div>

                    <div>
                      <label className="label-field">Photos (optional, up to 5)</label>
                      <div className="flex flex-wrap gap-2">
                        {returnPhotos.map((file, i) => (
                          <div
                            key={i}
                            className="group relative h-16 w-16 overflow-hidden rounded-lg border border-[color:var(--color-line)]"
                          >
                            <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setReturnPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                              className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        {returnPhotos.length < 5 && (
                          <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[color:var(--color-line)] text-[color:var(--color-ink-soft)] hover:border-[color:var(--color-brand)] hover:text-[color:var(--color-brand)]">
                            <ImagePlus className="h-5 w-5" />
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              multiple
                              className="hidden"
                              onChange={(e) =>
                                e.target.files &&
                                setReturnPhotos((prev) =>
                                  [...prev, ...Array.from(e.target.files!)].slice(0, 5),
                                )
                              }
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submittingReturn}
                      className="btn btn-primary px-5 py-2.5 text-sm"
                    >
                      {submittingReturn ? 'Submitting...' : 'Submit request'}
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>

        {/* Existing return / replacement requests */}
        {returns.length > 0 && (
          <div className="mt-6 border-t border-[color:var(--color-line)] pt-6">
            <h2 className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-[color:var(--color-ink)]">
              <RotateCcw className="h-4 w-4 text-[color:var(--color-brand)]" /> Return / replacement requests
            </h2>
            <div className="space-y-3">
              {returns.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[color:var(--color-line)] p-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[color:var(--color-ink)]">
                        {r.type === 'RETURN' ? 'Return' : 'Replacement'} &middot; {r.orderItem?.name}
                      </span>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="mt-1 text-xs text-[color:var(--color-ink-soft)]">
                      Qty {r.quantity} &middot; {r.reason} &middot;{' '}
                      {new Date(r.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/returns/${r.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--color-brand)] hover:underline"
                    >
                      View <ExternalLink className="h-3 w-3" />
                    </Link>
                    {['REQUESTED', 'APPROVED', 'PICKUP_SCHEDULED'].includes(r.status) && (
                      <button
                        onClick={() => cancelReturn(r)}
                        disabled={cancellingReturnId === r.id}
                        className="text-xs font-semibold text-[color:var(--color-danger)] hover:underline"
                      >
                        {cancellingReturnId === r.id ? 'Withdrawing...' : 'Withdraw'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Totals */}
        <div className="mt-6 space-y-1.5 border-t border-[color:var(--color-line)] pt-6 text-sm">
          <div className="flex justify-between text-[color:var(--color-ink-soft)]">
            <span>Subtotal</span>
            <span>${Number(order.subtotal).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[color:var(--color-ink-soft)]">
            <span>Tax</span>
            <span>${Number(order.tax).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[color:var(--color-ink-soft)]">
            <span>Shipping</span>
            <span>${Number(order.shipping).toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t border-[color:var(--color-line)] pt-3 text-base font-semibold text-[color:var(--color-ink)]">
            <span>Total</span>
            <span>${Number(order.total).toFixed(2)}</span>
          </div>
        </div>

        {/* Shipping address */}
        {addr && (
          <div className="mt-6 border-t border-[color:var(--color-line)] pt-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-[color:var(--color-ink)]">
                <MapPin className="h-4 w-4 text-[color:var(--color-brand)]" /> Shipping address
              </h2>
              {canEditAddress && !showAddressForm && (
                <button
                  onClick={openAddressForm}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--color-brand)] hover:underline"
                >
                  <Pencil className="h-3.5 w-3.5" /> Change address
                </button>
              )}
            </div>

            {!showAddressForm ? (
              <p className="text-sm leading-relaxed text-[color:var(--color-ink-soft)]">
                {addr.firstName} {addr.lastName}
                <br />
                {addr.street}
                <br />
                {addr.city}, {addr.state} {addr.postalCode}
                <br />
                {addr.country}
                {addr.phone && (
                  <>
                    <br />
                    {addr.phone}
                  </>
                )}
              </p>
            ) : (
              <form
                onSubmit={saveAddress}
                className="mt-3 space-y-4 rounded-xl border border-[color:var(--color-line)] p-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[color:var(--color-ink)]">New address</h3>
                  <button
                    type="button"
                    onClick={() => setShowAddressForm(false)}
                    className="rounded-lg p-1 text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <AddressFormFields value={addressForm} onChange={setAddressForm} showLabel={false} />
                <button type="submit" disabled={savingAddress} className="btn btn-primary px-5 py-2.5 text-sm">
                  {savingAddress ? 'Saving...' : 'Save address'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Status history - vertical timeline */}
        {order.statusHistory && order.statusHistory.length > 0 && (
          <div className="mt-6 border-t border-[color:var(--color-line)] pt-6">
            <h2 className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-[color:var(--color-ink)]">
              <Clock className="h-4 w-4 text-[color:var(--color-brand)]" /> Order timeline
            </h2>
            <ul className="space-y-0">
              {order.statusHistory.map((h, i) => {
                const meta = statusMeta(h.status);
                const isLast = i === order.statusHistory!.length - 1;
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

        {/* Cancel */}
        <div className="mt-6 border-t border-[color:var(--color-line)] pt-6">
          {canCancel ? (
            <button
              onClick={cancelOrder}
              disabled={cancelling}
              className="btn btn-danger px-4 py-2 text-sm"
            >
              <XCircle className="h-4 w-4" />
              {cancelling ? 'Cancelling...' : 'Cancel order'}
            </button>
          ) : order.status === 'CANCELLED' ? (
            <p className="text-sm text-[color:var(--color-ink-soft)]">This order has been cancelled.</p>
          ) : (
            <p className="text-sm text-[color:var(--color-ink-soft)]">
              This order is out for delivery or beyond and can no longer be cancelled.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}