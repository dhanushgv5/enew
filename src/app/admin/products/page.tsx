'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Boxes, DollarSign, TriangleAlert, Search, Plus, Pencil, Trash2, ImageOff, X } from 'lucide-react';
import api from '@/lib/api';
import { useConfirm } from '@/components/ConfirmProvider';
import StatCard from '@/components/StatCard';
import type { Product, Category } from '@/types';

const emptyForm = {
  name: '',
  slug: '',
  description: '',
  price: '',
  compareAtPrice: '',
  sku: '',
  stock: '',
  categoryId: '',
  images: '',
};

export default function AdminProductsPage() {
  const confirm = useConfirm();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/products?limit=50');
      setProducts(data.items || []);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const { data } = await api.get('/categories');
      setCategories(data);
    } catch (e: any) {
      // Non-fatal - the category dropdown just won't have options if this fails.
      console.error(e);
    }
  };

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const createCategory = async () => {
    if (!newCategoryName.trim()) return;
    setCreatingCategory(true);
    try {
      const slug = newCategoryName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const { data } = await api.post('/categories', {
        name: newCategoryName.trim(),
        slug,
      });
      toast.success(`Category "${data.name}" created.`);
      setCategories((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setForm((prev) => ({ ...prev, categoryId: data.id }));
      setNewCategoryName('');
      setShowNewCategory(false);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to create category');
    } finally {
      setCreatingCategory(false);
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingProduct(null);
    setShowForm(false);
  };

  const startAdd = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startEdit = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      slug: product.slug,
      description: product.description || '',
      price: String(product.price),
      compareAtPrice: product.compareAtPrice ? String(product.compareAtPrice) : '',
      sku: product.sku,
      stock: String(product.stock),
      categoryId: product.category?.id || '',
      images: product.images?.join(', ') || '',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const images = form.images
      ? form.images.split(',').map((x) => x.trim()).filter(Boolean)
      : [];

    try {
      if (editingProduct) {
        await api.patch(`/products/${editingProduct.id}`, {
          name: form.name,
          slug: form.slug,
          description: form.description,
          price: Number(form.price),
          compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : undefined,
          sku: form.sku,
          stock: Number(form.stock),
          categoryId: form.categoryId,
          images,
        });
        toast.success('Product updated successfully.');
      } else {
        await api.post('/products', {
          name: form.name,
          slug: form.slug,
          description: form.description,
          price: Number(form.price),
          compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : undefined,
          sku: form.sku,
          stock: Number(form.stock),
          categoryId: form.categoryId,
          images,
        });
        toast.success('Product created successfully.');
      }
      resetForm();
      await loadProducts();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (product: Product) => {
    const confirmed = await confirm({
      title: 'Delete product',
      description: `Delete "${product.name}"? This can't be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!confirmed) return;

    try {
      await api.delete(`/products/${product.id}`);
      toast.success('Product deleted successfully.');
      await loadProducts();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to delete product');
    }
  };

  // Client-side only - no new API calls, just derived numbers for the
  // stat row and a filtered view of what's already loaded.
  const stats = useMemo(() => {
    const stockValue = products.reduce((sum, p) => sum + Number(p.price) * p.stock, 0);
    const lowStock = products.filter((p) => p.stock - (p.reservedStock || 0) <= 5).length;
    return { total: products.length, stockValue, lowStock };
  }, [products]);

  const filtered = useMemo(() => {
    if (!query.trim()) return products;
    const q = query.trim().toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category?.name?.toLowerCase().includes(q),
    );
  }, [products, query]);

  if (loading) {
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
        <StatCard label="Total products" value={stats.total} icon={Boxes} tone="brand" />
        <StatCard
          label="Inventory value"
          value={`$${stats.stockValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          icon={DollarSign}
          tone="ok"
        />
        <StatCard label="Low stock (≤5)" value={stats.lowStock} icon={TriangleAlert} tone="signal" />
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--color-ink-soft)]" />
          <input
            placeholder="Search name, SKU, category..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-9 rounded-xl border border-gray-300 bg-white pl-12 pr-4 text-gray-900 placeholder:text-gray-500 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
          />
        </div>

        <button className="btn btn-primary px-4 py-2.5 text-sm" onClick={startAdd}>
          <Plus className="h-4 w-4" /> Add Product
        </button>
      </div>

      {showForm && (
        <form onSubmit={saveProduct} className="card mb-8 animate-rise p-6">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-display text-xl font-semibold text-[color:var(--color-ink)]">
              {editingProduct ? `Edit ${editingProduct.name}` : 'Add Product'}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg p-1.5 text-[color:var(--color-ink-soft)] hover:bg-[color:var(--color-paper-dim)] hover:text-[color:var(--color-danger)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label-field">Product name</label>
              <input
                required
                placeholder="Product name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-field">Slug</label>
              <input
                required
                placeholder="e.g. running-shoes-elite"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-field">SKU</label>
              <input
                required
                placeholder="SKU"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-field">Category</label>
              <select
                required
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="input-field"
              >
                <option value="" disabled>
                  Select a category
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {!showNewCategory ? (
                <button
                  type="button"
                  onClick={() => setShowNewCategory(true)}
                  className="mt-1.5 text-xs font-semibold text-[color:var(--color-brand)] hover:underline"
                >
                  + New category
                </button>
              ) : (
                <div className="mt-2 flex gap-2">
                  <input
                    autoFocus
                    placeholder="New category name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        createCategory();
                      }
                    }}
                    className="input-field flex-1 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={createCategory}
                    disabled={creatingCategory}
                    className="btn btn-accent px-3 py-1.5 text-xs"
                  >
                    {creatingCategory ? 'Adding...' : 'Add'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewCategory(false);
                      setNewCategoryName('');
                    }}
                    className="text-xs text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-danger)]"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="label-field">Price</label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                placeholder="Price"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-field">Compare at price</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Optional"
                value={form.compareAtPrice}
                onChange={(e) => setForm({ ...form, compareAtPrice: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-field">Stock</label>
              <input
                required
                type="number"
                min="0"
                placeholder="Stock"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-field">Image URLs</label>
              <input
                placeholder="Comma separated"
                value={form.images}
                onChange={(e) => setForm({ ...form, images: e.target.value })}
                className="input-field"
              />
            </div>
            <div className="md:col-span-2">
              <label className="label-field">Description</label>
              <textarea
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input-field"
                rows={4}
              />
            </div>
          </div>

          <button type="submit" disabled={saving} className="btn btn-primary mt-5 px-6 py-2.5 text-sm">
            {saving ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
          </button>
        </form>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[color:var(--color-paper-dim)] text-[color:var(--color-ink-soft)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Product</th>
              <th className="px-4 py-3 font-semibold">SKU</th>
              <th className="px-4 py-3 font-semibold">Price</th>
              <th className="px-4 py-3 font-semibold">Stock</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--color-line)]">
            {filtered.map((product) => {
              const available = product.stock - (product.reservedStock || 0);
              return (
                <tr key={product.id} className="hover:bg-[color:var(--color-paper-dim)]/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-[color:var(--color-paper-dim)]">
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[color:var(--color-ink-soft)]">
                            <ImageOff className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <span className="font-medium text-[color:var(--color-ink)]">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[color:var(--color-ink-soft)]">{product.sku}</td>
                  <td className="px-4 py-3 font-medium text-[color:var(--color-ink)]">
                    ${Number(product.price).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        available <= 5
                          ? 'font-semibold text-[color:var(--color-signal)]'
                          : 'text-[color:var(--color-ink)]'
                      }
                    >
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[color:var(--color-ink-soft)]">{product.category?.name || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        className="btn btn-ghost px-3 py-1.5 text-xs"
                        onClick={() => startEdit(product)}
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => deleteProduct(product)}
                        className="btn btn-danger px-3 py-1.5 text-xs"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[color:var(--color-ink-soft)]">
                  {query ? `No products match "${query}".` : 'No products found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
