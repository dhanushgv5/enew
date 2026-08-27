'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Minus, Plus, ShoppingCart, CheckCircle2, XCircle, ImageOff, ChevronLeft } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';
import ReviewSection from '@/components/ReviewSection';
import type { Product } from '@/types';

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { refreshCount } = useCartStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api
      .get(`/products/${slug}`)
      .then((res) => {
        setProduct(res.data);
        setActiveImage(0);
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [slug]);

  const addToCart = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    setAdding(true);
    setMessage('');
    try {
      await api.post('/cart/items', { productId: product!.id, quantity: qty });
      setMessage('Added to cart!');
      refreshCount();
    } catch (e: any) {
      setMessage(e.response?.data?.message || 'Failed to add');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="skeleton aspect-square rounded-2xl" />
        <div className="space-y-4">
          <div className="skeleton h-8 w-2/3 rounded-lg" />
          <div className="skeleton h-6 w-1/4 rounded-lg" />
          <div className="skeleton h-24 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="card mx-auto max-w-md py-16 text-center">
        <XCircle className="mx-auto h-10 w-10 text-[color:var(--color-danger)]" />
        <p className="mt-3 font-semibold text-[color:var(--color-ink)]">Product not found</p>
        <Link href="/products" className="mt-4 inline-block text-sm font-semibold text-[color:var(--color-brand)] hover:underline">
          Back to products
        </Link>
      </div>
    );
  }

  const price = Number(product.price);
  const compare = product.compareAtPrice ? Number(product.compareAtPrice) : null;
  const onSale = !!(compare && compare > price);
  const available = product.stock - (product.reservedStock || 0);
  const images = product.images?.length ? product.images : [];

  return (
    <div>
      <Link
        href="/products"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-brand)]"
      >
        <ChevronLeft className="h-4 w-4" /> Back to products
      </Link>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* GALLERY */}
        <div>
          <div className="card aspect-square overflow-hidden">
            {images[activeImage] ? (
              <img
                src={images[activeImage]}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-[color:var(--color-ink-soft)]">
                <ImageOff className="h-10 w-10" />
                <span className="text-sm">No image</span>
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {images.map((img, i) => (
                <button
                  key={img + i}
                  onClick={() => setActiveImage(i)}
                  className={`h-16 w-16 overflow-hidden rounded-lg border-2 transition-colors ${
                    activeImage === i ? 'border-[color:var(--color-brand)]' : 'border-[color:var(--color-line)]'
                  }`}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* DETAILS */}
        <div>
          {product.category?.name && (
            <span className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-signal)]">
              {product.category.name}
            </span>
          )}
          <h1 className="mt-1 font-display text-3xl font-bold text-[color:var(--color-ink)]">
            {product.name}
          </h1>

          <div className="mt-3 flex items-baseline gap-3">
            <span className="font-display text-2xl font-bold text-[color:var(--color-brand)]">
              ${price.toFixed(2)}
            </span>
            {onSale && (
              <span className="text-base text-[color:var(--color-ink-soft)] line-through">
                ${compare!.toFixed(2)}
              </span>
            )}
            {onSale && <span className="chip bg-[color:var(--color-signal-soft)] text-[color:var(--color-signal)]">Sale</span>}
          </div>

          <p className="mt-5 leading-relaxed text-[color:var(--color-ink-soft)]">{product.description}</p>

          <div className="mt-4 flex items-center gap-1.5 text-sm font-medium">
            {available > 0 ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-[color:var(--color-ok)]" />
                <span className="text-[color:var(--color-ok)]">{available} available</span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-[color:var(--color-danger)]" />
                <span className="text-[color:var(--color-danger)]">Out of stock</span>
              </>
            )}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <div className="flex items-center rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)]">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="flex h-11 w-11 items-center justify-center text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-brand)]"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="number"
                min={1}
                max={available}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
                className="w-12 border-x border-[color:var(--color-line)] bg-transparent py-2 text-center focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(available || 1, q + 1))}
                className="flex h-11 w-11 items-center justify-center text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-brand)]"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={addToCart}
              disabled={adding || available < 1}
              className="btn btn-primary flex-1 min-w-[10rem] px-8 py-3.5 text-base sm:flex-none"
            >
              <ShoppingCart className="h-4 w-4" />
              {adding ? 'Adding...' : 'Add to Cart'}
            </button>
          </div>

          {message && (
            <p
              className={`mt-4 text-sm font-medium ${
                message.includes('Added') ? 'text-[color:var(--color-ok)]' : 'text-[color:var(--color-danger)]'
              }`}
            >
              {message}
            </p>
          )}
        </div>
      </div>

      <ReviewSection productId={product.id} />
    </div>
  );
}
