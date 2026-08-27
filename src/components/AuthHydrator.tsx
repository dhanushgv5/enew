'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth';

// Runs once on app load: exchanges the httpOnly refresh cookie for a fresh
// in-memory access token and restores the logged-in user, if any.
export default function AuthHydrator() {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
