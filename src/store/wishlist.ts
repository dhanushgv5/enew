'use client';

import { create } from 'zustand';
import api from '@/lib/api';

interface WishlistState {
  productIds: Set<string>;
  loaded: boolean;
  refresh: () => Promise<void>;
  isWishlisted: (productId: string) => boolean;
  toggle: (productId: string) => Promise<void>;
}

// Mirrors the cart store pattern: a lightweight global set of product IDs so
// ProductCard and the product detail page can show a filled/empty heart
// without each one independently hitting the API.
export const useWishlistStore = create<WishlistState>()((set, get) => ({
  productIds: new Set(),
  loaded: false,

  refresh: async () => {
    try {
      const { data } = await api.get('/wishlist/ids');
      set({ productIds: new Set(data), loaded: true });
    } catch {
      // Not logged in, or not a customer - just show nothing wishlisted.
      set({ productIds: new Set(), loaded: true });
    }
  },

  isWishlisted: (productId: string) => get().productIds.has(productId),

  toggle: async (productId: string) => {
    const current = get().productIds;
    const alreadyIn = current.has(productId);

    // Optimistic update - flip it locally first, then confirm with the
    // server. On failure we roll back so the heart never lies for long.
    const next = new Set(current);
    if (alreadyIn) next.delete(productId);
    else next.add(productId);
    set({ productIds: next });

    try {
      if (alreadyIn) {
        await api.delete(`/wishlist/${productId}`);
      } else {
        await api.post(`/wishlist/${productId}`);
      }
    } catch {
      set({ productIds: current });
      throw new Error('Failed to update wishlist');
    }
  },
}));
