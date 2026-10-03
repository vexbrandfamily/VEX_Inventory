'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { fetchAllRows } from '@/lib/supabase/fetchAllRows';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountCurrency } from '@/hooks/useAccountCurrency';
import { formatMoney } from '@/lib/countries';
import { applyStockMovement, normalizeStatus } from '@/lib/stockMath';
import { Search, Plus, RefreshCw, ArrowUpFromLine, SlidersHorizontal, X, Eye, Pencil, Trash2 } from 'lucide-react';
import ResponsiveRecordList, { RecordColumn } from '@/components/ui/ResponsiveRecordList';

type StockOutSubtype = 'sale' | 'adjustment_out';
type ActiveTab = 'sales' | 'adjustments';

interface Transaction {
  id: string;
  product_id?: string;
  transaction_type: string;
  movement_subtype: string;
  reference_number: string;
  total_amount: number;
  discount_amount?: number;
  item_count: number;
  quantity: number;
  cashier_name: string;
  payment_method: string;
  detail: string;
  reason: string;
  created_at: string;
}

interface SaleLine {
  id: string;
  transaction_id: string | null;
  product_id: string;
  product_name: string;
  quantity: number;
  total_amount: number;
  discount_amount?: number;
}

interface Product {
  id: string;
  name: string;
  current_stock: number;
  min_level?: number;
  minimum_stock?: number;
}

interface TxForm {
  reference_number: string;
  product_id: string;
  product_name: string;
  quantity: string;
  unit_price: string;
  discount_amount: string;
  cashier_name: string;
  payment_method: string;
  notes: string;
  reason: string;
}

const defaultForm: TxForm = {
  reference_number: '', product_id: '', product_name: '', quantity: '1',
  unit_price: '0', discount_amount: '0', cashier_name: '', payment_method: 'Cash', notes: '', reason: '',
};

const displayPaymentMethod = (paymentMethod: string) => paymentMethod === 'Card' ? 'Transfers' : paymentMethod;

