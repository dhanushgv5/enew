'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ClipboardList, Hourglass, Truck as TruckIcon, CheckCircle2, UserPlus, MapPin, ChevronDown, X } from 'lucide-react';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth';
import { useConfirm } from '@/components/ConfirmProvider';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import Tooltip from '@/components/Tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Order, DeliveryBoy } from '@/types';

interface AdminOrder extends Order {
  user: {
    email: string;
    firstName?: string;
  };
  deliveryBoy?: { id: string; email: string; firstName?: string } | null;
}

export default function AdminOrdersPage() {
  const { user, hasHydrated } =
    useAuthStore();

  const confirm = useConfirm();

  const [orders, setOrders] =
    useState<AdminOrder[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [actingOn, setActingOn] =
    useState<string | null>(null);

  const [deliveryBoys, setDeliveryBoys] =
    useState<DeliveryBoy[]>([]);

  // Which delivery boy is currently selected in each order row's dropdown,
  // keyed by order id - keeps the selection independent per row.
  const [selectedDriver, setSelectedDriver] =
    useState<Record<string, string>>({});

  // Which stat card is active - clicking a card filters the table below to
  // just that bucket of orders; clicking it again (or "Total") clears it.
  const [statusFilter, setStatusFilter] =
    useState<'PENDING' | 'NEEDS_ASSIGNMENT' | 'IN_TRANSIT' | 'DELIVERED' | null>(null);

  // Which order row currently has its shipping address expanded.
  const [expandedAddressId, setExpandedAddressId] = useState<string | null>(null);

  // How many orders to fetch on each (re)load - "Load more" just bumps
  // this and reloads, so every other caller of loadOrders() (mutations,
  // socket updates) keeps working exactly as before without needing to
  // know about pages.
  const [loadLimit, setLoadLimit] = useState(50);
  const [totalOrderCount, setTotalOrderCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadOrders = async () => {
    try {
      const { data } = await api.get('/orders/admin/all', { params: { limit: loadLimit } });
      setOrders(data.items || data); // tolerate either shape during rollout
      setTotalOrderCount(data.meta?.total ?? (data.items || data).length);
    } catch (e: any) {
      toast.error(
        e.response?.data?.message ||
          'Failed to load orders',
      );
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    setLoadingMore(true);
    setLoadLimit((prev) => prev + 50);
  };

  const loadDeliveryBoys = async () => {
    try {
      const { data } = await api.get('/users/delivery-boys');
      setDeliveryBoys(data);
    } catch (e: any) {
      // Non-fatal - assignment just won't be available if this fails.
      console.error(e);
    }
  };

  useEffect(() => {
    if (
      hasHydrated &&
      user &&
      ['ADMIN', 'SUPER_ADMIN'].includes(
        user.role,
      )
    ) {
      loadOrders();
      loadDeliveryBoys();
    }
  }, [user, hasHydrated, loadLimit]);

  // Live updates: refresh the moment any order changes elsewhere (e.g. a
  // customer edits their shipping address) - no manual reload needed.
  useEffect(() => {
    if (!hasHydrated || !user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) return;
    const socket = getSocket();
    if (!socket) return;

    const onOrderUpdate = () => {
      loadOrders();
    };
    socket.on('order:update', onOrderUpdate);
    socket.on('order:new', onOrderUpdate);
    return () => {
      socket.off('order:update', onOrderUpdate);
      socket.off('order:new', onOrderUpdate);
    };
  }, [user, hasHydrated]);

  const assignDelivery = async (order: AdminOrder) => {
    const deliveryBoyId = selectedDriver[order.id];
    if (!deliveryBoyId) {
      toast.error('Pick a delivery boy first.');
      return;
    }
    const driver = deliveryBoys.find((d) => d.id === deliveryBoyId);
    const confirmed = await confirm({
      title: 'Assign delivery',
      description: `Assign order ${order.orderNumber} to ${driver?.firstName || driver?.email}?`,
      confirmLabel: 'Assign',
    });
    if (!confirmed) return;

    setActingOn(order.id);
    try {
      await api.post(`/orders/${order.id}/assign`, { deliveryBoyId });
      toast.success(`Order ${order.orderNumber} assigned for delivery.`);
      await loadOrders();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to assign delivery');
    } finally {
      setActingOn(null);
    }
  };

  const markPaid = async (
    order: AdminOrder,
  ) => {
    const confirmed = await confirm({
      title: 'Mark order paid',
      description: `Mark order ${order.orderNumber} ($${Number(order.total).toFixed(2)}) as paid?\n\nThis simulates a successful payment - there is no real payment gateway behind this button.`,
      confirmLabel: 'Mark Paid',
    });

    if (!confirmed) return;

    setActingOn(order.id);

    try {
      await api.post(
        `/orders/${order.id}/pay`,
      );

      toast.success(
        `Order ${order.orderNumber} marked as paid.`,
      );

      await loadOrders();
    } catch (e: any) {
      toast.error(
        e.response?.data?.message ||
          'Failed to mark order as paid',
      );
    } finally {
      setActingOn(null);
    }
  };

  const stats = useMemo(() => {
    const pending = orders.filter((o) => o.status === 'PENDING').length;
    const needsAssignment = orders.filter(
      (o) => ['PAID', 'PROCESSING'].includes(o.status) && !o.deliveryBoy,
    ).length;
    const inFlight = orders.filter((o) =>
      ['SHIPPED', 'OUT_FOR_DELIVERY'].includes(o.status),
    ).length;
    const delivered = orders.filter((o) => o.status === 'DELIVERED').length;
    return { total: orders.length, pending, needsAssignment, inFlight, delivered };
  }, [orders]);

  const toggleFilter = (filter: 'PENDING' | 'NEEDS_ASSIGNMENT' | 'IN_TRANSIT' | 'DELIVERED') => {
    setStatusFilter((prev) => (prev === filter ? null : filter));
  };

  const filteredOrders = useMemo(() => {
    if (!statusFilter) return orders;
    if (statusFilter === 'PENDING') return orders.filter((o) => o.status === 'PENDING');
    if (statusFilter === 'NEEDS_ASSIGNMENT')
      return orders.filter((o) => ['PAID', 'PROCESSING'].includes(o.status) && !o.deliveryBoy);
    if (statusFilter === 'IN_TRANSIT')
      return orders.filter((o) => ['SHIPPED', 'OUT_FOR_DELIVERY'].includes(o.status));
    return orders.filter((o) => o.status === 'DELIVERED');
  }, [orders, statusFilter]);

  if (!hasHydrated) {
    return (
      <div className="py-20 text-center text-[color:var(--color-ink-soft)]">
        Loading...
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Total orders"
          value={stats.total}
          icon={ClipboardList}
          tone="brand"
          onClick={() => setStatusFilter(null)}
          active={statusFilter === null}
        />
        <StatCard
          label="Awaiting payment"
          value={stats.pending}
          icon={Hourglass}
          tone="signal"
          onClick={() => toggleFilter('PENDING')}
          active={statusFilter === 'PENDING'}
        />
        <StatCard
          label="Needs assignment"
          value={stats.needsAssignment}
          icon={UserPlus}
          tone="danger"
          onClick={() => toggleFilter('NEEDS_ASSIGNMENT')}
          active={statusFilter === 'NEEDS_ASSIGNMENT'}
        />
        <StatCard
          label="In transit"
          value={stats.inFlight}
          icon={TruckIcon}
          tone="brand"
          onClick={() => toggleFilter('IN_TRANSIT')}
          active={statusFilter === 'IN_TRANSIT'}
        />
        <StatCard
          label="Delivered"
          value={stats.delivered}
          icon={CheckCircle2}
          tone="ok"
          onClick={() => toggleFilter('DELIVERED')}
          active={statusFilter === 'DELIVERED'}
        />
      </div>

      {statusFilter && (
        <div className="mb-4 flex items-center gap-2 text-sm text-[color:var(--color-ink-soft)]">
          <span>
            Showing{' '}
            {statusFilter === 'PENDING'
              ? 'orders awaiting payment'
              : statusFilter === 'NEEDS_ASSIGNMENT'
                ? 'orders needing a delivery boy'
                : statusFilter === 'IN_TRANSIT'
                  ? 'orders in transit'
                  : 'delivered orders'}
          </span>
          <button
            onClick={() => setStatusFilter(null)}
            className="inline-flex items-center gap-1 rounded-full bg-[color:var(--color-paper-dim)] px-2.5 py-1 text-xs font-medium text-[color:var(--color-ink)] hover:bg-[color:var(--color-line)]"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        </div>
      )}

      <div className="card overflow-hidden">

        <table className="w-full text-left text-sm">

          <thead className="bg-[color:var(--color-paper-dim)] text-[color:var(--color-ink-soft)]">
            <tr>
              <th className="px-4 py-3 font-semibold">
                Order
              </th>

              <th className="px-4 py-3 font-semibold">
                Customer
              </th>

              <th className="px-4 py-3 font-semibold">
                Status
              </th>

              <th className="px-4 py-3 font-semibold">
                Total
              </th>

              <th className="px-4 py-3 font-semibold">
                Placed
              </th>

              <th className="px-4 py-3">
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[color:var(--color-line)]">

            {filteredOrders.map((order) => (
              <Fragment key={order.id}>
                <tr className="hover:bg-[color:var(--color-paper-dim)]/40">

                  <td className="px-4 py-3 font-medium text-[color:var(--color-ink)]">
                    <Tooltip content="View shipping address" side="right">
                      <button
                        onClick={() =>
                          setExpandedAddressId((prev) => (prev === order.id ? null : order.id))
                        }
                        className="flex items-center gap-1.5 hover:text-[color:var(--color-brand)]"
                      >
                        <ChevronDown
                          className={`h-3.5 w-3.5 flex-shrink-0 text-[color:var(--color-ink-soft)] transition-transform ${
                            expandedAddressId === order.id ? 'rotate-180' : ''
                          }`}
                        />
                      {order.orderNumber}
                    </button>
                    </Tooltip>
                  </td>

                  <td className="px-4 py-3 text-[color:var(--color-ink-soft)]">
                    {order.user?.firstName ||
                      order.user?.email}
                  </td>

                  <td className="px-4 py-3">
                    <StatusBadge status={order.status} />
                  </td>

                  <td className="px-4 py-3 font-medium text-[color:var(--color-ink)]">
                    $
                    {Number(
                      order.total,
                    ).toFixed(2)}
                  </td>

                  <td className="px-4 py-3 text-[color:var(--color-ink-soft)]">
                    {new Date(
                      order.createdAt,
                    ).toLocaleDateString()}
                  </td>

                  <td className="px-4 py-3 text-right">

                    {order.status ===
                      'PENDING' && (
                      <button
                        onClick={() =>
                          markPaid(order)
                        }
                        disabled={
                          actingOn ===
                          order.id
                        }
                        className="btn btn-accent px-3 py-1.5 text-xs"
                      >
                        {actingOn ===
                        order.id
                          ? 'Marking...'
                          : 'Mark Paid'}
                      </button>
                    )}

                    {['PAID', 'PROCESSING'].includes(order.status) && (
                      <div className="flex items-center justify-end gap-2">
                        <Select
                          value={selectedDriver[order.id] || ''}
                          onValueChange={(v: string) =>
                            setSelectedDriver((prev) => ({ ...prev, [order.id]: v }))
                          }
                        >
                          <SelectTrigger className="w-32 py-1.5 text-xs">
                            <SelectValue placeholder="Assign to..." />
                          </SelectTrigger>
                          <SelectContent>
                            {deliveryBoys.map((d) => (
                              <SelectItem key={d.id} value={d.id}>
                                {d.firstName || d.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <button
                          onClick={() => assignDelivery(order)}
                          disabled={actingOn === order.id}
                          className="btn btn-accent px-3 py-1.5 text-xs"
                        >
                          {actingOn === order.id ? 'Assigning...' : 'Assign'}
                        </button>
                      </div>
                    )}

                    {['SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status) &&
                      order.deliveryBoy && (
                        <span className="text-xs text-[color:var(--color-ink-soft)]">
                          Driver: {order.deliveryBoy.firstName || order.deliveryBoy.email}
                        </span>
                      )}

                  </td>

                </tr>

                {expandedAddressId === order.id && order.shippingAddress && (
                  <tr className="bg-[color:var(--color-paper-dim)]/40">
                    <td colSpan={6} className="px-4 py-3">
                      <div className="flex items-start gap-2 text-xs text-[color:var(--color-ink-soft)]">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[color:var(--color-brand)]" />
                        <span>
                          {order.shippingAddress.firstName} {order.shippingAddress.lastName} &middot;{' '}
                          {order.shippingAddress.street}, {order.shippingAddress.city},{' '}
                          {order.shippingAddress.state} {order.shippingAddress.postalCode},{' '}
                          {order.shippingAddress.country}
                          {order.shippingAddress.phone && ` \u00b7 ${order.shippingAddress.phone}`}
                        </span>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}

            {filteredOrders.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-[color:var(--color-ink-soft)]"
                >
                  {statusFilter ? 'No orders match this filter.' : 'No orders yet.'}
                </td>
              </tr>
            )}

          </tbody>
        </table>
      </div>

      {orders.length < totalOrderCount && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <p className="text-xs text-[color:var(--color-ink-soft)]">
            Showing {orders.length} of {totalOrderCount} orders
          </p>
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="btn btn-ghost px-6 py-2 text-sm"
          >
            {loadingMore ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}