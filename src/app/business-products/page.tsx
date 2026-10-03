'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { fetchAllRows } from '@/lib/supabase/fetchAllRows';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountCurrency } from '@/hooks/useAccountCurrency';
import { formatMoney } from '@/lib/countries';
import { Search, Plus, RefreshCw, Pencil, Trash2, Package, Eye, X } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import ResponsiveRecordList, { RecordColumn } from '@/components/ui/ResponsiveRecordList';

interface Product {
  id: string;
  name: string;
  category: string;
  brand: string;
  description: string;
  unit: string;
  selling_price: number;
  reorder_level: number;
  minimum_stock: number;
  maximum_stock: number;
  status: 'active' | 'inactive';
}

interface ProductForm {
  name: string;
  category: string;
  brand: string;
  description: string;
  unit: string;
  selling_price: string;
  reorder_level: string;
  minimum_stock: string;
  maximum_stock: string;
  status: 'active' | 'inactive';
}

const defaultForm: ProductForm = {
  name: '',
  category: '',
  brand: '',
  description: '',
  unit: '',
  selling_price: '',
  reorder_level: '',
  minimum_stock: '',
  maximum_stock: '',
  status: 'active',
};

export default function BusinessProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);

  const { user } = useAuth();
  const { currencyCode } = useAccountCurrency();
  const supabase = createClient();

  const loadAccountId = useCallback(async () => {
    if (!user?.id && !user?.email) {
      setAccountId(null);
      return null;
    }

    let nextAccountId: string | null = null;

    if (user?.id) {
      const { data: accountByUserId } = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      nextAccountId = accountByUserId?.id ?? null;
    }

    if (!nextAccountId && user?.email) {
      const { data: accountByEmail } = await supabase
        .from('accounts')
        .select('id')
        .eq('email', user.email)
        .maybeSingle();
      nextAccountId = accountByEmail?.id ?? null;
    }

    setAccountId(nextAccountId);
    return nextAccountId;
  }, [supabase, user?.email, user?.id]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const currentAccountId = accountId ?? (await loadAccountId());
      if (!currentAccountId) {
        setProducts([]);
        return;
      }

      const query = supabase
        .from('business_products')
        .select('*')
        .eq('account_id', currentAccountId)
        .order('name', { ascending: true });
      setProducts(await fetchAllRows((from, to) => query.range(from, to)));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [accountId, loadAccountId, supabase]);

  useEffect(() => { void loadAccountId(); }, [loadAccountId]);
  useEffect(() => { void fetchProducts(); }, [fetchProducts]);

  const categories = useMemo(() => [...new Set(products.map((product) => product.category.trim()).filter(Boolean))].sort(), [products]);
  const filtered = products.filter((p) => {
    const matchesCategory = filterCategory === 'all' || p.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    const normalizedSearch = search.toLowerCase();
    return matchesCategory && matchesStatus && (
      p.name.toLowerCase().includes(normalizedSearch) ||
      (p.category || '').toLowerCase().includes(normalizedSearch) ||
      (p.brand || '').toLowerCase().includes(normalizedSearch)
    );
  });

  const openAdd = () => { setEditProduct(null); setForm(defaultForm); setShowModal(true); };
  const openEdit = (p: Product) => {
    setEditProduct(p);
    setForm({
      name: p.name,
      category: p.category || '',
      brand: p.brand || '',
      description: p.description || '',
      unit: p.unit || '',
      selling_price: p.selling_price == null ? '' : String(p.selling_price),
      reorder_level: p.reorder_level == null ? '' : String(p.reorder_level),
      minimum_stock: p.minimum_stock == null ? '' : String(p.minimum_stock),
      maximum_stock: p.maximum_stock == null ? '' : String(p.maximum_stock),
      status: p.status || 'active',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const currentAccountId = accountId ?? (await loadAccountId());
      if (!currentAccountId) {
        throw new Error('Business account not found.');
      }

      const reorderLevel = parseInt(form.reorder_level) || 0;
      const minimumStock = parseInt(form.minimum_stock) || 0;
      const maximumStock = parseInt(form.maximum_stock) || 100;
      const sellingPrice = parseFloat(form.selling_price) || 0;
      const payload = {
        account_id: currentAccountId,
        name: form.name,
        brand: form.brand,
        category: form.category,
        description: form.description,
        unit: form.unit,
        selling_price: sellingPrice,
        reorder_level: reorderLevel,
        minimum_stock: minimumStock,
        maximum_stock: maximumStock,
        status: form.status,
      };
      if (editProduct) {
        const { error: err } = await supabase.from('business_products').update(payload).eq('id', editProduct.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('business_products').insert(payload);
        if (err) throw err;
      }
      setShowModal(false);
      fetchProducts();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    const { error: err } = await supabase.from('business_products').delete().eq('id', id);
    if (err) setError(err.message);
    else void fetchProducts();
  };

  const categoryColors: Record<string, string> = {
    default: 'bg-muted text-muted-foreground',
  };

  const productColumns: RecordColumn<Product>[] = [
    {
      key: 'product',
      header: 'Product',
      card: 'title',
      render: (p) => (
        <div>
          <p className="font-medium text-foreground">{p.name}</p>
          {p.brand && <p className="text-xs text-muted-foreground">{p.brand}</p>}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (p) => (
        <span className={`text-xs font-600 px-2 py-0.5 rounded-full capitalize ${categoryColors[p.category] ?? categoryColors.default}`}>
          {p.category}
        </span>
      ),
    },
    { key: 'unit', header: 'Unit', render: (p) => <span className="text-muted-foreground">{p.unit}</span> },
    { key: 'selling_price', header: 'Selling Price', render: (p) => <span className="font-medium text-foreground">{formatMoney(Number(p.selling_price || 0), currencyCode)}</span> },
    { key: 'reorder_level', header: 'Reorder', render: (p) => <span className="text-muted-foreground">{p.reorder_level}</span> },
    { key: 'minimum_stock', header: 'Min Stock', render: (p) => <span className="text-muted-foreground">{p.minimum_stock}</span> },
    { key: 'maximum_stock', header: 'Max Stock', render: (p) => <span className="text-muted-foreground">{p.maximum_stock}</span> },
    { key: 'status', header: 'Status', card: 'meta', render: (p) => <StatusBadge variant={p.status === 'inactive' ? 'deactivated' : 'active'} /> },
    {
      key: 'actions',
      header: 'Actions',
      card: 'actions',
      render: (p) => (
        <div className="flex items-center justify-end gap-1">
          <button title="Edit product" onClick={() => openEdit(p)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <Pencil size={14} className="text-muted-foreground" />
          </button>
          <button title="View product" onClick={() => setViewProduct(p)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <Eye size={14} className="text-muted-foreground" />
          </button>
          <button title="Delete product" onClick={() => handleDelete(p.id)}
            className="p-1.5 rounded-lg hover:bg-danger/10 transition-colors">
            <Trash2 size={14} className="text-danger" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <AppLayout accountType="business" pageTitle="Products" pageSubtitle="Manage business product catalog">
      <div className="space-y-5">
        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-2 text-sm bg-card border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30 w-52"
              />
            </div>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
              className="text-sm bg-card border border-border rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary/30">
              <option value="all">All Categories</option>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="text-sm bg-card border border-border rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary/30">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchProducts} className="flex items-center gap-2 px-3 py-2 text-sm bg-card border border-border rounded-lg hover:bg-muted transition-colors">
              <RefreshCw size={14} />
            </button>
            <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 text-sm bg-warning text-warning-foreground rounded-lg hover:bg-warning/90 transition-colors font-medium">
              <Plus size={14} />
              Add Product
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-lg px-4 py-3">{error}</div>
        )}

        <ResponsiveRecordList
          rows={filtered}
          getRowId={(p) => p.id}
          loading={loading}
          skeletonRows={6}
          footer={`${filtered.length} product${filtered.length !== 1 ? 's' : ''}`}
          empty={
            <div className="px-4 py-16 text-center">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Package size={32} className="opacity-30" />
                <p>No products found. Add your first product.</p>
              </div>
            </div>
          }
          columns={productColumns}
        />
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="font-700 text-foreground">{editProduct ? 'Edit Product' : 'Add New Product'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-700 text-foreground">Product Details</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-600 text-muted-foreground mb-1">Product Name *</label>
                    <input required placeholder="Enter product name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full h-10 px-3 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="block text-xs font-600 text-muted-foreground mb-1">Category</label>
                    <input required placeholder="Enter category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full h-10 px-3 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-600 text-muted-foreground mb-1">Brand</label>
                    <input placeholder="Enter brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })}
                      className="w-full h-10 px-3 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="block text-xs font-600 text-muted-foreground mb-1">Selling Price ({currencyCode})</label>
                    <input required type="number" min="0" step="0.01" placeholder="Enter selling price" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })}
                      className="w-full h-10 px-3 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="block text-xs font-600 text-muted-foreground mb-1">Unit</label>
                    <select required value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
                      className="w-full h-10 px-3 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30">
                      <option value="" disabled>Select a unit</option>
                      <option value="Piece">Piece</option>
                      <option value="Box">Box</option>
                      <option value="Kg">Kg</option>
                      <option value="Litre">Litre</option>
                      <option value="Dozen">Dozen</option>
                      <option value="Pack">Pack</option>
                      <option value="Bundle">Bundle</option>
                    </select>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-600 text-muted-foreground mb-1">Description</label>
                  <textarea rows={3} placeholder="Enter description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-700 text-foreground">Stock</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-600 text-muted-foreground mb-1">Reorder Level</label>
                    <input type="number" min="0" placeholder="Enter reorder level" value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: e.target.value })}
                      className="w-full h-10 px-3 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="block text-xs font-600 text-muted-foreground mb-1">Minimum Stock</label>
                    <input type="number" min="0" placeholder="Enter minimum stock" value={form.minimum_stock} onChange={(e) => setForm({ ...form, minimum_stock: e.target.value })}
                      className="w-full h-10 px-3 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="block text-xs font-600 text-muted-foreground mb-1">Maximum Stock</label>
                    <input type="number" min="0" placeholder="Enter maximum stock" value={form.maximum_stock} onChange={(e) => setForm({ ...form, maximum_stock: e.target.value })}
                      className="w-full h-10 px-3 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-600 text-muted-foreground mb-1">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })}
                    className="w-full h-10 px-3 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {error && <p className="text-xs text-danger">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 px-4 py-2 text-sm bg-warning text-warning-foreground rounded-lg hover:bg-warning/90 transition-colors font-medium disabled:opacity-60">
                  {submitting ? 'Saving...' : editProduct ? 'Update Product' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-700 text-foreground">Product Details</h2>
              <button onClick={() => setViewProduct(null)} className="p-1.5 rounded-lg hover:bg-muted"><X size={16} /></button>
            </div>
            <dl className="grid grid-cols-2 gap-4 px-6 py-5 text-sm">
              {Object.entries(viewProduct).filter(([key]) => key !== 'id').map(([key, value]) => (
                <div key={key}>
                  <dt className="text-xs font-600 uppercase text-muted-foreground">{key.replaceAll('_', ' ')}</dt>
                  <dd className="mt-1 text-foreground break-words">
                    {key === 'selling_price' ? formatMoney(Number(value || 0), currencyCode) : String(value ?? '—')}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
