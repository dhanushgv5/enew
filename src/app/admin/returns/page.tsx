'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  RotateCcw,
  Inbox,
  Truck as TruckIcon,
  CheckCircle2,
  XCircle,
  ImageOff,
  Search,
  Calendar as CalendarIcon,
} from 'lucide-react';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth';
import { useConfirm } from '@/components/ConfirmProvider';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import Calendar from '@/components/ui/calendar';
import type { DeliveryBoy, ReturnRequest, ReturnRequestStatus } from '@/types';

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/api\/?$/, '');
function photoUrl(path: string) {
  return path.startsWith('http') ? path : `${API_ORIGIN}${path}`;
}

// Pickup + Received are driven by the assigned delivery boy from their own
// dashboard, not from here - this map only covers admin-driven statuses.
const FILTERS: { value: ReturnRequestStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'REQUESTED', label: 'Requested' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PICKUP_SCHEDULED', label: 'Pickup scheduled' },
  { value: 'PICKED_UP', label: 'Picked up' },
  { value: 'RECEIVED', label: 'Received' },
  { value: 'REFUNDED', label: 'Refunded' },
  { value: 'REPLACED', label: 'Replaced' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function AdminReturnsPage() {
  const { user, hasHydrated } = useAuthStore();
  const confirm = useConfirm();

  const [requests, setRequests] = useState<ReturnRequest[]>([]);
  const [deliveryBoys, setDeliveryBoys] = useState<DeliveryBoy[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ReturnRequestStatus | ''>('');
  const [search, setSearch] = useState('');
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [refundInputs, setRefundInputs] = useState<Record<string, string>>({});
  const [pickupDateInputs, setPickupDateInputs] = useState<Record<string, string>>({});
  const [pickupDriverInputs, setPickupDriverInputs] = useState<Record<string, string>>({});

  const loadDeliveryBoys = async () => {
    try {
      const { data } = await api.get('/users/delivery-boys');
      setDeliveryBoys(data);
    } catch (e: any) {
      console.error(e);
    }
  };

  const loadRequests = async (status?: ReturnRequestStatus | '') => {
    try {
      const { data } = await api.get('/returns/admin/all', {
        params: { limit: 100, ...(status && { status }) },
      });
      // Backend now returns { items, meta } for pagination - tolerate the
      // old plain-array shape too in case anything's still mid-deploy.
      setRequests(Array.isArray(data) ? data : data.items || []);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load return requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasHydrated && user && ['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      loadRequests();
      loadDeliveryBoys();
    }
  }, [user, hasHydrated]);

  // Live updates: reflect new requests / customer withdrawals instantly.
  useEffect(() => {
    if (!hasHydrated || !user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) return;
    const socket = getSocket();
    if (!socket) return;

    const onReturnUpdate = () => loadRequests(statusFilter);
    socket.on('return:update', onReturnUpdate);
    return () => {
      socket.off('return:update', onReturnUpdate);
    };
  }, [user, hasHydrated, statusFilter]);

  const changeFilter = (status: ReturnRequestStatus | '') => {
    setStatusFilter(status);
    setLoading(true);
    loadRequests(status);
  };

  const stats = useMemo(() => {
    const requested = requests.filter((r) => r.status === 'REQUESTED').length;
    const inProgress = requests.filter((r) =>
      ['APPROVED', 'PICKUP_SCHEDULED', 'PICKED_UP'].includes(r.status),
    ).length;
    const received = requests.filter((r) => r.status === 'RECEIVED').length;
    const completed = requests.filter((r) => ['REFUNDED', 'REPLACED'].includes(r.status)).length;
    return { requested, inProgress, received, completed };
  }, [requests]);

  const filtered = useMemo(() => {
    if (!search.trim()) return requests;
    const q = search.trim().toLowerCase();
    return requests.filter(
      (r) =>
        r.orderItem?.name?.toLowerCase().includes(q) ||
        r.order?.orderNumber?.toLowerCase().includes(q) ||
        r.reason?.toLowerCase().includes(q) ||
        [r.user?.firstName, r.user?.lastName].filter(Boolean).join(' ').toLowerCase().includes(q),
    );
  }, [requests, search]);

  const runTransition = async (
    request: ReturnRequest,
    nextStatus: ReturnRequestStatus,
    opts?: { refundAmount?: number },
  ) => {
    setActingOn(request.id);
    try {
      await api.patch(`/returns/${request.id}/status`, {
        status: nextStatus,
        note: noteInputs[request.id] || undefined,
        ...(opts?.refundAmount !== undefined && { refundAmount: opts.refundAmount }),
      });
      toast.success(`Request moved to ${nextStatus.replace(/_/g, ' ').toLowerCase()}.`);
      setNoteInputs((prev) => ({ ...prev, [request.id]: '' }));
      await loadRequests(statusFilter);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to update request');
    } finally {
      setActingOn(null);
    }
  };

  const approve = (request: ReturnRequest) => runTransition(request, 'APPROVED');

  const reject = async (request: ReturnRequest) => {
    const confirmed = await confirm({
      title: 'Reject request',
      description: `Reject this ${request.type === 'RETURN' ? 'return' : 'replacement'} request for "${request.orderItem?.name}"?`,
      confirmLabel: 'Reject',
      danger: true,
    });
    if (!confirmed) return;
    await runTransition(request, 'REJECTED');
  };

  const schedulePickup = async (request: ReturnRequest) => {
    const pickupDate = pickupDateInputs[request.id];
    const deliveryBoyId = pickupDriverInputs[request.id];
    if (!pickupDate) {
      toast.error('Pick a pickup date first.');
      return;
    }
    if (!deliveryBoyId) {
      toast.error('Choose a delivery boy first.');
      return;
    }

    setActingOn(request.id);
    try {
      await api.patch(`/returns/${request.id}/schedule-pickup`, {
        pickupDate: new Date(pickupDate).toISOString(),
        deliveryBoyId,
        note: noteInputs[request.id] || undefined,
      });
      toast.success('Pickup scheduled.');
      setNoteInputs((prev) => ({ ...prev, [request.id]: '' }));
      await loadRequests(statusFilter);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to schedule pickup');
    } finally {
      setActingOn(null);
    }
  };

  const markRefunded = (request: ReturnRequest) => {
    const raw = refundInputs[request.id];
    const refundAmount = raw !== undefined && raw !== '' ? Number(raw) : undefined;
    runTransition(request, 'REFUNDED', { refundAmount });
  };

  const markReplaced = (request: ReturnRequest) => runTransition(request, 'REPLACED');

  const defaultRefund = (request: ReturnRequest) =>
    (Number(request.orderItem?.price || 0) * request.quantity).toFixed(2);

  if (!hasHydrated || loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="New requests"
          value={stats.requested}
          icon={Inbox}
          tone="signal"
          onClick={() => changeFilter(statusFilter === 'REQUESTED' ? '' : 'REQUESTED')}
          active={statusFilter === 'REQUESTED'}
        />
        <StatCard label="In progress" value={stats.inProgress} icon={TruckIcon} tone="brand" />
        <StatCard
          label="Awaiting decision"
          value={stats.received}
          icon={RotateCcw}
          tone="danger"
          onClick={() => changeFilter(statusFilter === 'RECEIVED' ? '' : 'RECEIVED')}
          active={statusFilter === 'RECEIVED'}
        />
        <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} tone="ok" />
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--color-ink-soft)]" />
          <input
            placeholder="Search item, order, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 rounded-xl border border-gray-300 bg-white pl-12 pr-4 text-gray-900 placeholder:text-gray-500 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
          />
        </div>
        <Select value={statusFilter || 'ALL'} onValueChange={(v: string) => changeFilter(v === 'ALL' ? '' : (v as ReturnRequestStatus))}>
          <SelectTrigger className="max-w-xs">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            {FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value || 'ALL'}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="card py-16 text-center text-[color:var(--color-ink-soft)]">
          No return or replacement requests found.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((request) => {
            return (
              <div key={request.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-paper-dim)]">
                      {request.orderItem?.product?.images?.[0] ? (
                        <img
                          src={request.orderItem.product.images[0]}
                          alt={request.orderItem.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[color:var(--color-ink-soft)]">
                          <ImageOff className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-[color:var(--color-ink)]">
                          {request.type === 'RETURN' ? 'Return' : 'Replacement'} &middot;{' '}
                          {request.orderItem?.name}
                        </span>
                        <StatusBadge status={request.status} />
                      </div>
                      <p className="mt-1 text-xs text-[color:var(--color-ink-soft)]">
                        Order {request.order?.orderNumber} &middot; Qty {request.quantity} &middot;{' '}
                        {[request.user?.firstName, request.user?.lastName].filter(Boolean).join(' ') ||
                          request.user?.email}{' '}
                        &middot; {new Date(request.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-sm">
                  <p className="text-[color:var(--color-ink)]">
                    <span className="font-semibold">Reason: </span>
                    {request.reason}
                  </p>
                  {request.description && (
                    <p className="mt-1 text-[color:var(--color-ink-soft)]">{request.description}</p>
                  )}
                </div>

                {!!request.photos?.length && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {request.photos.map((p) => (
                      <a key={p} href={photoUrl(p)} target="_blank" rel="noreferrer">
                        <img
                          src={photoUrl(p)}
                          alt="Proof"
                          className="h-14 w-14 rounded-lg border border-[color:var(--color-line)] object-cover"
                        />
                      </a>
                    ))}
                  </div>
                )}

                {request.adminNote && (
                  <p className="mt-3 text-xs text-[color:var(--color-ink-soft)]">
                    <span className="font-semibold">Note: </span>
                    {request.adminNote}
                  </p>
                )}
                {request.status === 'REFUNDED' && request.refundAmount != null && (
                  <p className="mt-1 text-xs font-semibold text-[color:var(--color-ok)]">
                    Refunded ${Number(request.refundAmount).toFixed(2)}
                  </p>
                )}

                {/* Actions */}
                {request.status === 'REQUESTED' && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[color:var(--color-line)] pt-4">
                    <input
                      placeholder="Optional note..."
                      value={noteInputs[request.id] || ''}
                      onChange={(e) => setNoteInputs((prev) => ({ ...prev, [request.id]: e.target.value }))}
                      className="input-field w-48 py-1.5 text-xs"
                    />
                    <button
                      onClick={() => approve(request)}
                      disabled={actingOn === request.id}
                      className="btn btn-accent px-3 py-1.5 text-xs"
                    >
                      {actingOn === request.id ? 'Working...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => reject(request)}
                      disabled={actingOn === request.id}
                      className="btn btn-danger px-3 py-1.5 text-xs"
                    >
                      Reject
                    </button>
                  </div>
                )}

                {request.status === 'APPROVED' && (
                  <div className="mt-4 space-y-2 border-t border-[color:var(--color-line)] pt-4">
                    <p className="text-xs font-semibold text-[color:var(--color-ink)]">Schedule pickup</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="input-field flex w-40 items-center gap-2 py-1.5 text-xs"
                          >
                            <CalendarIcon className="h-3.5 w-3.5 text-[color:var(--color-ink-soft)]" />
                            {pickupDateInputs[request.id]
                              ? new Date(pickupDateInputs[request.id]).toLocaleDateString()
                              : 'Pick a date'}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto">
                          <Calendar
                            selected={pickupDateInputs[request.id] ? new Date(pickupDateInputs[request.id]) : undefined}
                            disabled={(date) => date < new Date(new Date().toDateString())}
                            onSelect={(date) =>
                              setPickupDateInputs((prev) => ({
                                ...prev,
                                [request.id]: date.toISOString().slice(0, 10),
                              }))
                            }
                          />
                        </PopoverContent>
                      </Popover>

                      <Select
                        value={pickupDriverInputs[request.id] || ''}
                        onValueChange={(v: string) =>
                          setPickupDriverInputs((prev) => ({ ...prev, [request.id]: v }))
                        }
                      >
                        <SelectTrigger className="w-40 py-1.5 text-xs">
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
                        onClick={() => schedulePickup(request)}
                        disabled={actingOn === request.id}
                        className="btn btn-accent px-3 py-1.5 text-xs"
                      >
                        <TruckIcon className="h-3.5 w-3.5" />
                        {actingOn === request.id ? 'Scheduling...' : 'Schedule pickup'}
                      </button>
                    </div>
                  </div>
                )}

                {['PICKUP_SCHEDULED', 'PICKED_UP'].includes(request.status) && (
                  <div className="mt-4 flex items-center gap-1.5 border-t border-[color:var(--color-line)] pt-4 text-xs text-[color:var(--color-ink-soft)]">
                    <TruckIcon className="h-3.5 w-3.5 text-[color:var(--color-brand)]" />
                    {request.status === 'PICKUP_SCHEDULED' ? 'Awaiting pickup by' : 'Picked up by'}{' '}
                    <span className="font-semibold text-[color:var(--color-ink)]">
                      {request.deliveryBoy?.firstName || request.deliveryBoy?.email}
                    </span>
                    {request.pickupDate && (
                      <>&middot; scheduled for {new Date(request.pickupDate).toLocaleDateString()}</>
                    )}
                  </div>
                )}

                {request.status === 'RECEIVED' && request.type === 'RETURN' && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[color:var(--color-line)] pt-4">
                    <div className="flex items-center gap-1 text-xs text-[color:var(--color-ink-soft)]">
                      <span>$</span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder={defaultRefund(request)}
                        value={refundInputs[request.id] ?? ''}
                        onChange={(e) =>
                          setRefundInputs((prev) => ({ ...prev, [request.id]: e.target.value }))
                        }
                        className="input-field w-24 py-1.5 text-xs"
                      />
                    </div>
                    <button
                      onClick={() => markRefunded(request)}
                      disabled={actingOn === request.id}
                      className="btn btn-accent px-3 py-1.5 text-xs"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {actingOn === request.id ? 'Working...' : 'Mark refunded'}
                    </button>
                  </div>
                )}

                {request.status === 'RECEIVED' && request.type === 'REPLACEMENT' && (
                  <div className="mt-4 flex items-center gap-2 border-t border-[color:var(--color-line)] pt-4">
                    <button
                      onClick={() => markReplaced(request)}
                      disabled={actingOn === request.id}
                      className="btn btn-accent px-3 py-1.5 text-xs"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {actingOn === request.id ? 'Working...' : 'Mark replaced'}
                    </button>
                  </div>
                )}

                {['REJECTED', 'CANCELLED'].includes(request.status) && (
                  <p className="mt-4 flex items-center gap-1.5 border-t border-[color:var(--color-line)] pt-4 text-xs text-[color:var(--color-ink-soft)]">
                    <XCircle className="h-3.5 w-3.5" />
                    {request.status === 'REJECTED' ? 'This request was rejected.' : 'Withdrawn by customer.'}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
