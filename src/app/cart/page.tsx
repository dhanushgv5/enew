'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Minus, Plus, Trash2, ShoppingBag, ImageOff, ShieldCheck, MapPin, Plus as PlusIcon, X } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';
import { useConfirm } from '@/components/ConfirmProvider';
import AddressFormFields from '@/components/AddressFormFields';
import Tooltip from '@/components/Tooltip';
import { payForOrder } from '@/lib/razorpay';
import type { Cart, Address } from '@/types';

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

export default function CartPage() {
  const router = useRouter();
  const confirm = useConfirm();
  const { user, hasHydrated } = useAuthStore();
  const { setItemCount } = useCartStore();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const isCheckingOutRef = useRef(false);

  // ---- Delivery address ----
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState(emptyAddressForm);
  const [savingAddress, setSavingAddress] = useState(false);

  const loadCart = async () => {
    try {
      const { data } = await api.get('/cart');
      setCart(data);
      setItemCount(data.itemCount || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadAddresses = async () => {
    try {
      const { data } = await api.get('/addresses');
      setAddresses(data);
      const def = data.find((a: Address) => a.isDefault) || data[0];
      if (def) setSelectedAddressId(def.id);
      if (data.length === 0) setShowAddressForm(true);
    } catch (e) {
      console.error(e);
    }
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
    loadCart();
    loadAddresses();
  }, [user, hasHydrated]);

  const saveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAddress(true);
    try {
      const { data } = await api.post('/addresses', addressForm);
      await loadAddresses();
      setSelectedAddressId(data.id);
      setShowAddressForm(false);
      setAddressForm(emptyAddressForm);
      toast.success('Address saved');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not save address');
    } finally {
      setSavingAddress(false);
    }
  };

  const updateQty = async (itemId: string, quantity: number) => {
    try {
      await api.patch(`/cart/items/${itemId}`, { quantity });
      await loadCart();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not update quantity');
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      await api.delete(`/cart/items/${itemId}`);
      await loadCart();
      toast.success('Item removed');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not remove item');
    }
  };

  const checkout = async () => {
    if (!cart) return;
    const selectedAddress = addresses.find((a) => a.id === selectedAddressId);
    if (!selectedAddress) {
      toast.error('Add or select a delivery address first');
      return;
    }
    const total = (Number(cart.subtotal) * 1.1 + 9.99).toFixed(2);
    const confirmed = await confirm({
      title: 'Proceed to payment?',
      description:
        `Pay $${total} for this order (${cart.itemCount} item${cart.itemCount === 1 ? '' : 's'})?\n\n` +
        `Deliver to: ${selectedAddress.street}, ${selectedAddress.city}\n\n` +
        `You'll be taken to Razorpay to complete payment.`,
      confirmLabel: 'Pay Now',
    });
    if (!confirmed) return;

    if (isCheckingOutRef.current) return;
    isCheckingOutRef.current = true;
    setCheckingOut(true);
    try {
      const { data: order } = await api.post('/orders', {
        shippingAddress: {
          firstName: selectedAddress.firstName,
          lastName: selectedAddress.lastName,
          street: selectedAddress.street,
          city: selectedAddress.city,
          state: selectedAddress.state,
          postalCode: selectedAddress.postalCode,
          country: selectedAddress.country,
          phone: selectedAddress.phone || undefined,
        },
      });
      setItemCount(0);

      // Order is created PENDING (stock reserved). Open Razorpay immediately
      // on top of the cart page rather than sending the customer to the
      // order page first - payment happens as one continuous action instead
      // of a separate "place order, then remember to go pay" step. The
      // order is only PAID once the backend verifies the payment signature.
      const customerName = user ? `${user.firstName} ${user.lastName}`.trim() : undefined;
      try {
        await payForOrder(
          order.id,
          customerName,
          () => {
            toast.success('Payment successful! Order confirmed.');
            router.push(`/orders/${order.id}`);
          },
          () => {
            toast('Order saved - you can complete payment anytime from your orders.', { icon: 'ℹ️' });
            router.push(`/orders/${order.id}`);
          },
        );
      } catch (payErr: any) {
        // Order still exists as PENDING even if the payment step itself
        // errored (e.g. Razorpay script hiccup) - send them to the order
        // page where the Pay Now button lets them retry.
        toast.error(payErr.response?.data?.message || payErr.message || 'Payment could not be started - you can retry from your order.');
        router.push(`/orders/${order.id}`);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Checkout failed');
    } finally {
      isCheckingOutRef.current = false;
      setCheckingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-72 rounded-2xl" />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="card mx-auto max-w-md py-16 text-center">
        <ShoppingBag className="mx-auto h-10 w-10 text-[color:var(--color-ink-soft)]" />
        <p className="mt-3 text-[color:var(--color-ink-soft)]">Your cart is empty.</p>
        <Link href="/products" className="btn btn-accent mt-5 inline-flex px-5 py-2.5 text-sm">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-8 font-display text-3xl font-bold text-[color:var(--color-ink)]">Shopping Cart</h1>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="stagger space-y-4 lg:col-span-2">
          {cart.items.map((item) => (
            <div key={item.id} className="card flex gap-4 p-4">
              <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-[color:var(--color-paper-dim)]">
                {item.product.images?.[0] ? (
                  <img
                    src={item.product.images[0]}
                    alt={item.product.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[color:var(--color-ink-soft)]">
                    <ImageOff className="h-6 w-6" />
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col">
                <Link
                  href={`/products/${item.product.slug}`}
                  className="font-semibold text-[color:var(--color-ink)] hover:text-[color:var(--color-brand)]"
                >
                  {item.product.name}
                </Link>
                <p className="text-sm text-[color:var(--color-ink-soft)]">
                  ${Number(item.product.price).toFixed(2)} each
                </p>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <div className="flex items-center rounded-lg border border-[color:var(--color-line)]">
                    <Tooltip content="Decrease quantity">
                      <button
                        onClick={() => updateQty(item.id, Math.max(1, item.quantity - 1))}
                        aria-label="Decrease quantity"
                        className="flex h-8 w-8 items-center justify-center text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-brand)]"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                    </Tooltip>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <Tooltip content="Increase quantity">
                      <button
                        onClick={() => updateQty(item.id, item.quantity + 1)}
                        aria-label="Increase quantity"
                        className="flex h-8 w-8 items-center justify-center text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-brand)]"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </Tooltip>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="flex items-center gap-1 text-sm font-medium text-[color:var(--color-danger)] hover:underline"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* DELIVERY ADDRESS */}
          <div className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-[color:var(--color-brand)]" />
                <h2 className="font-display text-lg font-semibold text-[color:var(--color-ink)]">
                  Deliver to
                </h2>
              </div>
              {!showAddressForm && (
                <button
                  onClick={() => {
                    setAddressForm(emptyAddressForm);
                    setShowAddressForm(true);
                  }}
                  className="btn btn-ghost px-3 py-1.5 text-sm"
                >
                  <PlusIcon className="h-4 w-4" /> Add address
                </button>
              )}
            </div>

            {addresses.length === 0 && !showAddressForm && (
              <p className="text-sm text-[color:var(--color-ink-soft)]">
                No saved addresses yet. Add one to continue checkout.
              </p>
            )}

            {addresses.length > 0 && (
              <div className="space-y-2.5">
                {addresses.map((addr) => (
                  <label
                    key={addr.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm transition-colors ${
                      selectedAddressId === addr.id
                        ? 'border-[color:var(--color-brand)] bg-[color:var(--color-brand-soft)]'
                        : 'border-[color:var(--color-line)] hover:border-[color:var(--color-brand)]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="deliveryAddress"
                      checked={selectedAddressId === addr.id}
                      onChange={() => setSelectedAddressId(addr.id)}
                      className="mt-1 h-4 w-4 flex-shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[color:var(--color-ink)]">
                          {addr.label || `${addr.firstName} ${addr.lastName}`}
                        </span>
                        {addr.isDefault && (
                          <span className="rounded-full bg-[color:var(--color-brand-soft)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--color-brand-glow)]">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[color:var(--color-ink-soft)]">
                        {addr.firstName} {addr.lastName} · {addr.street}, {addr.city}, {addr.state}{' '}
                        {addr.postalCode}, {addr.country}
                      </p>
                      {addr.phone && <p className="text-[color:var(--color-ink-soft)]">{addr.phone}</p>}
                    </div>
                  </label>
                ))}
              </div>
            )}

            {showAddressForm && (
              <form
                onSubmit={saveAddress}
                className="mt-4 space-y-4 rounded-xl border border-[color:var(--color-line)] p-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[color:var(--color-ink)]">New address</h3>
                  {addresses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAddressForm(false)}
                      className="rounded-lg p-1 text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <AddressFormFields value={addressForm} onChange={setAddressForm} phoneRequired />
                <button type="submit" disabled={savingAddress} className="btn btn-primary px-5 py-2.5 text-sm">
                  {savingAddress ? 'Saving...' : 'Save address'}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="card h-fit p-6">
          <h2 className="font-display text-lg font-semibold text-[color:var(--color-ink)]">Order Summary</h2>
          <div className="mt-4 space-y-2.5 text-sm text-[color:var(--color-ink-soft)]">
            <div className="flex justify-between">
              <span>Subtotal ({cart.itemCount} items)</span>
              <span className="text-[color:var(--color-ink)]">${Number(cart.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span className="text-[color:var(--color-ink)]">$9.99</span>
            </div>
            <div className="flex justify-between">
              <span>Tax (est.)</span>
              <span className="text-[color:var(--color-ink)]">${(Number(cart.subtotal) * 0.1).toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-[color:var(--color-line)] pt-3 text-base font-bold text-[color:var(--color-ink)]">
              <span>Total</span>
              <span>${(Number(cart.subtotal) * 1.1 + 9.99).toFixed(2)}</span>
            </div>
          </div>
          <button
            onClick={checkout}
            disabled={checkingOut || !selectedAddressId}
            className="btn btn-primary mt-6 w-full py-3 text-base"
          >
            {checkingOut ? 'Processing...' : !selectedAddressId ? 'Add an address to continue' : 'Pay Now'}
          </button>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-[color:var(--color-ink-soft)]">
            <ShieldCheck className="h-3.5 w-3.5" /> Secured by Razorpay
          </p>
        </div>
      </div>
    </div>
  );
}