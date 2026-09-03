export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'SELLER' | 'DELIVERY_BOY' | 'CUSTOMER';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  role: Role;
  isActive?: boolean;
  createdAt?: string;
}

export interface Address {
  id: string;
  label?: string | null;
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string | null;
  isDefault: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: string | number;
  compareAtPrice?: string | number;
  sku: string;
  stock: number;
  reservedStock: number;
  images: string[];
  isActive: boolean;
  category?: { id: string; name: string; slug: string };
}

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  price: string | number;
  product: Product;
  available?: number;
  subtotal?: string | number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  subtotal: string | number;
  itemCount: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: string | number;
  tax: string | number;
  shipping: string | number;
  total: string | number;
  items: {
    id: string;
    productId: string;
    quantity: number;
    price: string | number;
    name: string;
    product?: { images: string[]; slug: string } | null;
  }[];
  createdAt: string;
  statusHistory?: { id: string; status: string; note?: string | null; createdAt: string }[];
  deliveryBoyId?: string | null;
  deliveryBoy?: { id: string; email: string; firstName?: string; lastName?: string } | null;
  deliveredAt?: string | null;
  shippingAddress?: {
    firstName: string;
    lastName: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
  };
}

export interface Review {
  id: string;
  userId: string;
  productId: string;
  rating: number;
  title?: string | null;
  comment?: string | null;
  photos: string[];
  createdAt: string;
  updatedAt?: string;
  verifiedPurchase?: boolean;
  user?: { id: string; firstName?: string; lastName?: string };
  product?: { id: string; name: string; slug: string; images: string[] };
}

export interface ReviewSummary {
  average: number;
  total: number;
  distribution: Record<'1' | '2' | '3' | '4' | '5', number>;
}

export interface WishlistItem {
  id: string;
  userId: string;
  productId: string;
  createdAt: string;
  product: Product;
}

export interface DashboardOverview {
  revenue: { today: number; thisWeek: number; thisMonth: number; allTime: number };
  orders: { total: number; byStatus: Record<string, number> };
  products: { total: number; lowStockCount: number; outOfStock: number };
  lowStockProducts: { id: string; name: string; slug: string; stock: number; images: string[] }[];
  returns: { pending: number };
  reviews: { total: number; average: number };
  customers: { total: number };
  recentOrders: {
    id: string;
    orderNumber: string;
    status: string;
    total: string | number;
    createdAt: string;
    user: { firstName?: string; lastName?: string; email: string };
  }[];
  recentReviews: {
    id: string;
    rating: number;
    title?: string | null;
    createdAt: string;
    product: { id: string; name: string; slug: string };
    user: { firstName?: string; lastName?: string };
  }[];
}

export interface DeliveryBoy {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  _count?: { deliveries: number };
}

export type ReturnKind = 'RETURN' | 'REPLACEMENT';

export type ReturnRequestStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'PICKUP_SCHEDULED'
  | 'PICKED_UP'
  | 'RECEIVED'
  | 'REFUNDED'
  | 'REPLACED'
  | 'CANCELLED';

export interface ReturnRequest {
  id: string;
  orderId: string;
  orderItemId: string;
  userId: string;
  type: ReturnKind;
  quantity: number;
  reason: string;
  description?: string | null;
  photos: string[];
  status: ReturnRequestStatus;
  adminNote?: string | null;
  refundAmount?: string | number | null;
  pickupDate?: string | null;
  deliveryBoyId?: string | null;
  deliveryBoy?: { id: string; email: string; firstName?: string; lastName?: string; phone?: string } | null;
  createdAt: string;
  updatedAt?: string;
  statusHistory?: { id: string; status: string; note?: string | null; createdAt: string }[];
  orderItem?: {
    id: string;
    name: string;
    quantity: number;
    price: string | number;
    product?: { id: string; name: string; images: string[]; slug: string };
  };
  order?: { id: string; orderNumber: string; status: string; deliveredAt?: string | null };
  user?: { id: string; firstName?: string; lastName?: string; email?: string };
}