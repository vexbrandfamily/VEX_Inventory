'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { fetchAllRows } from '@/lib/supabase/fetchAllRows';
import { useAuth } from '@/contexts/AuthContext';
import { applyStockMovement, normalizeStatus } from '@/lib/stockMath';
import { Search, Plus, RefreshCw, SlidersHorizontal, ChevronDown, X, Eye, Pencil, Trash2 } from 'lucide-react';
import ResponsiveRecordList, { RecordColumn } from '@/components/ui/ResponsiveRecordList';


type StockOutSubtype = 'adjustment_out';
type ActiveTab = 'adjustments';

interface Movement {
  id: string;
  movement_type: string;
  movement_subtype: string;
  reference_number: string;
  item_id: string | null;
  item_name: string;
  quantity: number;
  performed_by: string;
  notes: string;
  reason: string;
  created_at: string;
}

interface StoreItem {
  id: string;
  code: string;
  name: string;
  current_stock: number;
  min_level: number;
}

interface MovementForm {
  reference_number: string;
  item_id: string;
  item_name: string;
  quantity: string;
  performed_by: string;
  notes: string;
  reason: string;
}

const defaultForm: MovementForm = {
  reference_number: '', item_id: '', item_name: '', quantity: '1', performed_by: '', notes: '', reason: '',
};

const tabConfig: Record<ActiveTab, { subtype: StockOutSubtype; label: string; icon: React.ElementType; color: string; bg: string; description: string }> = {
  adjustments: { subtype: 'adjustment_out', label: 'Adjustments Out', icon: SlidersHorizontal, color: 'text-warning', bg: 'bg-warning', description: 'Stock/items removed from the store through an approved adjustment' },
};

