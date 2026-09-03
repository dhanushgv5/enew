'use client';

import { useEffect, useState } from 'react';
import { Search, PackageSearch, SlidersHorizontal, X } from 'lucide-react';
import api from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Product, Category } from '@/types';

type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'name_asc', label: 'Name: A to Z' },
  { value: 'name_desc', label: 'Name: Z to A' },
];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sort, setSort] = useState<SortOption>('newest');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);

  useEffect(() => {
    api
      .get('/categories')
      .then((res) => setCategories(res.data))
      .catch(console.error);
  }, []);

  const fetchProducts = async (targetPage: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const { data } = await api.get('/products', {
        params: {
          search: search || undefined,
          categoryId: categoryId || undefined,
          sort,
          minPrice: minPrice || undefined,
          maxPrice: maxPrice || undefined,
          inStock: inStockOnly || undefined,
          page: targetPage,
          limit: 20,
        },
      });
      setProducts((prev) => (append ? [...prev, ...(data.items || [])] : data.items || []));
      setTotalPages(data.meta?.totalPages || 1);
      setPage(targetPage);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    // Any filter/sort/search change starts back at page 1.
    const t = setTimeout(() => fetchProducts(1, false), 300);
    return () => clearTimeout(t);
  }, [search, categoryId, sort, minPrice, maxPrice, inStockOnly]);

  const activeFilterCount = [categoryId, minPrice, maxPrice, inStockOnly].filter(Boolean).length;

  const clearFilters = () => {
    setCategoryId('');
    setMinPrice('');
    setMaxPrice('');
    setInStockOnly(false);
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-signal)]">
            Catalog
          </span>
          <h1 className="font-display text-3xl font-bold text-[color:var(--color-ink)]">Products</h1>
        </div>
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--color-ink-soft)]" />
          <input
            type="search"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 rounded-xl border border-gray-300 bg-white pl-12 pr-4 text-gray-900 placeholder:text-gray-500 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
          />
        </div>
      </div>

      {/* Filter + sort bar */}
      <div className="mb-8 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="btn btn-ghost gap-2 px-4 py-2 text-sm"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[color:var(--color-brand)] px-1 text-xs font-semibold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          <Select value={sort} onValueChange={(v: string) => setSort(v as SortOption)}>
            <SelectTrigger className="w-full max-w-[200px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-sm font-medium text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-danger)]"
            >
              <X className="h-3.5 w-3.5" /> Clear filters
            </button>
          )}
        </div>

        {showFilters && (
          <div className="card flex flex-wrap items-end gap-4 p-4">
            <div className="min-w-[180px]">
              <label className="label-field">Category</label>
              <Select value={categoryId || 'ALL'} onValueChange={(v: string) => setCategoryId(v === 'ALL' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="label-field">Min price</label>
              <input
                type="number"
                min={0}
                placeholder="$0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="input-field w-28"
              />
            </div>

            <div>
              <label className="label-field">Max price</label>
              <input
                type="number"
                min={0}
                placeholder="No limit"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="input-field w-28"
              />
            </div>

            <label className="mb-2.5 flex items-center gap-2 text-sm text-[color:var(--color-ink)]">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="h-4 w-4 rounded border-[color:var(--color-line)] accent-[color:var(--color-brand)]"
              />
              In stock only
            </label>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="skeleton h-80 rounded-2xl" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-20 text-center">
          <PackageSearch className="h-10 w-10 text-[color:var(--color-ink-soft)]" />
          <p className="text-[color:var(--color-ink-soft)]">
            {search || activeFilterCount > 0
              ? 'No products match your search and filters.'
              : 'No products found.'}
          </p>
          {(search || activeFilterCount > 0) && (
            <button
              onClick={() => {
                setSearch('');
                clearFilters();
              }}
              className="btn btn-ghost px-4 py-2 text-sm"
            >
              Clear search &amp; filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="stagger grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>

          {page < totalPages && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => fetchProducts(page + 1, true)}
                disabled={loadingMore}
                className="btn btn-ghost px-6 py-2.5 text-sm"
              >
                {loadingMore ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
