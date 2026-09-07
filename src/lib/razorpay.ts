import api from './api';

declare global {
  interface Window {
    Razorpay: any;
  }
}

/**
 * Opens Razorpay Checkout for an existing PENDING order.
 * Calls onSuccess() once the payment is verified server-side (order is PAID by then).
 * Calls onDismiss() if the user closes the modal without paying.
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
        ondismiss: () => {
          onDismiss?.();
          resolve();
        },
      },
      handler: async (response: any) => {
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
    rzp.open();
  });
}
