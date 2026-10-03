'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { fetchAllRows } from '@/lib/supabase/fetchAllRows';
import { useAuth } from '@/contexts/AuthContext';
import { applyStockMovement, normalizeStatus } from '@/lib/stockMath';
import { Search, Plus, RefreshCw, ArrowDownToLine, SlidersHorizontal, X } from 'lucide-react';
import ResponsiveRecordList, { RecordColumn } from '@/components/ui/ResponsiveRecordList';


type StockInSubtype = 'adjustment_in';
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
  min_level?: number;
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

const tabConfig: Record<ActiveTab, { subtype: StockInSubtype; label: string; icon: React.ElementType; color: string; bg: string; description: string }> = {
  adjustments: { subtype: 'adjustment_in', label: 'Adjustments In', icon: SlidersHorizontal, color: 'text-accent', bg: 'bg-accent', description: 'Stock/items added to the store through an approved adjustment' },
};

export default function StoreStockInPage() {
  const activeTab: ActiveTab = 'adjustments';
  const { user } = useAuth();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
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
        .from('store_adjustment_in')
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

  const filtered = movements.filter((m) =>
    m.item_name.toLowerCase().includes(search.toLowerCase()) ||
    m.reference_number.toLowerCase().includes(search.toLowerCase())
  );

  const generateRef = () => {
    const prefix = 'ADJ-IN';
    return `${prefix}-${Date.now().toString().slice(-6)}`;
  };

  const openModal = () => {
    setForm({ ...defaultForm, reference_number: generateRef() });
    setShowModal(true);
  };

  const handleItemSelect = (itemId: string) => {
    const item = storeItems.find((i) => i.id === itemId);
    setForm({ ...form, item_id: itemId, item_name: item?.name || '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.reason.trim()) {
      setError('Reason is required for adjustments');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const qty = parseInt(form.quantity) || 0;
      const currentAccountId = accountId ?? await fetchAccount();
      if (!currentAccountId) throw new Error('Store account could not be found.');
      const { error: err } = await supabase.from('store_adjustment_in').insert({
        account_id: currentAccountId,
        reference_number: form.reference_number,
        item_id: form.item_id || null,
        item_name: form.item_name,
        quantity: qty,
        performed_by: form.performed_by,
        notes: form.notes,
        reason: form.reason,
      });
      if (err) throw err;

      // Increase stock level by the net incoming quantity.
      if (form.item_id) {
        const item = storeItems.find((i) => i.id === form.item_id);
        if (item) {
          const newStock = applyStockMovement(item.current_stock, qty, 'in');
          const status = normalizeStatus(newStock, item.min_level ?? 5);
          await supabase.from('store_items').update({ current_stock: newStock, status, last_movement_date: new Date().toISOString().split('T')[0] }).eq('id', form.item_id);
        }
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
        header: 'Qty (+)',
        card: 'meta',
        render: (m) => <span className="font-700 text-success">+{m.quantity}</span>,
      },
      { key: 'by', header: 'Performed By', render: (m) => <span className="text-muted-foreground">{m.performed_by || '—'}</span> },
    ];
    cols.push({
      key: 'reason',
      header: 'Reason',
      cardSpan: 2,
      tableCellClassName: 'text-muted-foreground text-xs max-w-32 truncate',
      render: (m) => <span className="text-muted-foreground text-xs">{m.reason || '—'}</span>,
    });
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
    );
    return cols;
  }, [activeTab]);

  return (
    <AppLayout accountType="store" pageTitle="Adjustments In" pageSubtitle="Record incoming stock adjustments">
      <div className="space-y-5">
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
              <h2 className="font-700 text-foreground">New Adjustment In</h2>
              <button onClick={() => { setShowModal(false); setError(null); }} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1">Reference Number</label>
                <input value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1">Item *</label>
                <select required value={form.item_id} onChange={(e) => handleItemSelect(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30">
                  <option value="">Select item...</option>
                  {storeItems.map((item) => (
                    <option key={item.id} value={item.id}>{item.name} (Stock: {item.current_stock})</option>
                  ))}
                </select>
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
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1">Reason for Return * <span className="text-danger">Required</span></label>
                <input required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="Why is this stock being returned?"
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1">Notes</label>
                <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" />
              </div>
              {error && <p className="text-xs text-danger">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setError(null); }}
                  className="flex-1 px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={submitting}
                  className={`flex-1 px-4 py-2 text-sm text-white rounded-lg hover:opacity-90 transition-colors font-medium disabled:opacity-60 ${typeConfig.bg}`}>
                  {submitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
