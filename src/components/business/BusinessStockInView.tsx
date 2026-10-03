'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { fetchAllRows } from '@/lib/supabase/fetchAllRows';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountCurrency } from '@/hooks/useAccountCurrency';
import { formatMoney } from '@/lib/countries';
import { applyStockMovement, normalizeStatus } from '@/lib/stockMath';
import { Search, Plus, RefreshCw, ArrowDownToLine, SlidersHorizontal, X, Eye, Pencil, Trash2 } from 'lucide-react';
import ResponsiveRecordList, { RecordColumn } from '@/components/ui/ResponsiveRecordList';

type StockInSubtype = 'purchase' | 'adjustment_in';
type ActiveTab = 'purchases' | 'adjustments';

interface Transaction {
  id: string;
  product_id?: string;
  transaction_id?: string;
  transaction_type: string;
  movement_subtype: string;
  total_amount: number;
  purchase_price?: number;
  item_count: number;
  cashier_name: string;
  detail: string;
  reason: string;
  purchase_date: string;
  quantity: number;
  supplier: string;
  notes: string;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
  category?: string;
  current_stock?: number;
  min_level?: number;
  minimum_stock?: number;
}

interface TxForm {
  product_id: string;
  product_name: string;
  quantity: string;
  purchase_price: string;
  purchase_date: string;
  supplier: string;
  notes: string;
  reason: string;
}

const defaultForm: TxForm = {
  product_id: '', product_name: '', quantity: '1',
  purchase_price: '', purchase_date: new Date().toISOString().split('T')[0], supplier: '', notes: '', reason: '',
};

const tabConfig: Record<ActiveTab, { subtype: StockInSubtype; label: string; icon: React.ElementType; color: string; bg: string; description: string }> = {
  purchases: { subtype: 'purchase', label: 'Purchases', icon: ArrowDownToLine, color: 'text-primary', bg: 'bg-primary', description: 'Items/Stock entered the Business from supplier' },
  adjustments: { subtype: 'adjustment_in', label: 'Adjustments In', icon: SlidersHorizontal, color: 'text-accent', bg: 'bg-accent', description: 'Stock/Items entering the Business through approved non-purchase reasons such as returns, supplier credits, and approved additions' },
};

