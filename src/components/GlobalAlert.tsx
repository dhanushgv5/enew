'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

export default function GlobalAlert() {
  useEffect(() => {
    const alertHandler = (message?: unknown) => {
      toast(String(message ?? ''));
    };

    window.alert = alertHandler;

    return () => {
      window.alert = alertHandler;
    };
  }, []);

  return null;
}