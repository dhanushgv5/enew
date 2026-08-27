'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { MessageSquareText, Star as StarIcon, Trash2, ImageOff, Search } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useConfirm } from '@/components/ConfirmProvider';
import StatCard from '@/components/StatCard';
import ReviewStars from '@/components/ReviewStars';
import type { Product, Review } from '@/types';

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/api\/?$/, '');

function photoUrl(path: string) {
  return path.startsWith('http') ? path : `${API_ORIGIN}${path}`;
}

interface AdminReview extends Review {
  product: { id: string; name: string; slug: string; images: string[] };
  user: { id: string; firstName?: string; lastName?: string };
}

export default function AdminReviewsPage() {
  const { user, hasHydrated } = useAuthStore();
  const confirm = useConfirm();

  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [productFilter, setProductFilter] = useState('');
  const [search, setSearch] = useState('');
  const [actingOn, setActingOn] = useState<string | null>(null);

  const loadReviews = async (productId?: string) => {
    setLoading(true);
    try {
      const { data } = await api.get('/reviews/admin/all', {
        params: { limit: 100, ...(productId && { productId }) },
      });
      setReviews(data.items || []);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const { data } = await api.get('/products?limit=100');
      setProducts(data.items || []);
    } catch (e: any) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (hasHydrated && user && ['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      loadReviews();
      loadProducts();
    }
  }, [user, hasHydrated]);

  const onFilterProduct = (productId: string) => {
    setProductFilter(productId);
    loadReviews(productId || undefined);
  };

  const deleteReview = async (review: AdminReview) => {
    const confirmed = await confirm({
      title: 'Delete review',
      description: `Remove ${review.user?.firstName || 'this'}'s review of "${review.product?.name}"? This can't be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!confirmed) return;

    setActingOn(review.id);
    try {
      await api.delete(`/reviews/${review.id}`);
      toast.success('Review deleted.');
      setReviews((prev) => prev.filter((r) => r.id !== review.id));
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to delete review');
    } finally {
      setActingOn(null);
    }
  };

  const stats = useMemo(() => {
    const total = reviews.length;
    const avg = total ? reviews.reduce((sum, r) => sum + r.rating, 0) / total : 0;
    const withPhotos = reviews.filter((r) => r.photos?.length).length;
    return { total, avg, withPhotos };
  }, [reviews]);

  const filtered = useMemo(() => {
    if (!search.trim()) return reviews;
    const q = search.trim().toLowerCase();
    return reviews.filter(
      (r) =>
        r.product?.name?.toLowerCase().includes(q) ||
        r.title?.toLowerCase().includes(q) ||
        r.comment?.toLowerCase().includes(q) ||
        [r.user?.firstName, r.user?.lastName].filter(Boolean).join(' ').toLowerCase().includes(q),
    );
  }, [reviews, search]);

  if (!hasHydrated || loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total reviews" value={stats.total} icon={MessageSquareText} tone="brand" />
        <StatCard label="Average rating" value={stats.avg.toFixed(1)} icon={StarIcon} tone="signal" />
        <StatCard label="With photos" value={stats.withPhotos} icon={ImageOff} tone="ok" />
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--color-ink-soft)]" />
          <input
            placeholder="Search reviewer, product, text..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9rounded-xl border border-gray-300 bg-white pl-12 pr-4 text-gray-900 placeholder:text-gray-500 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
          />
        </div>

        <select
          value={productFilter}
          onChange={(e) => onFilterProduct(e.target.value)}
          className="input-field w-full max-w-xs"
        >
          <option value="">All products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card py-16 text-center text-[color:var(--color-ink-soft)]">No reviews found.</div>
      ) : (
        <div className="space-y-4">
          {filtered.map((review) => (
            <div key={review.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <ReviewStars value={review.rating} size={15} />
                    <span className="text-sm font-semibold text-[color:var(--color-ink)]">
                      {[review.user?.firstName, review.user?.lastName].filter(Boolean).join(' ') || 'Anonymous'}
                    </span>
                    <span className="text-xs text-[color:var(--color-ink-soft)]">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-signal)]">
                    {review.product?.name}
                  </p>
                </div>
                <button
                  onClick={() => deleteReview(review)}
                  disabled={actingOn === review.id}
                  className="btn btn-danger px-3 py-1.5 text-xs"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>

              {review.title && (
                <p className="mt-3 font-semibold text-[color:var(--color-ink)]">{review.title}</p>
              )}
              {review.comment && (
                <p className="mt-1 text-sm leading-relaxed text-[color:var(--color-ink-soft)]">{review.comment}</p>
              )}
              {!!review.photos?.length && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {review.photos.map((p) => (
                    <a key={p} href={photoUrl(p)} target="_blank" rel="noreferrer">
                      <img
                        src={photoUrl(p)}
                        alt="Review photo"
                        className="h-16 w-16 rounded-lg border border-[color:var(--color-line)] object-cover"
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
