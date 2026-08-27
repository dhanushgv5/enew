 'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { User, Lock, MapPin, Plus, Star, Pencil, Trash2, X } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useConfirm } from '@/components/ConfirmProvider';
import AddressFormFields from '@/components/AddressFormFields';
import Tooltip from '@/components/Tooltip';
import type { Address } from '@/types';

const emptyAddressForm = {
  label: '',
  firstName: '',
  lastName: '',
  street: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  phone: '',
  isDefault: false,
};

export default function ProfilePage() {
  const router = useRouter();
  const confirm = useConfirm();
  const { user, hasHydrated, setUser } = useAuthStore();

  // ---- Personal info ----
  const [infoForm, setInfoForm] = useState({ firstName: '', lastName: '', phone: '' });
  const [savingInfo, setSavingInfo] = useState(false);

  // ---- Password ----
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savingPw, setSavingPw] = useState(false);

  // ---- Addresses ----
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [addressForm, setAddressForm] = useState(emptyAddressForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!user) {
      router.push('/login');
      return;
    }
    setInfoForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phone: user.phone || '',
    });
    loadAddresses();
  }, [user, hasHydrated]);

  const loadAddresses = async () => {
    try {
      const { data } = await api.get('/addresses');
      setAddresses(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAddresses(false);
    }
  };

  // ---- Personal info handlers ----

  const saveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingInfo(true);
    try {
      const { data } = await api.patch('/users/me', infoForm);
      setUser(data);
      toast.success('Profile updated');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not update profile');
    } finally {
      setSavingInfo(false);
    }
  };

  // ---- Password handlers ----

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setSavingPw(true);
    try {
      await api.patch('/users/me/password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      toast.success('Password updated');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not update password');
    } finally {
      setSavingPw(false);
    }
  };

  // ---- Address handlers ----

  const openAddForm = () => {
    setEditingId(null);
    setAddressForm(emptyAddressForm);
    setShowAddressForm(true);
  };

  const openEditForm = (addr: Address) => {
    setEditingId(addr.id);
    setAddressForm({
      label: addr.label || '',
      firstName: addr.firstName,
      lastName: addr.lastName,
      street: addr.street,
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode,
      country: addr.country,
      phone: addr.phone || '',
      isDefault: addr.isDefault,
    });
    setShowAddressForm(true);
  };

  const closeForm = () => {
    setShowAddressForm(false);
    setEditingId(null);
    setAddressForm(emptyAddressForm);
  };

  const saveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAddress(true);
    try {
      if (editingId) {
        await api.patch(`/addresses/${editingId}`, addressForm);
        toast.success('Address updated');
      } else {
        await api.post('/addresses', addressForm);
        toast.success('Address added');
      }
      await loadAddresses();
      closeForm();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not save address');
    } finally {
      setSavingAddress(false);
    }
  };

  const deleteAddress = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete address?',
      description: 'This address will be removed from your saved addresses.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!confirmed) return;
    try {
      await api.delete(`/addresses/${id}`);
      toast.success('Address deleted');
      await loadAddresses();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not delete address');
    }
  };

  const makeDefault = async (id: string) => {
    try {
      await api.patch(`/addresses/${id}/default`);
      await loadAddresses();
      toast.success('Default address updated');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not set default');
    }
  };

  if (!hasHydrated || !user) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-40 rounded-2xl" />
        <div className="skeleton h-40 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-8 font-display text-3xl font-bold text-[color:var(--color-ink)]">My Profile</h1>

      <div className="space-y-6">
        {/* PERSONAL INFO */}
        <div className="card p-6">
          <div className="mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-[color:var(--color-brand)]" />
            <h2 className="font-display text-lg font-semibold text-[color:var(--color-ink)]">Personal info</h2>
          </div>
          <form onSubmit={saveInfo} className="space-y-4">
            <div>
              <label className="label-field">Email</label>
              <input value={user.email} disabled className="input-field opacity-60" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-field">First name</label>
                <input
                  value={infoForm.firstName}
                  onChange={(e) => setInfoForm({ ...infoForm, firstName: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-field">Last name</label>
                <input
                  value={infoForm.lastName}
                  onChange={(e) => setInfoForm({ ...infoForm, lastName: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>
            <div>
              <label className="label-field">Phone</label>
              <input
                value={infoForm.phone}
                onChange={(e) => setInfoForm({ ...infoForm, phone: e.target.value })}
                className="input-field"
                placeholder="+1 234 567 8900"
              />
            </div>
            <button type="submit" disabled={savingInfo} className="btn btn-primary px-5 py-2.5 text-sm">
              {savingInfo ? 'Saving...' : 'Save changes'}
            </button>
          </form>
        </div>

        {/* PASSWORD */}
        <div className="card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Lock className="h-5 w-5 text-[color:var(--color-brand)]" />
            <h2 className="font-display text-lg font-semibold text-[color:var(--color-ink)]">Change password</h2>
          </div>
          <form onSubmit={savePassword} className="space-y-4">
            <div>
              <label className="label-field">Current password</label>
              <input
                type="password"
                required
                value={pwForm.currentPassword}
                onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                className="input-field"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-field">New password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={pwForm.newPassword}
                  onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-field">Confirm new password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={pwForm.confirmPassword}
                  onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>
            <button type="submit" disabled={savingPw} className="btn btn-primary px-5 py-2.5 text-sm">
              {savingPw ? 'Updating...' : 'Update password'}
            </button>
          </form>
        </div>

        {/* ADDRESSES */}
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-[color:var(--color-brand)]" />
              <h2 className="font-display text-lg font-semibold text-[color:var(--color-ink)]">Saved addresses</h2>
            </div>
            {!showAddressForm && (
              <button onClick={openAddForm} className="btn btn-ghost px-3 py-1.5 text-sm">
                <Plus className="h-4 w-4" /> Add address
              </button>
            )}
          </div>

          {loadingAddresses ? (
            <div className="space-y-3">
              <div className="skeleton h-20 rounded-xl" />
              <div className="skeleton h-20 rounded-xl" />
            </div>
          ) : (
            <div className="space-y-3">
              {addresses.length === 0 && !showAddressForm && (
                <p className="text-sm text-[color:var(--color-ink-soft)]">
                  No saved addresses yet. Add one so checkout is faster.
                </p>
              )}
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-[color:var(--color-line)] p-4"
                >
                  <div className="text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[color:var(--color-ink)]">
                        {addr.label || `${addr.firstName} ${addr.lastName}`}
                      </span>
                      {addr.isDefault && (
                        <span className="flex items-center gap-1 rounded-full bg-[color:var(--color-brand-soft)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--color-brand-glow)]">
                          <Star className="h-2.5 w-2.5 fill-current" /> Default
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[color:var(--color-ink-soft)]">
                      {addr.firstName} {addr.lastName} · {addr.street}, {addr.city}, {addr.state}{' '}
                      {addr.postalCode}, {addr.country}
                    </p>
                    {addr.phone && <p className="text-[color:var(--color-ink-soft)]">{addr.phone}</p>}
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1">
                    {!addr.isDefault && (
                      <Tooltip content="Set as default">
                        <button
                          onClick={() => makeDefault(addr.id)}
                          aria-label="Set as default"
                          className="rounded-lg p-2 text-[color:var(--color-ink-soft)] hover:bg-[color:var(--color-paper-dim)] hover:text-[color:var(--color-brand)]"
                        >
                          <Star className="h-4 w-4" />
                        </button>
                      </Tooltip>
                    )}
                    <Tooltip content="Edit address">
                      <button
                        onClick={() => openEditForm(addr)}
                        aria-label="Edit address"
                        className="rounded-lg p-2 text-[color:var(--color-ink-soft)] hover:bg-[color:var(--color-paper-dim)] hover:text-[color:var(--color-brand)]"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </Tooltip>
                    <Tooltip content="Delete address">
                      <button
                        onClick={() => deleteAddress(addr.id)}
                        aria-label="Delete address"
                        className="rounded-lg p-2 text-[color:var(--color-ink-soft)] hover:bg-[color:var(--color-danger-soft)] hover:text-[color:var(--color-danger)]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showAddressForm && (
            <form onSubmit={saveAddress} className="mt-4 space-y-4 rounded-xl border border-[color:var(--color-line)] p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[color:var(--color-ink)]">
                  {editingId ? 'Edit address' : 'New address'}
                </h3>
                <button type="button" onClick={closeForm} className="rounded-lg p-1 text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)]">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <AddressFormFields value={addressForm} onChange={setAddressForm} />
              <label className="flex items-center gap-2 text-sm text-[color:var(--color-ink-soft)]">
                <input
                  type="checkbox"
                  checked={addressForm.isDefault}
                  onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                  className="h-4 w-4 rounded border-[color:var(--color-line)]"
                />
                Set as default address
              </label>
              <button type="submit" disabled={savingAddress} className="btn btn-primary px-5 py-2.5 text-sm">
                {savingAddress ? 'Saving...' : editingId ? 'Save changes' : 'Add address'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
