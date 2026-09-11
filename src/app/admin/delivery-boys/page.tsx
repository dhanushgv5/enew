'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Users, UserCheck, UserX, Plus, Pencil, Save, X } from 'lucide-react';
import api from '@/lib/api';
import { useConfirm } from '@/components/ConfirmProvider';
import StatCard from '@/components/StatCard';
import type { DeliveryBoy } from '@/types';

// Digits, spaces, and + - ( ) only - mirrors the backend's validation so the
// user gets instant feedback instead of a round trip to find out it's rejected.
const PHONE_PATTERN = '^\\+?[\\d\\s\\-().]{7,20}$';

const emptyForm = { email: '', password: '', firstName: '', lastName: '', phone: '' };
const emptyEditForm = { firstName: '', lastName: '', phone: '' };

export default function AdminDeliveryBoysPage() {
  const confirm = useConfirm();
  const [deliveryBoys, setDeliveryBoys] = useState<DeliveryBoy[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const load = async () => {
    try {
      const { data } = await api.get('/users/delivery-boys');
      setDeliveryBoys(data);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load delivery boys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setShowForm(false);
  };

  const createDeliveryBoy = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/users/delivery-boys', form);
      toast.success(`Delivery boy account created for ${form.email}.`);
      resetForm();
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to create delivery boy');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (d: DeliveryBoy) => {
    setEditingId(d.id);
    setEditForm({
      firstName: d.firstName || '',
      lastName: d.lastName || '',
      phone: d.phone || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(emptyEditForm);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setActingOn(editingId);
    try {
      await api.patch(`/users/delivery-boys/${editingId}`, editForm);
      toast.success('Delivery boy updated.');
      cancelEdit();
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to update delivery boy');
    } finally {
      setActingOn(null);
    }
  };

  const deactivate = async (d: DeliveryBoy) => {
    const confirmed = await confirm({
      title: 'Deactivate delivery boy',
      description: `Deactivate ${d.firstName || d.email}? They won't be eligible for new deliveries, but their delivery history is kept.`,
      confirmLabel: 'Deactivate',
      danger: true,
    });
    if (!confirmed) return;

    setActingOn(d.id);
    try {
      await api.delete(`/users/delivery-boys/${d.id}`);
      toast.success(`${d.firstName || d.email} deactivated.`);
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to deactivate delivery boy');
    } finally {
      setActingOn(null);
    }
  };

  const reactivate = async (d: DeliveryBoy) => {
    setActingOn(d.id);
    try {
      await api.patch(`/users/delivery-boys/${d.id}`, { isActive: true });
      toast.success(`${d.firstName || d.email} reactivated.`);
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to reactivate delivery boy');
    } finally {
      setActingOn(null);
    }
  };

  const stats = useMemo(() => {
    const active = deliveryBoys.filter((d) => d.isActive).length;
    return { total: deliveryBoys.length, active, inactive: deliveryBoys.length - active };
  }, [deliveryBoys]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-72 rounded-2xl" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total partners" value={stats.total} icon={Users} tone="brand" />
        <StatCard label="Active" value={stats.active} icon={UserCheck} tone="ok" />
        <StatCard label="Inactive" value={stats.inactive} icon={UserX} tone="danger" />
      </div>

      <div className="mb-6 flex items-center justify-end">
        <button
          onClick={() => setShowForm((s) => !s)}
          className="btn btn-primary px-4 py-2.5 text-sm"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? 'Cancel' : 'Add Delivery Boy'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createDeliveryBoy} className="card mb-8 animate-rise p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <input
              required
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input-field"
            />
            <input
              required
              type="password"
              minLength={8}
              placeholder="Password (min 8 chars)"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input-field"
            />
            <input
              placeholder="First name"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              className="input-field"
            />
            <input
              placeholder="Last name"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              className="input-field"
            />
            <input
              type="tel"
              placeholder="Phone e.g. +1 555 123 4567"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              pattern={PHONE_PATTERN}
              title="Digits, spaces, +, -, ( ) only"
              className="input-field md:col-span-2"
            />
          </div>
          <button type="submit" disabled={saving} className="btn btn-primary mt-5 px-6 py-2.5 text-sm">
            {saving ? 'Creating...' : 'Create Account'}
          </button>
        </form>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[color:var(--color-paper-dim)] text-[color:var(--color-ink-soft)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Phone</th>
              <th className="px-4 py-3 font-semibold">Deliveries</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--color-line)]">
            {deliveryBoys.map((d) =>
              editingId === d.id ? (
                <tr key={d.id} className="bg-[color:var(--color-brand-soft)]/50">
                  <td className="px-4 py-3" colSpan={6}>
                    <form onSubmit={saveEdit} className="flex flex-wrap items-center gap-2">
                      <input
                        placeholder="First name"
                        value={editForm.firstName}
                        onChange={(e) =>
                          setEditForm({ ...editForm, firstName: e.target.value })
                        }
                        className="input-field w-36 py-1.5 text-sm"
                      />
                      <input
                        placeholder="Last name"
                        value={editForm.lastName}
                        onChange={(e) =>
                          setEditForm({ ...editForm, lastName: e.target.value })
                        }
                        className="input-field w-36 py-1.5 text-sm"
                      />
                      <input
                        type="tel"
                        placeholder="Phone"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        pattern={PHONE_PATTERN}
                        title="Digits, spaces, +, -, ( ) only"
                        className="input-field w-40 py-1.5 text-sm"
                      />
                      <button
                        type="submit"
                        disabled={actingOn === d.id}
                        className="btn btn-accent px-3 py-1.5 text-xs"
                      >
                        <Save className="h-3.5 w-3.5" /> {actingOn === d.id ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="btn btn-ghost px-3 py-1.5 text-xs"
                      >
                        Cancel
                      </button>
                    </form>
                  </td>
                </tr>
              ) : (
                <tr key={d.id} className="hover:bg-[color:var(--color-paper-dim)]/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--color-brand-soft)] text-xs font-bold text-[color:var(--color-brand)]">
                        {(d.firstName?.[0] || d.email[0]).toUpperCase()}
                      </span>
                      <span className="font-medium text-[color:var(--color-ink)]">
                        {d.firstName || d.lastName
                          ? `${d.firstName || ''} ${d.lastName || ''}`.trim()
                          : '-'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[color:var(--color-ink-soft)]">{d.email}</td>
                  <td className="px-4 py-3 text-[color:var(--color-ink-soft)]">{d.phone || '-'}</td>
                  <td className="px-4 py-3 text-[color:var(--color-ink-soft)]">{d._count?.deliveries ?? 0}</td>
                  <td className="px-4 py-3">
                    <span
                      className="chip"
                      style={
                        d.isActive
                          ? { backgroundColor: 'var(--color-ok-soft)', color: 'var(--color-ok)' }
                          : { backgroundColor: 'var(--color-paper-dim)', color: 'var(--color-ink-soft)' }
                      }
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: d.isActive ? 'var(--color-ok)' : '#9a988e' }}
                      />
                      {d.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(d)}
                        className="btn btn-ghost px-3 py-1.5 text-xs"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      {d.isActive ? (
                        <button
                          onClick={() => deactivate(d)}
                          disabled={actingOn === d.id}
                          className="btn btn-danger px-3 py-1.5 text-xs"
                        >
                          {actingOn === d.id ? 'Deactivating...' : 'Delete'}
                        </button>
                      ) : (
                        <button
                          onClick={() => reactivate(d)}
                          disabled={actingOn === d.id}
                          className="btn btn-accent px-3 py-1.5 text-xs"
                        >
                          {actingOn === d.id ? 'Reactivating...' : 'Reactivate'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ),
            )}
            {deliveryBoys.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[color:var(--color-ink-soft)]">
                  No delivery boys yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
