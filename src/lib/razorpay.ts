import api from './api';

declare global {
  interface Window {
    Razorpay: any;
  }
}

/**
 * Opens Razorpay Checkout for an existing PENDING order.
 * Calls onSuccess() once the payment is verified server-side (order is PAID by then).
 * Calls onDismiss() after the modal is closed without paying - by then the
 * order has also been cancelled server-side (see below), so its reserved
 * stock is released rather than sitting stuck against an abandoned order.
 */
export async function payForOrder(
  orderId: string,
  customerName: string | undefined,
  onSuccess: () => void,
  onDismiss?: () => void,
) {
  if (typeof window === 'undefined' || !window.Razorpay) {
    throw new Error('Razorpay checkout script has not loaded yet - try again in a moment.');
  }

  const { data } = await api.post(`/orders/${orderId}/razorpay/order`);

  // Razorpay's ondismiss can fire in situations beyond "closed without
  // paying" - including, in some flows, after handler has already fired
  // for a real successful payment (the modal-closed event and the
  // payment-succeeded event are tracked separately by Checkout.js). If
  // ondismiss ran the cancel logic in that case, it would cancel a real,
  // paid order and restore stock that was legitimately sold, while
  // Razorpay has already captured the money. This flag closes that gap:
  // once handler has started, ondismiss becomes a no-op.
  let paymentHandled = false;

  return new Promise<void>((resolve, reject) => {
    const options = {
      key: data.keyId,
      amount: data.amount,
      currency: data.currency,
      order_id: data.razorpayOrderId,
      name: 'ShopFlow',
      description: 'Order payment',
      prefill: customerName ? { name: customerName } : undefined,
      theme: { color: '#000000' },
      modal: {
        ondismiss: async () => {
          if (paymentHandled) return;

          // The customer closed the checkout without paying - the order
          // would otherwise sit PENDING forever with its stock reserved
          // and no way for anyone else to buy it. Cancel it so that
          // reservation is released back to available stock, same as the
          // "Cancel order" button does. Best-effort: if this fails (e.g.
          // a network blip), we still resolve so the UI doesn't hang -
          // the order just stays PENDING and the customer (or the "Cancel
          // order" button) can retry later.
          try {
            await api.patch(`/orders/${orderId}/status`, {
              status: 'CANCELLED',
              note: 'Payment cancelled - checkout closed before completing payment',
            });
          } catch {
            // swallow - see comment above
          }
          onDismiss?.();
          resolve();
        },
      },
      handler: async (response: any) => {
        paymentHandled = true;
        try {
          await api.post(`/orders/${orderId}/razorpay/verify`, {
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
          onSuccess();
          resolve();
        } catch (err) {
          reject(err);
        }
      },
    };

    const rzp = new window.Razorpay(options);

    // Checkout.js fires this for actual declines (bad card, insufficient
    // funds, etc.) - without listening for it, a real failure just sits in
    // the modal with no signal back to the app until the user manually
    // closes it (which would incorrectly read as "cancelled" via ondismiss).
    rzp.on('payment.failed', (response: any) => {
      reject(new Error(response?.error?.description || 'Payment failed'));
    });

    rzp.open();
  });
}
