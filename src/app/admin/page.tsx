'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/products');
  }, [router]);

  return (
    <div className="flex items-center justify-center gap-2 py-20 text-[color:var(--color-ink-soft)]">
      <span className="h-2 w-2 animate-pulse rounded-full bg-[color:var(--color-brand)]" />
      Redirecting...
    </div>
  );
}
