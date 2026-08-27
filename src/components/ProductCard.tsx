'use client';

import Link from 'next/link';
import { ImageOff, ArrowUpRight } from 'lucide-react';
import type { Product } from '@/types';

interface Props {
  product: Product;
}

export default function ProductCard({ product }: Props) {
  const price = Number(product.price);
  const compare = product.compareAtPrice ? Number(product.compareAtPrice) : null;
  const available = product.stock - (product.reservedStock || 0);
  const onSale = !!(compare && compare > price);
  const lowStock = available > 0 && available <= 5;
  const discount = onSale ? Math.round(((compare! - price) / compare!) * 100) : 0;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="card card-interactive group relative flex flex-col overflow-hidden"
    >
      <div className="relative aspect-square overflow-hidden bg-[color:var(--color-paper-dim)]">
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.12]"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-[color:var(--color-ink-soft)]">
            <ImageOff className="h-8 w-8" />
            <span className="text-xs">No image</span>
          </div>
        )}

        {/* depth wash + hover glow */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[color:var(--color-paper)] via-transparent to-transparent opacity-70" />
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{ background: 'radial-gradient(70% 60% at 50% 100%, color-mix(in srgb, var(--color-brand) 45%, transparent), transparent 70%)' }}
        />

        {onSale && (
          <span className="chip absolute left-3 top-3 bg-[color:var(--color-signal)] text-[#1a1204] shadow-lg">
            −{discount}%
          </span>
        )}

        {/* quick-view affordance */}
        <span className="pointer-events-none absolute right-3 top-3 flex h-8 w-8 translate-y-2 items-center justify-center rounded-full bg-[color:var(--color-surface)]/80 text-[color:var(--color-ink)] opacity-0 backdrop-blur transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <ArrowUpRight className="h-4 w-4" />
        </span>

        {available < 1 && (
          <span className="absolute inset-0 flex items-center justify-center bg-[color:var(--color-paper)]/65 backdrop-blur-[2px]">
            <span className="chip bg-[color:var(--color-surface)] text-[color:var(--color-ink)] shadow-lg">
              Out of stock
            </span>
          </span>
        )}
      </div>

      <div className="relative flex flex-1 flex-col gap-1 p-4">
        {product.category?.name && (
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]">
            {product.category.name}
          </span>
        )}
        <h3 className="line-clamp-2 text-sm font-semibold text-[color:var(--color-ink)] transition-colors group-hover:text-[color:var(--color-brand-glow)]">
          {product.name}
        </h3>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-display text-lg font-bold text-[color:var(--color-ink)] tabular-nums">
            ${price.toFixed(2)}
          </span>
          {onSale && (
            <span className="text-sm text-[color:var(--color-ink-soft)] line-through">
              ${compare!.toFixed(2)}
            </span>
          )}
        </div>
        <p
          className={`mt-1 inline-flex items-center gap-1.5 text-xs font-medium ${
            available < 1
              ? 'text-[color:var(--color-danger)]'
              : lowStock
                ? 'text-[color:var(--color-signal)]'
                : 'text-[color:var(--color-ink-soft)]'
          }`}
        >
          <span
            className="h-1.5 w-1.5 rounded-full bg-current"
            style={available > 0 && !lowStock ? { backgroundColor: 'var(--color-ok)' } : undefined}
          />
          {available > 0 ? `${available} in stock` : 'Out of stock'}
        </p>
      </div>
    </Link>
  );
}