export default function StoreStockOutPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('adjustments');
  const [movements, setMovements] = useState<Movement[]>([]);
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editMovement, setEditMovement] = useState<Movement | null>(null);
  const [viewMovement, setViewMovement] = useState<Movement | null>(null);
  const [itemSearch, setItemSearch] = useState('');
  const [showItemOptions, setShowItemOptions] = useState(false);
  const [form, setForm] = useState<MovementForm>(defaultForm);
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  const fetchAccount = useCallback(async () => {
    if (!user?.id) return null;
    const query = supabase.from('accounts').select('id').eq('account_type', 'store');
    const { data, error: accountError } = user.email
      ? await query.or(`user_id.eq.${user.id},email.eq.${user.email}`).maybeSingle()
      : await query.eq('user_id', user.id).maybeSingle();
    if (accountError) throw accountError;
    setAccountId(data?.id ?? null);
    return data?.id ?? null;
  }, [supabase, user?.email, user?.id]);

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const currentAccountId = accountId ?? await fetchAccount();
      if (!currentAccountId) {
        setMovements([]);
        return;
      }
      const query = supabase
        .from('store_adjustment_out')
        .select('*')
        .eq('account_id', currentAccountId)
        .order('created_at', { ascending: false });
      setMovements(await fetchAllRows((from, to) => query.range(from, to)));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [accountId, fetchAccount, supabase]);

  const fetchStoreItems = useCallback(async () => {
    const query = supabase.from('store_items').select('id, code, name, current_stock, min_level').order('name');
    setStoreItems(await fetchAllRows((from, to) => query.range(from, to)));
  }, []);

  useEffect(() => { fetchMovements(); fetchStoreItems(); }, [fetchMovements, fetchStoreItems]);

  const searchTerm = search.trim().toLowerCase();
  const filtered = movements.filter((m) =>
    m.item_name.toLowerCase().includes(searchTerm) ||
    m.reference_number.toLowerCase().includes(searchTerm) ||
    m.performed_by.toLowerCase().includes(searchTerm) ||
    m.reason.toLowerCase().includes(searchTerm)
  );

  const openModal = () => {
    setEditMovement(null);
    setForm(defaultForm);
    setItemSearch('');
    setShowItemOptions(false);
    setShowModal(true);
  };

  const openEdit = (movement: Movement) => {
    setEditMovement(movement);
    setForm({
      reference_number: movement.reference_number,
      item_id: movement.item_id || '',
      item_name: movement.item_name,
      quantity: String(movement.quantity),
      performed_by: movement.performed_by,
      notes: movement.notes,
      reason: movement.reason,
    });
    setItemSearch(movement.item_name);
    setShowItemOptions(false);
    setShowModal(true);
    setError(null);
  };

  const handleItemSelect = (itemId: string) => {
    const item = storeItems.find((i) => i.id === itemId);
    setForm((current) => ({ ...current, item_id: itemId, item_name: item?.name || '' }));
    setItemSearch(item?.name || '');
    setShowItemOptions(false);
  };

  const filteredStoreItems = storeItems.filter((item) =>
    item.name.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'adjustments' && !form.reason.trim()) {
      setError('Reason is required for adjustments');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const qty = parseInt(form.quantity) || 0;
      const currentAccountId = accountId ?? await fetchAccount();
      if (!currentAccountId) throw new Error('Store account could not be found.');
      const movementPayload = {
        account_id: currentAccountId,
        reference_number: form.reference_number,
        item_id: form.item_id || null,
        item_name: form.item_name,
        quantity: qty,
        performed_by: form.performed_by,
        notes: form.notes,
        reason: form.reason,
      };
      const { error: err } = editMovement
        ? await supabase.from('store_adjustment_out').update(movementPayload).eq('id', editMovement.id)
        : await supabase.from('store_adjustment_out').insert(movementPayload);
      if (err) throw err;

      // Decrease stock level by the net outgoing quantity.
      const item = form.item_id ? storeItems.find((i) => i.id === form.item_id) : null;
      const oldItem = editMovement?.item_id ? storeItems.find((i) => i.id === editMovement.item_id) : null;
      const affectedItems = oldItem && item && oldItem.id !== item.id ? [oldItem, item] : item ? [item] : [];
      for (const affectedItem of affectedItems) {
        const stockAfterRemoval = affectedItem.id === oldItem?.id ? affectedItem.current_stock + (editMovement?.quantity ?? 0) : affectedItem.current_stock;
        const newStock = applyStockMovement(stockAfterRemoval, affectedItem.id === item?.id ? qty : 0, 'out');
        await supabase.from('store_items').update({ current_stock: newStock, status: normalizeStatus(newStock, affectedItem.min_level ?? 5), last_movement_date: new Date().toISOString().split('T')[0] }).eq('id', affectedItem.id);
      }

      setShowModal(false);
      fetchMovements();
      fetchStoreItems();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (movement: Movement) => {
    if (!confirm('Delete this adjustment?')) return;
    setError(null);
    try {
      const item = movement.item_id ? storeItems.find((i) => i.id === movement.item_id) : null;
      if (item) {
        const newStock = applyStockMovement(item.current_stock, movement.quantity, 'in');
        const { error: itemError } = await supabase.from('store_items').update({ current_stock: newStock, status: normalizeStatus(newStock, item.min_level ?? 5) }).eq('id', item.id);
        if (itemError) throw itemError;
      }
      const { error: movementError } = await supabase.from('store_adjustment_out').delete().eq('id', movement.id);
      if (movementError) throw movementError;
      await fetchMovements();
      await fetchStoreItems();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const typeConfig = tabConfig[activeTab];
  const TypeIcon = typeConfig.icon;

  const movementColumns = useMemo<RecordColumn<Movement>[]>(() => {
    const cols: RecordColumn<Movement>[] = [
      {
        key: 'ref',
        header: 'Reference',
        card: 'subtitle',
        render: (m) => <span className="font-mono text-xs font-600 text-primary">{m.reference_number}</span>,
      },
      {
        key: 'item',
        header: 'Item',
        card: 'title',
        render: (m) => <span className="font-medium text-foreground">{m.item_name}</span>,
      },
      {
        key: 'qty',
        header: 'Qty (-)',
        card: 'meta',
        render: (m) => <span className="font-700 text-danger">-{m.quantity}</span>,
      },
      { key: 'by', header: 'Performed By', render: (m) => <span className="text-muted-foreground">{m.performed_by || '—'}</span> },
    ];
    if (activeTab === 'adjustments') {
      cols.push({
        key: 'reason',
        header: 'Reason',
        cardSpan: 2,
        tableCellClassName: 'text-muted-foreground text-xs max-w-32 truncate',
        render: (m) => <span className="text-muted-foreground text-xs">{m.reason || '—'}</span>,
      });
    }
    cols.push(
      {
        key: 'notes',
        header: 'Notes',
        cardSpan: 2,
        tableCellClassName: 'text-muted-foreground text-xs max-w-40 truncate',
        render: (m) => <span className="text-muted-foreground text-xs">{m.notes || '—'}</span>,
      },
      {
        key: 'date',
        header: 'Date',
        render: (m) => (
          <span className="text-muted-foreground text-xs">{new Date(m.created_at).toLocaleDateString()}</span>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        card: 'actions',
        render: (m) => (
          <div className="flex items-center justify-end gap-1">
            <button title="View adjustment" onClick={() => setViewMovement(m)} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><Eye size={14} className="text-muted-foreground" /></button>
            <button title="Edit adjustment" onClick={() => openEdit(m)} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><Pencil size={14} className="text-muted-foreground" /></button>
            <button title="Delete adjustment" onClick={() => handleDelete(m)} className="p-1.5 rounded-lg hover:bg-danger/10 transition-colors"><Trash2 size={14} className="text-danger" /></button>
          </div>
        ),
      },
    );
    return cols;
  }, [activeTab, fetchMovements, fetchStoreItems, storeItems]);

  return (
    <AppLayout accountType="store" pageTitle="Adjustments Out" pageSubtitle="Record outgoing stock adjustments">
      <div className="space-y-5">
        {/* Tabs */}
        <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
          {(Object.keys(tabConfig) as ActiveTab[]).map((tab) => {
            const cfg = tabConfig[tab];
            const Icon = cfg.icon;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon size={14} />
                {cfg.label}
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={`Search ${typeConfig.label.toLowerCase()}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-2 text-sm bg-card border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30 w-52"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={fetchMovements} className="flex items-center gap-2 px-3 py-2 text-sm bg-card border border-border rounded-lg hover:bg-muted transition-colors">
              <RefreshCw size={14} />
            </button>
            <button onClick={openModal} className={`flex items-center gap-2 px-4 py-2 text-sm text-white rounded-lg hover:opacity-90 transition-colors font-medium ${typeConfig.bg}`}>
              <Plus size={14} />
              New Adjustment
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-lg px-4 py-3">{error}</div>
        )}

        <ResponsiveRecordList
          rows={filtered}
          getRowId={(m) => m.id}
          loading={loading}
          skeletonRows={5}
          empty={
            <div className="px-4 py-16 text-center">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <TypeIcon size={32} className="opacity-30" />
                <p>No {typeConfig.label.toLowerCase()} recorded yet.</p>
              </div>
            </div>
          }
          columns={movementColumns}
        />
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-700 text-foreground">{editMovement ? 'Edit Adjustment Out' : 'New Adjustment Out'}</h2>
              <button onClick={() => { setShowModal(false); setShowItemOptions(false); setError(null); }} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1">Reference Number</label>
                <input value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" />
              </div>
              <div className="relative">
                <label className="block text-xs font-600 text-muted-foreground mb-1">Item *</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={itemSearch}
                    onFocus={() => setShowItemOptions(true)}
                    onChange={(e) => {
                      setItemSearch(e.target.value);
                      setForm((current) => ({ ...current, item_id: '', item_name: '' }));
                      setShowItemOptions(true);
                    }}
                    placeholder="Search or select an item..."
                    className="w-full pl-8 pr-9 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setItemSearch('');
                      setShowItemOptions(true);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                    aria-label="Show all items"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
                {showItemOptions && (
                  <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-card py-1 shadow-lg">
                    {filteredStoreItems.length > 0 ? filteredStoreItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleItemSelect(item.id)}
                        className={`block w-full px-3 py-2 text-left text-sm hover:bg-muted ${form.item_id === item.id ? 'bg-muted font-600 text-primary' : 'text-foreground'}`}
                      >
                        {item.name}
                      </button>
                    )) : (
                      <p className="px-3 py-2 text-sm text-muted-foreground">No items found.</p>
                    )}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-600 text-muted-foreground mb-1">Quantity *</label>
                  <input required type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-xs font-600 text-muted-foreground mb-1">Performed By</label>
                  <input value={form.performed_by} onChange={(e) => setForm({ ...form, performed_by: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" />
                </div>
              </div>
              {activeTab === 'adjustments' && (
                <div>
                  <label className="block text-xs font-600 text-muted-foreground mb-1">Reason for Leaving * <span className="text-danger">Required</span></label>
                  <input required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" />
                </div>
              )}
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1">Notes</label>
                <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" />
              </div>
              {error && <p className="text-xs text-danger">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setShowItemOptions(false); setError(null); }}
                  className="flex-1 px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={submitting}
                  className={`flex-1 px-4 py-2 text-sm text-white rounded-lg hover:opacity-90 transition-colors font-medium disabled:opacity-60 ${typeConfig.bg}`}>
                  {submitting ? 'Saving...' : editMovement ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewMovement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setViewMovement(null)}>
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border"><h2 className="font-700 text-foreground">Adjustment Out Details</h2><button title="Close" onClick={() => setViewMovement(null)} className="p-1.5 rounded-lg hover:bg-muted"><X size={16} /></button></div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 px-6 py-5"><div><dt className="text-xs text-muted-foreground">Reference</dt><dd className="mt-1 text-foreground">{viewMovement.reference_number || '—'}</dd></div><div><dt className="text-xs text-muted-foreground">Item</dt><dd className="mt-1 text-foreground">{viewMovement.item_name}</dd></div><div><dt className="text-xs text-muted-foreground">Quantity</dt><dd className="mt-1 text-foreground">-{viewMovement.quantity}</dd></div><div><dt className="text-xs text-muted-foreground">Performed By</dt><dd className="mt-1 text-foreground">{viewMovement.performed_by || '—'}</dd></div><div className="col-span-2"><dt className="text-xs text-muted-foreground">Reason</dt><dd className="mt-1 text-foreground">{viewMovement.reason || '—'}</dd></div><div className="col-span-2"><dt className="text-xs text-muted-foreground">Notes</dt><dd className="mt-1 text-foreground">{viewMovement.notes || '—'}</dd></div></dl>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