function toLocalDateInputValue(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const tabConfig: Record<ActiveTab, { subtype: StockOutSubtype; label: string; icon: React.ElementType; color: string; bg: string; description: string }> = {
  sales: { subtype: 'sale', label: 'Sales', icon: ArrowUpFromLine, color: 'text-danger', bg: 'bg-danger', description: 'Items/Stock sold to customers leaving the Business' },
  adjustments: { subtype: 'adjustment_out', label: 'Adjustments Out', icon: SlidersHorizontal, color: 'text-warning', bg: 'bg-warning', description: 'Stock/Items leaving the Business through non-sale reasons such as damage, returns to supplier, or approved removals' },
};

export default function BusinessStockOutView({
  defaultTab = 'sales',
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
  const [saleLines, setSaleLines] = useState<SaleLine[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [saleDate, setSaleDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
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

      if (activeTab === 'sales' && hideTabs) {
        query = query.ilike('reference_number', 'POS-%');
      }

      if (currentAccountId) {
        query = query.eq('account_id', currentAccountId);
      }

      const data = await fetchAllRows((from, to) => query.range(from, to));
      setTransactions(data ?? []);

      if (activeTab === 'sales' && data?.length) {
        const salesLines: SaleLine[] = [];
        const transactionIds = data.map((transaction) => transaction.id);
        for (let offset = 0; offset < transactionIds.length; offset += 500) {
          let salesQuery = supabase
            .from('business_sales')
            .select('id, transaction_id, product_id, product_name, quantity, total_amount, discount_amount')
            .in('transaction_id', transactionIds.slice(offset, offset + 500));
          if (currentAccountId) salesQuery = salesQuery.eq('account_id', currentAccountId);
          salesLines.push(...await fetchAllRows((from, to) => salesQuery.range(from, to)));
        }
        setSaleLines(salesLines);
      } else {
        setSaleLines([]);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [accountId, activeTab, hideTabs, loadAccountId, supabase]);

  const fetchProducts = useCallback(async () => {
    try {
      const currentAccountId = accountId ?? (await loadAccountId());
      let query = supabase.from('business_products').select('id, name, current_stock, min_level, minimum_stock').neq('status', 'inactive').order('name');

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

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const scopedTransactions = transactions.filter((transaction) => {
      const transactionDate = toLocalDateInputValue(transaction.created_at);
      const matchesDate = !saleDate || transactionDate === saleDate;
      const matchesPayment = activeTab !== 'sales' || !paymentMethod || displayPaymentMethod(transaction.payment_method) === paymentMethod;
      return matchesDate && matchesPayment;
    });
    const matchingTransactions = scopedTransactions.filter((transaction) => {
      const matchesSearch = !normalizedSearch || [
        transaction.reference_number,
        transaction.detail,
        displayPaymentMethod(transaction.payment_method),
        transaction.cashier_name,
      ].some((value) => value?.toLowerCase().includes(normalizedSearch));
      return matchesSearch;
    });

    if (activeTab !== 'sales' || !normalizedSearch) return matchingTransactions;

    const productMatches = saleLines.filter((line) => {
      const product = products.find((item) => item.id === line.product_id);
      return [line.product_name, product?.name]
        .some((value) => value?.toLowerCase().includes(normalizedSearch));
    }).filter((line) => scopedTransactions.some((transaction) => transaction.id === line.transaction_id));

    if (productMatches.length === 0) return matchingTransactions;

    const nonProductMatches = scopedTransactions.filter((transaction) => [
      transaction.reference_number,
      transaction.payment_method,
      transaction.cashier_name,
    ].some((value) => value?.toLowerCase().includes(normalizedSearch)));

    return [
      ...nonProductMatches,
      ...productMatches
        .map((line): Transaction | null => {
          const transaction = transactions.find((item) => item.id === line.transaction_id);
          if (!transaction) return null;
          return {
            ...transaction,
            id: `${transaction.id}-${line.id}`,
            product_id: line.product_id,
            detail: `${line.product_name} x${line.quantity}`,
            total_amount: Number(line.total_amount || 0),
            discount_amount: Number(line.discount_amount || 0),
            item_count: line.quantity,
            quantity: line.quantity,
          } as Transaction;
        })
        .filter((transaction): transaction is Transaction => transaction !== null),
    ];
  }, [activeTab, paymentMethod, products, saleDate, saleLines, search, transactions]);

  const filteredTotal = useMemo(
    () => filtered.reduce((sum, transaction) => sum + Number(transaction.total_amount || 0), 0),
    [filtered],
  );

  const generateRef = () => {
    const prefix = activeTab === 'sales' ? 'SAL' : 'ADJ-OUT';
    return `${prefix}-${Date.now().toString().slice(-6)}`;
  };

  const openModal = () => {
    setEditTransaction(null);
    setForm({ ...defaultForm, reference_number: generateRef() });
    setShowModal(true);
  };

  const openEdit = (transaction: Transaction) => {
    const product = products.find((item) => item.id === transaction.product_id);
    setEditTransaction(transaction);
    setForm({
      ...defaultForm,
      reference_number: transaction.reference_number || generateRef(),
      product_id: transaction.product_id || '',
      product_name: product?.name || transaction.detail?.split(' x')[0] || '',
      quantity: String(transaction.quantity || transaction.item_count || 1),
      unit_price: String((transaction.total_amount || 0) / Math.max(1, transaction.quantity || transaction.item_count || 1)),
      discount_amount: String(transaction.discount_amount || 0),
      cashier_name: transaction.cashier_name || '',
      payment_method: displayPaymentMethod(transaction.payment_method || 'Cash'),
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
        const currentStock = Math.max(0, Number(product.current_stock || 0) + quantity);
        await supabase.from('business_products').update({ current_stock: currentStock, status: normalizeStatus(currentStock, product.minimum_stock ?? product.min_level ?? 5) }).eq('id', transaction.product_id);
      }
    }
    const { error: err } = await supabase.from('business_transactions').delete().eq('id', transaction.id);
    if (err) setError(err.message);
    else { setTransactions((current) => current.filter((item) => item.id !== transaction.id)); void fetchProducts(); }
  };

  const handleProductSelect = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    setForm({ ...form, product_id: productId, product_name: product?.name || '' });
  };

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
      const price = parseFloat(form.unit_price) || 0;
      const discount = Math.max(0, parseFloat(form.discount_amount) || 0);
      const total = Math.max(qty * price - discount, 0);

      if (!form.product_id) {
        throw new Error('Select a product before saving the sale.');
      }

      const referenceNumber = form.reference_number || generateRef();

      const transactionPayload = {
        account_id: currentAccountId,
        product_id: form.product_id,
        transaction_type: activeTab === 'adjustments' ? 'adjustment' : 'sale',
        movement_subtype: tabConfig[activeTab].subtype,
        reference_number: referenceNumber,
        total_amount: total,
        ...(activeTab === 'sales' ? { discount_amount: discount } : {}),
        item_count: qty,
        quantity: qty,
        cashier_name: form.cashier_name,
        payment_method: form.payment_method,
        detail: form.product_name ? `${form.product_name} x${qty}` : form.notes,
        reason: form.reason,
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
          ? await supabase.from('business_adjustment_out').update(adjustmentPayload).eq('transaction_id', editTransaction.id)
          : await supabase.from('business_adjustment_out').insert(adjustmentPayload);
        if (adjustmentErr) throw adjustmentErr;
      } else {
        const salePayload = {
          account_id: currentAccountId,
          transaction_id: transactionId,
          product_id: form.product_id,
          product_name: form.product_name,
          quantity: qty,
          unit_price: price,
          total_amount: total,
          discount_amount: discount,
          reference_number: referenceNumber,
          payment_method: form.payment_method,
          cashier_name: form.cashier_name,
          notes: form.notes,
        };
        const { error: saleErr } = editTransaction
          ? await supabase.from('business_sales').update(salePayload).eq('transaction_id', editTransaction.id)
          : await supabase.from('business_sales').insert(salePayload);
        if (saleErr) throw saleErr;
      }

      if (form.product_id) {
        const product = products.find((p) => p.id === form.product_id);
        if (product) {
          const oldQuantity = editTransaction?.quantity || editTransaction?.item_count || 0;
          const newStock = editTransaction && editTransaction.product_id === form.product_id
            ? Math.max(0, Number(product.current_stock || 0) + oldQuantity - qty)
            : applyStockMovement(product.current_stock, qty, 'out');
          const status = normalizeStatus(newStock, product.minimum_stock ?? product.min_level ?? 5);
          await supabase.from('business_products').update({ current_stock: newStock, status, last_sale_date: new Date().toISOString().split('T')[0] }).eq('id', form.product_id);
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
        header: activeTab === 'adjustments' ? 'Quantity' : 'Qty (-)',
        render: (t) => <span className="font-700 text-danger">{activeTab === 'adjustments' ? '' : '-'}{t.item_count}</span>,
      },
      ...(activeTab === 'sales' ? [{
        key: 'discount',
        header: 'Discount',
        render: (t: Transaction) => <span className="text-muted-foreground">{formatMoney(Number(t.discount_amount || 0), currencyCode)}</span>,
      }] : []),
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
      cols.push({ key: 'payment', header: 'Payment', render: (t) => <span className="text-muted-foreground">{displayPaymentMethod(t.payment_method || '—')}</span> });
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
      pageTitle={titleOverride ?? 'Adjustments Out'}
      pageSubtitle={subtitleOverride ?? 'Record outgoing stock that is not a sale — damage, returns, and approved removals'}
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

        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="text" placeholder={`Search ${typeConfig.label.toLowerCase()} or product...`} value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-2 text-sm bg-card border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30 w-64" />
            </div>
            <div className="flex gap-2">
              <button onClick={fetchTransactions} className="flex items-center gap-2 px-3 py-2 text-sm bg-card border border-border rounded-lg hover:bg-muted transition-colors">
                <RefreshCw size={14} />
              </button>
              {(activeTab === 'sales' ? !hideTabs : true) && (
                <button onClick={openModal} className={`flex items-center gap-2 px-4 py-2 text-sm text-white rounded-lg hover:opacity-90 transition-colors font-medium ${typeConfig.bg}`}>
                  <Plus size={14} />
                  {activeTab === 'sales' ? 'New Sale' : 'Adjust'}
                </button>
              )}
            </div>
          </div>
          {activeTab === 'sales' && (
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs text-muted-foreground">
                Date
                <input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)}
                  className="block mt-1 px-3 py-2 text-sm bg-card border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" />
              </label>
              <label className="text-xs text-muted-foreground">
                Payment
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                  className="block mt-1 min-w-32 px-3 py-2 text-sm bg-card border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30">
                  <option value="">All methods</option>
                  <option>Cash</option>
                  <option>Transfers</option>
                  <option>Invoice</option>
                  <option>Mobile</option>
                </select>
              </label>
            </div>
          )}
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
          footer={activeTab === 'sales' ? `${filtered.length} ${typeConfig.label.toLowerCase()} shown - Filtered total: ${formatMoney(filteredTotal, currencyCode)}` : undefined}
        />
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-700 text-foreground">{editTransaction ? 'Edit Record' : activeTab === 'sales' ? 'New Sale' : 'Adjust'}</h2>
              <button onClick={() => { setShowModal(false); setError(null); }} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              {activeTab !== 'adjustments' && (
                <div>
                  <label className="block text-xs font-600 text-muted-foreground mb-1">Reference Number</label>
                  <input value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" />
                </div>
              )}
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1">Product *</label>
                <select required value={form.product_id} onChange={(e) => handleProductSelect(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30">
                  <option value="">Select product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} (Stock: {p.current_stock})</option>
                  ))}
                </select>
              </div>

              {activeTab === 'adjustments' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-600 text-muted-foreground mb-1">Quantity *</label>
                      <input required type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-600 text-muted-foreground mb-1">Amount</label>
                      <input type="number" min="0" step="0.01" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-600 text-muted-foreground mb-1">Reason * <span className="text-danger">Required</span></label>
                    <input required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
                      placeholder="Damage, return to supplier, approved removal, etc."
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-600 text-muted-foreground mb-1">Quantity *</label>
                      <input required type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-600 text-muted-foreground mb-1">Unit Price</label>
                      <input type="number" min="0" step="0.01" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-600 text-muted-foreground mb-1">Discount</label>
                    <input type="number" min="0" step="0.01" value={form.discount_amount} onChange={(e) => setForm({ ...form, discount_amount: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-600 text-muted-foreground mb-1">Served By</label>
                      <input value={form.cashier_name} onChange={(e) => setForm({ ...form, cashier_name: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-600 text-muted-foreground mb-1">Payment Method</label>
                      <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30">
                        <option>Cash</option><option>Transfers</option><option>Invoice</option><option>Mobile</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

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
