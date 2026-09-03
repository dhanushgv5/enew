'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Heart } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useWishlistStore } from '@/store/wishlist';
import ProductCard from '@/components/ProductCard';
import type { WishlistItem } from '@/types';

export default function WishlistPage() {
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();
  const productIds = useWishlistStore((s) => s.productIds);
  const refreshWishlist = useWishlistStore((s) => s.refresh);
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!user) {
      router.push('/login');
      return;
    }
    refreshWishlist();
    api
      .get('/wishlist')
      .then((res) => setItems(res.data))
      .catch((e) => toast.error(e.response?.data?.message || 'Failed to load wishlist'))
      .finally(() => setLoading(false));
  }, [user, hasHydrated]);

  // Filtering against the live store (rather than just the initial fetch)
  // means unhearting a card on this page removes it from the grid
  // immediately, without needing a refresh.
  const visibleItems = items.filter((item) => productIds.has(item.productId));

  if (!hasHydrated || loading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="skeleton h-80 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-8 font-display text-3xl font-bold text-[color:var(--color-ink)]">Your Wishlist</h1>

      {items.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-20 text-center">
          <Heart className="h-10 w-10 text-[color:var(--color-ink-soft)]" />
          <p className="text-[color:var(--color-ink-soft)]">
            Nothing saved yet. Tap the heart on any product to add it here.
          </p>
        </div>
      ) : (
        <div className="stagger grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <ProductCard key={item.id} product={item.product} />
          ))}
        </div>
      )}
    </div>
  );
}
