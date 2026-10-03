'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { fetchAllRows } from '@/lib/supabase/fetchAllRows';
import { Search, Plus, RefreshCw, Pencil, Trash2, Package, Eye, X } from 'lucide-react';
import ResponsiveRecordList, { RecordColumn } from '@/components/ui/ResponsiveRecordList';

interface StoreItem {
  id: string;
  code: string;
  name: string;
  category: 'consumable' | 'permanent_expendable' | 'permanent' | 'expendable' | 'perishable';
  unit: string;
  current_stock: number;
  min_level: number;
  max_level: number;
  location: string;
  last_movement_date: string;
  status: 'available' | 'low-stock' | 'out-of-stock';
}

interface ItemForm {
  name: string;
  category: 'consumable' | 'permanent_expendable';
  unit: string;
  min_level: string;
  max_level: string;
  location: string;
}

const defaultForm: ItemForm = {
  name: '', category: 'consumable', unit: 'Piece',
  min_level: '0', max_level: '100', location: '',
};

const categoryOptions: Array<{ value: ItemForm['category']; label: string }> = [
  { value: 'consumable', label: 'Consumable' },
  { value: 'permanent_expendable', label: 'Permanent & Expendable' },
];

const unitOptions = [
  'Piece', 'Box', 'Pack', 'Set', 'Pair', 'Dozen', 'Carton', 'Case',
  'Bottle', 'Can', 'Jar', 'Bag', 'Sack', 'Roll', 'Meter', 'Kilogram',
  'Gram', 'Liter', 'Milliliter',
];

