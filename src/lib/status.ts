// Central status metadata for orders/deliveries so every screen (customer
// orders, admin orders, delivery dashboard) renders the same colors, dot,
// and label instead of each page re-implementing its own style map.

export type StatusKey =
  | 'PENDING'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

interface StatusMeta {
  label: string;
  text: string;
  bg: string;
  dot: string;
}

export const STATUS_META: Record<string, StatusMeta> = {
  PENDING: { label: 'Pending', text: '#b06a00', bg: 'rgba(249, 160, 63, 0.16)', dot: '#f9a03f' },
  PAID: { label: 'Paid', text: '#0b7f56', bg: 'rgba(18, 160, 106, 0.14)', dot: '#3ddc97' },
  PROCESSING: { label: 'Processing', text: '#1d63c9', bg: 'rgba(96, 165, 250, 0.16)', dot: '#60a5fa' },
  SHIPPED: { label: 'Shipped', text: '#5b49f0', bg: 'rgba(124, 108, 255, 0.14)', dot: '#7c6cff' },
  OUT_FOR_DELIVERY: { label: 'Out for delivery', text: '#c2540c', bg: 'rgba(249, 115, 22, 0.14)', dot: '#fb923c' },
  DELIVERED: { label: 'Delivered', text: '#15803d', bg: 'rgba(34, 197, 94, 0.14)', dot: '#22c55e' },
  CANCELLED: { label: 'Cancelled', text: '#c02033', bg: 'rgba(224, 56, 76, 0.13)', dot: '#ff6b7a' },
  REFUNDED: { label: 'Refunded', text: '#6d28d9', bg: 'rgba(167, 139, 250, 0.16)', dot: '#a78bfa' },

  // Return / replacement request statuses
  REQUESTED: { label: 'Requested', text: '#b06a00', bg: 'rgba(249, 160, 63, 0.16)', dot: '#f9a03f' },
  APPROVED: { label: 'Approved', text: '#1d63c9', bg: 'rgba(96, 165, 250, 0.16)', dot: '#60a5fa' },
  REJECTED: { label: 'Rejected', text: '#c02033', bg: 'rgba(224, 56, 76, 0.13)', dot: '#ff6b7a' },
  PICKUP_SCHEDULED: { label: 'Pickup scheduled', text: '#5b49f0', bg: 'rgba(124, 108, 255, 0.14)', dot: '#7c6cff' },
  PICKED_UP: { label: 'Picked up', text: '#c2540c', bg: 'rgba(249, 115, 22, 0.14)', dot: '#fb923c' },
  RECEIVED: { label: 'Received', text: '#0b7f56', bg: 'rgba(18, 160, 106, 0.14)', dot: '#3ddc97' },
  REPLACED: { label: 'Replaced', text: '#15803d', bg: 'rgba(34, 197, 94, 0.14)', dot: '#22c55e' },
};

export function statusMeta(status: string): StatusMeta {
  return (
    STATUS_META[status] || {
      label: status.replace(/_/g, ' '),
      text: '#626a85',
      bg: 'rgba(150, 155, 176, 0.14)',
      dot: '#969bb0',
    }
  );
}