export default function BusinessStockInView({
  defaultTab = 'purchases',
  hideTabs = false,
  titleOverride,
  subtitleOverride,
}: {
  defaultTab?: ActiveTab;
  hideTabs?: boolean;
  titleOverride?: string;
  subtitleOverride?: string;
}) {
  const [activeTab, setActiveTab] = useState<ActiveTab>(defaultTab);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [viewTransaction, setViewTransaction] = useState<Transaction | null>(null);
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);
  const [form, setForm] = useState<TxForm>(defaultForm);
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

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const currentAccountId = accountId ?? (await loadAccountId());
      let query = supabase
        .from('business_transactions')
        .select('*')
        .eq('movement_subtype', tabConfig[activeTab].subtype)
        .order('created_at', { ascending: false });

      if (currentAccountId) {
        query = query.eq('account_id', currentAccountId);
      }

      const data = await fetchAllRows((from, to) => query.range(from, to));
      if (activeTab === 'purchases' && data?.length) {
        const purchasePrices = [];
        const transactionIds = data.map((transaction) => transaction.id);
        for (let offset = 0; offset < transactionIds.length; offset += 500) {
          const purchaseQuery = supabase
            .from('business_purchases')
            .select('transaction_id, purchase_price, unit_price')
            .in('transaction_id', transactionIds.slice(offset, offset + 500));
          purchasePrices.push(...await fetchAllRows((from, to) => purchaseQuery.range(from, to)));
        }
        const pricesByTransaction = new Map(purchasePrices.map((purchase) => [purchase.transaction_id, purchase]));
        setTransactions(data.map((transaction) => {
          const purchase = pricesByTransaction.get(transaction.id);
          return {
            ...transaction,
            purchase_price: Number(purchase?.purchase_price ?? purchase?.unit_price ?? 0),
          };
        }));
      } else {
        setTransactions(data);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [accountId, activeTab, loadAccountId, supabase]);

  const fetchProducts = useCallback(async () => {
    try {
      const currentAccountId = accountId ?? (await loadAccountId());

      let query = supabase
        .from('business_products')
        .select('id, name, category, current_stock, min_level, minimum_stock')
        .neq('status', 'inactive')
        .order('name');

      if (currentAccountId) {
        query = query.eq('account_id', currentAccountId);
      }

      setProducts(await fetchAllRows((from, to) => query.range(from, to)));
    } catch (e: any) {
      setError(e.message);
    }
  }, [accountId, loadAccountId, supabase]);

  useEffect(() => { setActiveTab(defaultTab); }, [defaultTab]);
  useEffect(() => { void loadAccountId(); }, [loadAccountId]);
  useEffect(() => { void fetchTransactions(); void fetchProducts(); }, [fetchTransactions, fetchProducts]);

  const filtered = transactions.filter((t) =>
    t.detail.toLowerCase().includes(search.toLowerCase()) ||
    (t.supplier || '').toLowerCase().includes(search.toLowerCase())
  );

  const openModal = () => {
    setEditTransaction(null);
    setForm({ ...defaultForm });
    setProductSearch('');
    setShowModal(true);
  };

  const openEdit = (transaction: Transaction) => {
    const product = products.find((item) => item.id === transaction.product_id);
    setEditTransaction(transaction);
    setForm({
      ...defaultForm,
      product_id: transaction.product_id || '',
      product_name: product?.name || transaction.detail?.split(' x')[0] || '',
      quantity: String(transaction.quantity || transaction.item_count || 1),
      purchase_price: String(transaction.purchase_price ?? (transaction.total_amount || 0) / Math.max(1, transaction.quantity || transaction.item_count || 1)),
      purchase_date: transaction.purchase_date || defaultForm.purchase_date,
      supplier: transaction.supplier || '',
      notes: transaction.notes || '',
      reason: transaction.reason || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (transaction: Transaction) => {
    if (!confirm('Delete this record?')) return;
    setError(null);
    if (transaction.product_id) {
      const { data: product } = await supabase.from('business_products').select('current_stock, min_level, minimum_stock').eq('id', transaction.product_id).single();
      if (product) {
        const quantity = transaction.quantity || transaction.item_count || 0;
        const currentStock = Math.max(0, Number(product.current_stock || 0) - quantity);
        await supabase.from('business_products').update({ current_stock: currentStock, status: normalizeStatus(currentStock, product.minimum_stock ?? product.min_level ?? 5) }).eq('id', transaction.product_id);
      }
    }
    const { error: err } = await supabase.from('business_transactions').delete().eq('id', transaction.id);
    if (err) setError(err.message);
    else { setTransactions((current) => current.filter((item) => item.id !== transaction.id)); void fetchProducts(); }
  };

  const handleProductSelect = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    setProductSearch('');
    setForm({ ...form, product_id: productId, product_name: product?.name || '' });
  };

  const filteredProducts = useMemo(() => products.filter((product) => {
    const haystack = `${product.name} ${product.category || ''}`.toLowerCase();
    return haystack.includes(productSearch.toLowerCase());
  }), [productSearch, products]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'adjustments' && !form.reason.trim()) {
      setError('Reason is required for adjustments');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const currentAccountId = accountId ?? (await loadAccountId());
      if (!currentAccountId) {
        throw new Error('Business account not found.');
      }

      const qty = parseInt(form.quantity) || 0;
      const purchasePrice = parseFloat(form.purchase_price) || 0;
      const total = qty * purchasePrice;

      if (!form.product_id) {
        throw new Error('Select a product before saving the purchase.');
      }

      const purchaseDate = form.purchase_date || new Date().toISOString().split('T')[0];

      const transactionPayload = {
        account_id: currentAccountId,
        product_id: form.product_id,
        transaction_type: activeTab === 'adjustments' ? 'adjustment' : 'purchase',
        movement_subtype: tabConfig[activeTab].subtype,
        total_amount: total,
        item_count: qty,
        quantity: qty,
        purchase_date: purchaseDate,
        supplier: form.supplier,
        detail: form.product_name ? `${form.product_name} x${qty}` : form.notes,
        reason: form.reason,
        notes: form.notes,
      };
      const transactionQuery = editTransaction
        ? supabase.from('business_transactions').update(transactionPayload).eq('id', editTransaction.id).select('id').single()
        : supabase.from('business_transactions').insert(transactionPayload).select('id').single();
      const { data: transaction, error: err } = await transactionQuery;
      if (err) throw err;
      const transactionId = transaction?.id || editTransaction?.id;

      if (activeTab === 'adjustments') {
        const adjustmentPayload = {
          account_id: currentAccountId,
          transaction_id: transactionId,
          product_id: form.product_id,
          product_name: form.product_name,
          quantity: qty,
          amount: total,
          reason: form.reason,
          notes: form.notes,
        };
        const { error: adjustmentErr } = editTransaction
          ? await supabase.from('business_adjustment_in').update(adjustmentPayload).eq('transaction_id', editTransaction.id)
          : await supabase.from('business_adjustment_in').insert(adjustmentPayload);
        if (adjustmentErr) throw adjustmentErr;
      } else {
        const purchasePayload = {
          account_id: currentAccountId,
          transaction_id: transactionId,
          product_id: form.product_id,
          product_name: form.product_name,
          quantity: qty,
          unit_price: purchasePrice,
          purchase_price: purchasePrice,
          total_amount: total,
          purchase_date: purchaseDate,
          supplier: form.supplier,
          notes: form.notes,
        };
        const { error: purchaseErr } = editTransaction
          ? await supabase.from('business_purchases').update(purchasePayload).eq('transaction_id', editTransaction.id)
          : await supabase.from('business_purchases').insert(purchasePayload);
        if (purchaseErr) throw purchaseErr;
      }

      if (form.product_id) {
        const product = products.find((p) => p.id === form.product_id);
        if (product) {
          const oldQuantity = editTransaction?.quantity || editTransaction?.item_count || 0;
          const newStock = editTransaction && editTransaction.product_id === form.product_id
            ? Math.max(0, Number(product.current_stock ?? 0) - oldQuantity + qty)
            : applyStockMovement(product.current_stock ?? 0, qty, 'in');
          const status = normalizeStatus(newStock, product.minimum_stock ?? product.min_level ?? 5);
          await supabase.from('business_products').update({
            current_stock: newStock,
            status,
            last_sale_date: new Date().toISOString().split('T')[0],
          }).eq('id', form.product_id);
        }
      }

      setShowModal(false);
      setEditTransaction(null);
      fetchTransactions();
      fetchProducts();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const typeConfig = tabConfig[activeTab];
  const TypeIcon = typeConfig.icon;

  const transactionColumns = useMemo<RecordColumn<Transaction>[]>(() => {
    const cols: RecordColumn<Transaction>[] = [
      {
        key: 'detail',
        header: 'Detail',
        card: 'title',
        tableCellClassName: 'text-muted-foreground text-xs max-w-40 truncate',
        render: (t) => <span className="text-muted-foreground text-xs">{t.detail || '—'}</span>,
      },
      {
        key: 'qty',
        header: activeTab === 'adjustments' ? 'Quantity' : 'Qty (+)',
        render: (t) => <span className="font-700 text-success">{activeTab === 'adjustments' ? '' : '+'}{t.item_count}</span>,
      },
      ...(activeTab === 'purchases' ? [
        { key: 'purchase_price', header: 'Purchase Price', render: (t: Transaction) => <span className="text-muted-foreground">{formatMoney(Number(t.purchase_price || 0), currencyCode)}</span> },
      ] : []),
      {
        key: 'amount',
        header: 'Amount',
        card: 'meta',
        render: (t) => <span className="font-700 text-foreground">{formatMoney(Number(t.total_amount || 0), currencyCode)}</span>,
      },
    ];
    if (activeTab === 'adjustments') {
      cols.push({
        key: 'reason',
        header: 'Reason',
        cardSpan: 2,
        tableCellClassName: 'text-muted-foreground text-xs max-w-32 truncate',
        render: (t) => <span className="text-muted-foreground text-xs">{t.reason || '—'}</span>,
      });
    } else {
      cols.push({ key: 'supplier', header: 'Supplier', render: (t) => <span className="text-muted-foreground">{t.supplier || '—'}</span> });
    }
    cols.push({
      key: 'date',
      header: 'Date',
      render: (t) => <span className="text-muted-foreground text-xs">{new Date(t.created_at).toLocaleDateString()}</span>,
    });
    cols.push({
      key: 'actions',
      header: '',
      card: 'actions',
      render: (t) => (
        <div className="flex items-center gap-1">
          <button title="View" onClick={() => setViewTransaction(t)} className="p-1.5 rounded-lg hover:bg-muted"><Eye size={14} /></button>
          <button title="Edit" onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-muted"><Pencil size={14} /></button>
          <button title="Delete" onClick={() => void handleDelete(t)} className="p-1.5 rounded-lg hover:bg-danger/10 text-danger"><Trash2 size={14} /></button>
        </div>
      ),
    });
    return cols;
  }, [activeTab, products]);

  return (
    <AppLayout
      accountType="business"
      pageTitle={titleOverride ?? 'Adjustments In'}
      pageSubtitle={subtitleOverride ?? 'Record incoming stock that is not a purchase — returns and approved additions'}
    >
      <div className="space-y-5">
        {!hideTabs && (
          <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
            {(Object.keys(tabConfig) as ActiveTab[]).map((tab) => {
              const cfg = tabConfig[tab];
              const Icon = cfg.icon;
              return (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                  <Icon size={14} />
                  {cfg.label}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder={`Search ${typeConfig.label.toLowerCase()}...`} value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-2 text-sm bg-card border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30 w-52" />
          </div>
          <div className="flex gap-2">
            <button onClick={fetchTransactions} className="flex items-center gap-2 px-3 py-2 text-sm bg-card border border-border rounded-lg hover:bg-muted transition-colors">
              <RefreshCw size={14} />
            </button>
            <button onClick={openModal} className={`flex items-center gap-2 px-4 py-2 text-sm text-white rounded-lg hover:opacity-90 transition-colors font-medium ${typeConfig.bg}`}>
              <Plus size={14} />
              {activeTab === 'purchases' ? 'New Purchase' : 'Adjust'}
            </button>
          </div>
        </div>

        {error && <div className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-lg px-4 py-3">{error}</div>}

        <ResponsiveRecordList
          rows={filtered}
          getRowId={(t) => t.id}
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
          columns={transactionColumns}
        />
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-4xl mx-auto max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
              <h2 className="font-700 text-foreground">{editTransaction ? 'Edit Record' : activeTab === 'purchases' ? 'New Purchase' : 'Adjust'}</h2>
              <button onClick={() => { setShowModal(false); setError(null); }} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="block text-xs font-600 text-muted-foreground mb-1">Product *</label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Filter products added in Products"
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30"
                    />
                    <select required value={form.product_id} onChange={(e) => handleProductSelect(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30">
                      <option value="">Select product...</option>
                      {filteredProducts.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}{p.category ? ` (${p.category})` : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {activeTab === 'adjustments' ? (
                  <>
                    <div>
                      <label className="block text-xs font-600 text-muted-foreground mb-1">Quantity *</label>
                      <input required type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-600 text-muted-foreground mb-1">Amount</label>
                      <input type="number" min="0" step="0.01" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-600 text-muted-foreground mb-1">Reason * <span className="text-danger">Required</span></label>
                      <input required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
                        placeholder="Return, repair, supplier credit, approved intake, etc."
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-600 text-muted-foreground mb-1">Quantity *</label>
                      <input required type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-600 text-muted-foreground mb-1">Purchase Price</label>
                      <input required type="number" min="0" step="0.01" placeholder="Enter purchase price" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" />
                    </div>

                    <div>
                      <label className="block text-xs font-600 text-muted-foreground mb-1">Purchase Date</label>
                      <input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-600 text-muted-foreground mb-1">Supplier</label>
                      <input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-600 text-muted-foreground mb-1">Notes</label>
                      <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" />
                    </div>
                  </>
                )}
              </div>

              {error && <p className="text-xs text-danger">{error}</p>}
              <div className="flex gap-3 pt-2 sticky bottom-0 bg-card pb-1">
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

      {viewTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between"><h2 className="font-700">Record Details</h2><button onClick={() => setViewTransaction(null)}><X size={16} /></button></div>
            <dl className="grid grid-cols-2 gap-4 px-6 py-5 text-sm">{Object.entries(viewTransaction).filter(([key]) => key !== 'id').map(([key, value]) => <div key={key}><dt className="text-xs uppercase text-muted-foreground">{key.replaceAll('_', ' ')}</dt><dd className="mt-1 break-words">{String(value ?? '—')}</dd></div>)}</dl>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