export default function StoreItemsPage() {
  const [items, setItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<StoreItem | null>(null);
  const [viewItem, setViewItem] = useState<StoreItem | null>(null);
  const [form, setForm] = useState<ItemForm>(defaultForm);
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('store_items').select('*').order('name', { ascending: true });
      if (filterCategory !== 'all') query = query.eq('category', filterCategory);
      setItems(await fetchAllRows((from, to) => query.range(from, to)));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filterCategory]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const filtered = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.code?.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setEditItem(null); setForm(defaultForm); setShowModal(true); };
  const openEdit = (item: StoreItem) => {
    setEditItem(item);
    setForm({
      name: item.name, category: item.category === 'consumable' ? 'consumable' : 'permanent_expendable', unit: item.unit,
      min_level: String(item.min_level),
      max_level: String(item.max_level), location: item.location || '',
    });
    setShowModal(true);
  };

  const computeStatus = (stock: number, min: number): 'available' | 'low-stock' | 'out-of-stock' => {
    if (stock <= 0) return 'out-of-stock';
    if (stock <= min) return 'low-stock';
    return 'available';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const min = parseInt(form.min_level) || 0;
      const max = parseInt(form.max_level) || 100;
      const payload = {
        code: editItem?.code || `ITEM-${Date.now().toString().slice(-8)}`,
        name: form.name,
        category: form.category,
        unit: form.unit,
        current_stock: editItem?.current_stock || 0,
        min_level: min,
        max_level: max,
        location: form.location,
        status: computeStatus(editItem?.current_stock || 0, min),
        last_movement_date: new Date().toISOString().split('T')[0],
      };
      if (editItem) {
        const { error: err } = await supabase.from('store_items').update(payload).eq('id', editItem.id);
        if (err) throw err;
      } else {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error('Sign in to add an item.');

        let { data: account, error: accountError } = await supabase
          .from('accounts')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (accountError) throw accountError;

        if (!account && user.email) {
          const result = await supabase.from('accounts').select('id').eq('email', user.email).maybeSingle();
          account = result.data;
          accountError = result.error;
          if (accountError) throw accountError;
        }
        if (!account) throw new Error('Store account not found.');

        const { error: err } = await supabase.from('store_items').insert({ ...payload, account_id: account.id });
        if (err) throw err;
      }
      setShowModal(false);
      fetchItems();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    const { error: err } = await supabase.from('store_items').delete().eq('id', id);
    if (!err) fetchItems();
  };

  const categoryColors: Record<string, string> = {
    permanent_expendable: 'bg-primary/10 text-primary',
    permanent: 'bg-primary/10 text-primary',
    consumable: 'bg-accent/10 text-accent',
    expendable: 'bg-primary/10 text-primary',
    perishable: 'bg-warning/10 text-warning',
  };

  const categoryLabel = (category: StoreItem['category']) => category === 'consumable' ? 'Consumable' : 'Permanent & Expendable';

  const itemColumns = useMemo<RecordColumn<StoreItem>[]>(() => [
    {
      key: 'name',
      header: 'Name',
      card: 'title',
      render: (item) => <span className="font-medium text-foreground">{item.name}</span>,
    },
    {
      key: 'category',
      header: 'Category',
      render: (item) => (
        <span className={`text-xs font-600 px-2 py-0.5 rounded-full capitalize ${categoryColors[item.category]}`}>
          {categoryLabel(item.category)}
        </span>
      ),
    },
    { key: 'unit', header: 'Unit', render: (item) => <span className="text-muted-foreground">{item.unit}</span> },
    { key: 'min', header: 'Min Level', render: (item) => <span className="text-muted-foreground">{item.min_level}</span> },
    { key: 'max', header: 'Max Level', render: (item) => <span className="text-muted-foreground">{item.max_level}</span> },
    { key: 'location', header: 'Location', render: (item) => <span className="text-muted-foreground">{item.location || '—'}</span> },
    {
      key: 'actions',
      header: 'Actions',
      card: 'actions',
      render: (item) => (
        <div className="flex items-center justify-end gap-1">
          <button title="View item" onClick={() => setViewItem(item)} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><Eye size={14} className="text-muted-foreground" /></button>
          <button title="Edit item" onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><Pencil size={14} className="text-muted-foreground" /></button>
          <button title="Delete item" onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg hover:bg-danger/10 transition-colors"><Trash2 size={14} className="text-danger" /></button>
        </div>
      ),
    },
  ], []);

  return (
    <AppLayout accountType="store" pageTitle="Items" pageSubtitle="Manage store inventory items">
      <div className="space-y-5">
        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-2 text-sm bg-card border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30 w-52"
              />
            </div>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
              className="text-sm bg-card border border-border rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary/30">
              <option value="all">All Categories</option>
              <option value="consumable">Consumable</option>
              <option value="permanent_expendable">Permanent &amp; Expendable</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchItems} className="flex items-center gap-2 px-3 py-2 text-sm bg-card border border-border rounded-lg hover:bg-muted transition-colors">
              <RefreshCw size={14} />
            </button>
            <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 text-sm bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors font-medium">
              <Plus size={14} />
              Add Item
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-lg px-4 py-3">{error}</div>
        )}

        <ResponsiveRecordList
          rows={filtered}
          getRowId={(item) => item.id}
          loading={loading}
          skeletonRows={6}
          footer={`${filtered.length} item${filtered.length !== 1 ? 's' : ''}`}
          empty={
            <div className="px-4 py-16 text-center">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Package size={32} className="opacity-30" />
                <p>No items found. Add your first item.</p>
              </div>
            </div>
          }
          columns={itemColumns}
        />
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="font-700 text-foreground">{editItem ? 'Edit Item' : 'Add New Item'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1">Item Name *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-600 text-muted-foreground mb-1">Category *</label>
                  <select required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ItemForm['category'] })}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30">
                    {categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-600 text-muted-foreground mb-1">Unit *</label>
                  <select required value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30">
                    {unitOptions.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-600 text-muted-foreground mb-1">Min Level *</label>
                  <input type="number" min="0" value={form.min_level} onChange={(e) => setForm({ ...form, min_level: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-xs font-600 text-muted-foreground mb-1">Max Level *</label>
                  <input required type="number" min="0" value={form.max_level} onChange={(e) => setForm({ ...form, max_level: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1">Location</label>
                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g. Shelf A-3"
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" />
              </div>
              {error && <p className="text-xs text-danger">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 px-4 py-2 text-sm bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors font-medium disabled:opacity-60">
                  {submitting ? 'Saving...' : editItem ? 'Update Item' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setViewItem(null)}>
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-700 text-foreground">Item Details</h2>
              <button title="Close" onClick={() => setViewItem(null)} className="p-1.5 rounded-lg hover:bg-muted"><X size={16} /></button>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 px-6 py-5">
              <div className="col-span-2"><dt className="text-xs text-muted-foreground">Item Name</dt><dd className="mt-1 font-medium text-foreground">{viewItem.name}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Category</dt><dd className="mt-1 text-foreground capitalize">{categoryLabel(viewItem.category)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Unit</dt><dd className="mt-1 text-foreground">{viewItem.unit}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Min Level</dt><dd className="mt-1 text-foreground">{viewItem.min_level}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Max Level</dt><dd className="mt-1 text-foreground">{viewItem.max_level}</dd></div>
              <div className="col-span-2"><dt className="text-xs text-muted-foreground">Location</dt><dd className="mt-1 text-foreground">{viewItem.location || '—'}</dd></div>
            </dl>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
