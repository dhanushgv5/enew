'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { MapPin, Phone, Truck, PackageCheck, History, RotateCcw, ImageOff } from 'lucide-react';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth';
import { useConfirm } from '@/components/ConfirmProvider';
import StatusBadge from '@/components/StatusBadge';
import type { Order, ReturnRequest } from '@/types';

interface DeliveryOrder extends Order {
  user: { firstName?: string; lastName?: string; phone?: string };
}

export default function DeliveryDashboardPage() {
  const router = useRouter();
  const confirm = useConfirm();
  const { user, hasHydrated } = useAuthStore();

  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [pickups, setPickups] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const loadOrders = async () => {
    try {
      const { data } = await api.get('/orders/delivery/my');
      setOrders(data);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load your deliveries');
    } finally {
      setLoading(false);
    }
  };

  const loadPickups = async () => {
    try {
      const { data } = await api.get('/returns/delivery/mine');
      setPickups(data);
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
    if (user.role !== 'DELIVERY_BOY') {
      router.push('/');
      return;
    }
    loadOrders();
    loadPickups();
  }, [user, hasHydrated]);

  // Live updates: new pickups assigned to me, or ones I no longer hold,
  // appear instantly without a manual refresh.
  useEffect(() => {
    if (!user || user.role !== 'DELIVERY_BOY') return;
    const socket = getSocket();
    if (!socket) return;

    const onReturnUpdate = () => loadPickups();
    socket.on('return:update', onReturnUpdate);
    return () => {
      socket.off('return:update', onReturnUpdate);
    };
  }, [user]);

  const advance = async (order: DeliveryOrder, nextStatus: 'OUT_FOR_DELIVERY' | 'DELIVERED') => {
    const label = nextStatus === 'OUT_FOR_DELIVERY' ? 'Out for Delivery' : 'Delivered';
    const confirmed = await confirm({
      title: 'Update delivery status',
      description: `Mark order ${order.orderNumber} as "${label}"?`,
      confirmLabel: 'Confirm',
    });
    if (!confirmed) return;

    setActingOn(order.id);
    try {
      await api.patch(`/orders/${order.id}/delivery-status`, { status: nextStatus });
      toast.success(`Order ${order.orderNumber} updated to ${label}.`);
      await loadOrders();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to update order status');
    } finally {
      setActingOn(null);
    }
  };

  const advancePickup = async (pickup: ReturnRequest, nextStatus: 'PICKED_UP' | 'RECEIVED') => {
    const label = nextStatus === 'PICKED_UP' ? 'Picked Up' : 'Received at warehouse';
    const confirmed = await confirm({
      title: 'Update pickup status',
      description: `Mark this ${pickup.type === 'RETURN' ? 'return' : 'replacement'} pickup as "${label}"?`,
      confirmLabel: 'Confirm',
    });
    if (!confirmed) return;

    setActingOn(pickup.id);
    try {
      await api.patch(`/returns/${pickup.id}/delivery-status`, { status: nextStatus });
      toast.success(`Pickup updated to ${label}.`);
      await loadPickups();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to update pickup status');
    } finally {
      setActingOn(null);
    }
  };

  if (!hasHydrated || loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-52 rounded-lg" />
        {[...Array(2)].map((_, i) => (
          <div key={i} className="skeleton h-32 rounded-2xl" />
        ))}
      </div>
    );
  }

  const active = orders.filter((o) => ['SHIPPED', 'OUT_FOR_DELIVERY'].includes(o.status));
  const completed = orders.filter((o) => !['SHIPPED', 'OUT_FOR_DELIVERY'].includes(o.status));

  return (
    <div>
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[color:var(--color-brand-soft)] text-[color:var(--color-brand)]">
          <Truck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-[color:var(--color-ink)]">My Deliveries</h1>
          <p className="text-sm text-[color:var(--color-ink-soft)]">Orders assigned to you for delivery.</p>
        </div>
      </div>

      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[color:var(--color-ink)]">
        <PackageCheck className="h-4 w-4 text-[color:var(--color-brand)]" /> Active ({active.length})
      </h2>
      <div className="stagger mb-10 space-y-4">
        {active.length === 0 && (
          <p className="card py-10 text-center text-[color:var(--color-ink-soft)]">
            No active deliveries right now.
          </p>
        )}
        {active.map((order) => {
          const addr = order.shippingAddress;
          return (
            <div key={order.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-semibold text-[color:var(--color-ink)]">
                      {order.orderNumber}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-[color:var(--color-ink-soft)]">
                    {order.user?.firstName} {order.user?.lastName}
                    {order.user?.phone && (
                      <>
                        <span className="text-[color:var(--color-line)]">·</span>
                        <Phone className="h-3.5 w-3.5" /> {order.user.phone}
                      </>
                    )}
                  </p>
                  {addr && (
                    <p className="mt-1 flex items-start gap-1.5 text-sm text-[color:var(--color-ink-soft)]">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                      {addr.street}, {addr.city}, {addr.state} {addr.postalCode}
                    </p>
                  )}
                  <p className="mt-1 font-display text-sm font-semibold text-[color:var(--color-ink)]">
                    ${Number(order.total).toFixed(2)}
                  </p>
                </div>

                <div className="flex-shrink-0">
                  {order.status === 'SHIPPED' && (
                    <button
                      onClick={() => advance(order, 'OUT_FOR_DELIVERY')}
                      disabled={actingOn === order.id}
                      className="btn px-4 py-2 text-sm"
                      style={{ backgroundColor: 'var(--color-signal)', color: 'white' }}
                    >
                      {actingOn === order.id ? 'Updating...' : 'Start Delivery'}
                    </button>
                  )}
                  {order.status === 'OUT_FOR_DELIVERY' && (
                    <button
                      onClick={() => advance(order, 'DELIVERED')}
                      disabled={actingOn === order.id}
                      className="btn px-4 py-2 text-sm"
                      style={{ backgroundColor: 'var(--color-ok)', color: 'white' }}
                    >
                      {actingOn === order.id ? 'Updating...' : 'Mark Delivered'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {completed.length > 0 && (
        <>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[color:var(--color-ink)]">
            <History className="h-4 w-4 text-[color:var(--color-brand)]" /> History
          </h2>
          <div className="card overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-[color:var(--color-paper-dim)] text-[color:var(--color-ink-soft)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Order</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--color-line)]">
                {completed.map((order) => (
                  <tr key={order.id} className="hover:bg-[color:var(--color-paper-dim)]/40">
                    <td className="px-4 py-3 font-medium text-[color:var(--color-ink)]">{order.orderNumber}</td>
                    <td className="px-4 py-3 text-[color:var(--color-ink-soft)]">
                      {order.user?.firstName} {order.user?.lastName}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 font-medium text-[color:var(--color-ink)]">
                      ${Number(order.total).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ===================== */}
      {/* RETURN / REPLACEMENT PICKUPS */}
      {/* ===================== */}
      {(() => {
        const activePickups = pickups.filter((p) => ['PICKUP_SCHEDULED', 'PICKED_UP'].includes(p.status));
        const pickupHistory = pickups.filter((p) => !['PICKUP_SCHEDULED', 'PICKED_UP'].includes(p.status));

        return (
          <div className="mt-12">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[color:var(--color-ink)]">
              <RotateCcw className="h-4 w-4 text-[color:var(--color-brand)]" /> Return Pickups (
              {activePickups.length})
            </h2>
            <div className="stagger mb-10 space-y-4">
              {activePickups.length === 0 && (
                <p className="card py-10 text-center text-[color:var(--color-ink-soft)]">
                  No return or replacement pickups scheduled right now.
                </p>
              )}
              {activePickups.map((pickup) => (
                <div key={pickup.id} className="card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-paper-dim)]">
                        {pickup.orderItem?.product?.images?.[0] ? (
                          <img
                            src={pickup.orderItem.product.images[0]}
                            alt={pickup.orderItem.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[color:var(--color-ink-soft)]">
                            <ImageOff className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-display font-semibold text-[color:var(--color-ink)]">
                            {pickup.type === 'RETURN' ? 'Return' : 'Replacement'} &middot;{' '}
                            {pickup.orderItem?.name}
                          </span>
                          <StatusBadge status={pickup.status} />
                        </div>
                        <p className="mt-2 flex items-center gap-1.5 text-sm text-[color:var(--color-ink-soft)]">
                          {pickup.user?.firstName} {pickup.user?.lastName}
                        </p>
                        <p className="mt-1 text-sm text-[color:var(--color-ink-soft)]">
                          Order {pickup.order?.orderNumber} &middot; Qty {pickup.quantity}
                        </p>
                        {pickup.pickupDate && (
                          <p className="mt-1 text-sm font-medium text-[color:var(--color-ink)]">
                            Scheduled for {new Date(pickup.pickupDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      {pickup.status === 'PICKUP_SCHEDULED' && (
                        <button
                          onClick={() => advancePickup(pickup, 'PICKED_UP')}
                          disabled={actingOn === pickup.id}
                          className="btn px-4 py-2 text-sm"
                          style={{ backgroundColor: 'var(--color-signal)', color: 'white' }}
                        >
                          {actingOn === pickup.id ? 'Updating...' : 'Mark Picked Up'}
                        </button>
                      )}
                      {pickup.status === 'PICKED_UP' && (
                        <button
                          onClick={() => advancePickup(pickup, 'RECEIVED')}
                          disabled={actingOn === pickup.id}
                          className="btn px-4 py-2 text-sm"
                          style={{ backgroundColor: 'var(--color-ok)', color: 'white' }}
                        >
                          {actingOn === pickup.id ? 'Updating...' : 'Mark Received'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {pickupHistory.length > 0 && (
              <>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[color:var(--color-ink)]">
                  <History className="h-4 w-4 text-[color:var(--color-brand)]" /> Pickup History
                </h2>
                <div className="card overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[color:var(--color-paper-dim)] text-[color:var(--color-ink-soft)]">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Item</th>
                        <th className="px-4 py-3 font-semibold">Customer</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[color:var(--color-line)]">
                      {pickupHistory.map((pickup) => (
                        <tr key={pickup.id} className="hover:bg-[color:var(--color-paper-dim)]/40">
                          <td className="px-4 py-3 font-medium text-[color:var(--color-ink)]">
                            {pickup.orderItem?.name}
                          </td>
                          <td className="px-4 py-3 text-[color:var(--color-ink-soft)]">
                            {pickup.user?.firstName} {pickup.user?.lastName}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={pickup.status} />
                          </td>
                          <td className="px-4 py-3 text-[color:var(--color-ink-soft)]">{pickup.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        );
      })()}
    </div>
  );
}
