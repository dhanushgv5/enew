'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ImagePlus, Loader2, Pencil, ShieldCheck, Trash2, X } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useConfirm } from '@/components/ConfirmProvider';
import ReviewStars from '@/components/ReviewStars';
import Tooltip from '@/components/Tooltip';
import type { Review, ReviewSummary } from '@/types';

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/api\/?$/, '');

function photoUrl(path: string) {
  return path.startsWith('http') ? path : `${API_ORIGIN}${path}`;
}

function reviewerName(review: Review) {
  const name = [review.user?.firstName, review.user?.lastName].filter(Boolean).join(' ');
  return name || 'Anonymous';
}

const PAGE_SIZE = 5;
const emptyForm = { rating: 0, title: '', comment: '' };

export default function ReviewSection({ productId }: { productId: string }) {
  const { user } = useAuthStore();
  const confirm = useConfirm();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [myReview, setMyReview] = useState<Review | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const isCustomer = user?.role === 'CUSTOMER';

  const loadReviews = async (targetPage: number) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/reviews/product/${productId}`, {
        params: { page: targetPage, limit: PAGE_SIZE },
      });
      setReviews((prev) => (targetPage === 1 ? data.items : [...prev, ...data.items]));
      setSummary(data.summary);
      setTotalPages(data.meta.totalPages);
      setPage(targetPage);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const loadMyReview = async () => {
    try {
      const { data } = await api.get(`/reviews/mine/${productId}`);
      setMyReview(data);
    } catch {
      setMyReview(null);
    }
  };

  useEffect(() => {
    loadReviews(1);
    if (isCustomer) loadMyReview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, isCustomer]);

  const startWrite = () => {
    if (myReview) {
      setForm({ rating: myReview.rating, title: myReview.title || '', comment: myReview.comment || '' });
      setExistingPhotos(myReview.photos || []);
    } else {
      setForm(emptyForm);
      setExistingPhotos([]);
    }
    setNewPhotos([]);
    setShowForm(true);
  };

  const cancelWrite = () => {
    setShowForm(false);
    setForm(emptyForm);
    setNewPhotos([]);
    setExistingPhotos([]);
  };

  const onPickPhotos = (files: FileList | null) => {
    if (!files) return;
    const combined = [...newPhotos, ...Array.from(files)].slice(0, 5 - existingPhotos.length);
    setNewPhotos(combined);
  };

  const submitReview = async () => {
    if (form.rating < 1) {
      toast.error('Pick a star rating first.');
      return;
    }
    setSaving(true);
    try {
      let uploadedUrls: string[] = [];
      if (newPhotos.length) {
        const fd = new FormData();
        newPhotos.forEach((file) => fd.append('photos', file));
        const { data } = await api.post('/reviews/photos', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploadedUrls = data.urls;
      }
      const photos = [...existingPhotos, ...uploadedUrls];

      if (myReview) {
        await api.patch(`/reviews/${myReview.id}`, {
          rating: form.rating,
          title: form.title || undefined,
          comment: form.comment || undefined,
          photos,
        });
        toast.success('Review updated.');
      } else {
        await api.post('/reviews', {
          productId,
          rating: form.rating,
          title: form.title || undefined,
          comment: form.comment || undefined,
          photos,
        });
        toast.success('Thanks for your review!');
      }
      cancelWrite();
      await loadMyReview();
      await loadReviews(1);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to submit review');
    } finally {
      setSaving(false);
    }
  };

  const deleteReview = async () => {
    if (!myReview) return;
    const confirmed = await confirm({
      title: 'Delete review',
      description: 'Remove your review for this product?',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!confirmed) return;
    try {
      await api.delete(`/reviews/${myReview.id}`);
      toast.success('Review deleted.');
      setMyReview(null);
      await loadReviews(1);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to delete review');
    }
  };

  const distribution = summary?.distribution;
  const maxBucket = distribution ? Math.max(1, ...Object.values(distribution)) : 1;

  return (
    <div className="mt-16 border-t border-[color:var(--color-line)] pt-10">
      <h2 className="font-display text-2xl font-bold text-[color:var(--color-ink)]">Reviews</h2>

      {/* SUMMARY */}
      <div className="mt-6 grid gap-8 sm:grid-cols-[auto_1fr]">
        <div className="text-center sm:text-left">
          <p className="font-display text-4xl font-bold text-[color:var(--color-ink)]">
            {summary?.average?.toFixed(1) ?? '0.0'}
          </p>
          <div className="mt-1 flex justify-center sm:justify-start">
            <ReviewStars value={summary?.average || 0} />
          </div>
          <p className="mt-1 text-sm text-[color:var(--color-ink-soft)]">
            {summary?.total || 0} review{summary?.total === 1 ? '' : 's'}
          </p>
        </div>

        {!!summary?.total && (
          <div className="max-w-sm space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = distribution?.[String(star) as '1' | '2' | '3' | '4' | '5'] || 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs text-[color:var(--color-ink-soft)]">
                  <span className="w-3">{star}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[color:var(--color-paper-dim)]">
                    <div
                      className="h-full rounded-full bg-[color:var(--color-signal)]"
                      style={{ width: `${(count / maxBucket) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* WRITE A REVIEW */}
      <div className="mt-8">
        {!user && (
          <p className="text-sm text-[color:var(--color-ink-soft)]">
            <Link href="/login" className="font-semibold text-[color:var(--color-brand)] hover:underline">
              Log in
            </Link>{' '}
            to write a review.
          </p>
        )}

        {isCustomer && !showForm && (
          <div className="flex items-center gap-3">
            <button className="btn btn-primary px-4 py-2 text-sm" onClick={startWrite}>
              <Pencil className="h-4 w-4" />
              {myReview ? 'Edit your review' : 'Write a review'}
            </button>
            {myReview && (
              <button
                className="btn btn-danger px-3 py-2 text-sm"
                onClick={deleteReview}
              >
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            )}
          </div>
        )}

        {isCustomer && showForm && (
          <div className="card mt-2 max-w-xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-[color:var(--color-ink)]">
                {myReview ? 'Edit your review' : 'Write a review'}
              </h3>
              <Tooltip content="Close">
                <button onClick={cancelWrite} aria-label="Close" className="rounded-lg p-1 text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-danger)]">
                  <X className="h-4 w-4" />
                </button>
              </Tooltip>
            </div>

            <label className="label-field">Your rating</label>
            <ReviewStars value={form.rating} onChange={(v) => setForm({ ...form, rating: v })} interactive size={24} />

            <label className="label-field mt-4">Title (optional)</label>
            <input
              maxLength={120}
              placeholder="Sum it up in a few words"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input-field"
            />

            <label className="label-field mt-4">Your review (optional)</label>
            <textarea
              maxLength={2000}
              rows={4}
              placeholder="What did you like or dislike?"
              value={form.comment}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
              className="input-field"
            />

            <label className="label-field mt-4">Photos (optional, up to 5)</label>
            <div className="flex flex-wrap gap-2">
              {existingPhotos.map((p) => (
                <div key={p} className="group relative h-16 w-16 overflow-hidden rounded-lg border border-[color:var(--color-line)]">
                  <img src={photoUrl(p)} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setExistingPhotos((prev) => prev.filter((x) => x !== p))}
                    aria-label="Remove photo"
                    className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {newPhotos.map((file, i) => (
                <div key={i} className="group relative h-16 w-16 overflow-hidden rounded-lg border border-[color:var(--color-line)]">
                  <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setNewPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                    aria-label="Remove photo"
                    className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {existingPhotos.length + newPhotos.length < 5 && (
                <Tooltip content="Add photo">
                  <label
                    aria-label="Add photo"
                    className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[color:var(--color-line)] text-[color:var(--color-ink-soft)] hover:border-[color:var(--color-brand)] hover:text-[color:var(--color-brand)]"
                  >
                    <ImagePlus className="h-5 w-5" />
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={(e) => onPickPhotos(e.target.files)}
                  />
                </label>
                </Tooltip>
              )}
            </div>

            <div className="mt-5 flex gap-3">
              <button onClick={submitReview} disabled={saving} className="btn btn-primary flex-1 py-2.5 text-sm">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : myReview ? 'Update review' : 'Submit review'}
              </button>
              <button onClick={cancelWrite} className="btn btn-ghost px-4 py-2.5 text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* REVIEW LIST */}
      <div className="mt-8 space-y-6">
        {loading && page === 1 ? (
          [...Array(3)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)
        ) : reviews.length === 0 ? (
          <p className="text-sm text-[color:var(--color-ink-soft)]">No reviews yet. Be the first to share your thoughts.</p>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="border-b border-[color:var(--color-line)] pb-6 last:border-0">
              <div className="flex flex-wrap items-center gap-2">
                <ReviewStars value={review.rating} size={15} />
                <span className="text-sm font-semibold text-[color:var(--color-ink)]">{reviewerName(review)}</span>
                {review.verifiedPurchase && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--color-ok)]">
                    <ShieldCheck className="h-3.5 w-3.5" /> Verified purchase
                  </span>
                )}
                <span className="text-xs text-[color:var(--color-ink-soft)]">
                  {new Date(review.createdAt).toLocaleDateString()}
                </span>
              </div>
              {review.title && (
                <p className="mt-2 font-semibold text-[color:var(--color-ink)]">{review.title}</p>
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
          ))
        )}

        {page < totalPages && (
          <button
            onClick={() => loadReviews(page + 1)}
            disabled={loading}
            className="btn btn-ghost w-full py-2.5 text-sm"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Load more reviews'}
          </button>
        )}
      </div>
    </div>
  );
}
