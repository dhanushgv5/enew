'use client';

import { create } from 'zustand';
import api from '@/lib/api';

interface CartState {
  itemCount: number;
  refreshCount: () => Promise<void>;
  setItemCount: (n: number) => void;
}

// Just the badge count, not the full cart - pages that need line items
// still fetch /cart themselves (see cart/page.tsx). This store exists so
// the Header can show a live count without every add/remove needing to
// know about the Header directly.
export const useCartStore = create<CartState>()((set) => ({
  itemCount: 0,

  refreshCount: async () => {
    try {
      const { data } = await api.get('/cart');
      set({ itemCount: data.itemCount || 0 });
    } catch {
      // Not logged in, or no cart yet - badge just shows nothing.
      set({ itemCount: 0 });
    }
  },

  setItemCount: (n) => set({ itemCount: n }),
}));