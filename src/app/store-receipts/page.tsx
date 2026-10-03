'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { fetchAllRows } from '@/lib/supabase/fetchAllRows';
import { useAuth } from '@/contexts/AuthContext';
import { formatMoney } from '@/lib/countries';
import { applyStockMovement, normalizeStatus } from '@/lib/stockMath';
import { Search, Plus, RefreshCw, ArrowDownToLine, X, ChevronDown, Eye, Pencil, Trash2 } from 'lucide-react';
import ResponsiveRecordList, { RecordColumn } from '@/components/ui/ResponsiveRecordList';

interface Receipt {
  id: string;
  item_id: string;
  item_name: string;
  receipt_date: string;
  received_from: string;
  receipt_voucher_no: string;
  quantity: number;
  rate: number;
  currency_code: string;
}

interface StoreItem {
  id: string;
  name: string;
  current_stock: number;
  min_level: number;
}

interface ReceiptForm {
  item_id: string;
  item_name: string;
  receipt_date: string;
  received_from: string;
  receipt_voucher_no: string;
  quantity: string;
  rate: string;
}

const defaultForm: ReceiptForm = {
  item_id: '',
  item_name: '',
  receipt_date: new Date().toISOString().split('T')[0],
  received_from: '',
  receipt_voucher_no: '',
  quantity: '1',
  rate: '0',
};

export default function StoreReceiptsPage() {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editReceipt, setEditReceipt] = useState<Receipt | null>(null);
  const [viewReceipt, setViewReceipt] = useState<Receipt | null>(null);
  const [itemSearch, setItemSearch] = useState('');
  const [showItemOptions, setShowItemOptions] = useState(false);
  const [form, setForm] = useState<ReceiptForm>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  const fetchAccount = useCallback(async () => {
    if (!user?.id) return null;
    const { data: userAccount, error: accountError } = await supabase
      .from('accounts')
      .select('id, currency_code')
      .eq('user_id', user.id)
      .eq('account_type', 'store')
      .maybeSingle();
    if (accountError) throw accountError;
    if (userAccount) {
      setCurrencyCode(userAccount.currency_code || 'USD');
      return userAccount.id;
    }

    if (!user.email) return null;
    const { data: emailAccount, error: emailAccountError } = await supabase
      .from('accounts')
      .select('id, currency_code')
      .eq('email', user.email)
      .eq('account_type', 'store')
      .maybeSingle();
    if (emailAccountError) throw emailAccountError;
    setCurrencyCode(emailAccount?.currency_code || 'USD');
    return emailAccount?.id ?? null;
  }, [supabase, user?.email, user?.id]);

  const fetchStoreItems = useCallback(async () => {
    const query = supabase
      .from('store_items')
      .select('id, name, current_stock, min_level')
      .order('name');
    setStoreItems(await fetchAllRows((from, to) => query.range(from, to)));
  }, [supabase]);

  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [accountId] = await Promise.all([fetchAccount(), fetchStoreItems()]);
      if (!accountId) {
        setReceipts([]);
        return;
      }
      const receiptQuery = supabase
        .from('store_receipts')
        .select('*')
        .eq('account_id', accountId)
        .order('receipt_date', { ascending: false })
        .order('created_at', { ascending: false });
      setReceipts(await fetchAllRows((from, to) => receiptQuery.range(from, to)));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [fetchAccount, fetchStoreItems, supabase]);

  useEffect(() => { fetchReceipts(); }, [fetchReceipts]);

  const filtered = receipts.filter((receipt) =>
    receipt.item_name.toLowerCase().includes(search.toLowerCase()) ||
    receipt.received_from.toLowerCase().includes(search.toLowerCase()) ||
    receipt.receipt_voucher_no.toLowerCase().includes(search.toLowerCase())
  );

  const openModal = () => {
    setEditReceipt(null);
    setForm({ ...defaultForm, receipt_date: new Date().toISOString().split('T')[0] });
    setItemSearch('');
    setShowItemOptions(false);
    setShowModal(true);
    setError(null);
  };

  const openEdit = (receipt: Receipt) => {
    setEditReceipt(receipt);
    setForm({
      item_id: receipt.item_id,
      item_name: receipt.item_name,
      receipt_date: receipt.receipt_date,
      received_from: receipt.received_from,
      receipt_voucher_no: receipt.receipt_voucher_no,
      quantity: String(receipt.quantity),
      rate: String(receipt.rate),
    });
    setItemSearch(receipt.item_name);
    setShowItemOptions(false);
    setShowModal(true);
    setError(null);
  };

  const handleItemSelect = (itemId: string) => {
    const item = storeItems.find((candidate) => candidate.id === itemId);
    setForm((current) => ({ ...current, item_id: itemId, item_name: item?.name || '' }));
    setItemSearch(item?.name || '');
    setShowItemOptions(false);
  };

  const filteredStoreItems = storeItems.filter((item) =>
    item.name.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const accountId = await fetchAccount();
      const item = storeItems.find((candidate) => candidate.id === form.item_id);
      const quantity = parseInt(form.quantity, 10) || 0;
      const rate = parseFloat(form.rate) || 0;
      if (!accountId) throw new Error('Store account could not be found.');
      if (!item) throw new Error('Please select an item.');
      if (quantity < 1) throw new Error('Quantity must be at least 1.');
      if (rate < 0) throw new Error('Rate cannot be negative.');

      const receiptPayload = {
        account_id: accountId,
        item_id: item.id,
        item_name: item.name,
        receipt_date: form.receipt_date,
        received_from: form.received_from.trim(),
        receipt_voucher_no: form.receipt_voucher_no.trim(),
        quantity,
        rate,
        currency_code: currencyCode,
      };
      const { error: receiptError } = editReceipt
        ? await supabase.from('store_receipts').update(receiptPayload).eq('id', editReceipt.id)
        : await supabase.from('store_receipts').insert(receiptPayload);
      if (receiptError) throw receiptError;

      const oldItem = editReceipt ? storeItems.find((candidate) => candidate.id === editReceipt.item_id) : null;
      const oldQuantity = editReceipt?.quantity ?? 0;
      const affectedItems = oldItem && oldItem.id !== item.id ? [oldItem, item] : [item];
      for (const affectedItem of affectedItems) {
        const stockAfterRemoval = affectedItem.id === oldItem?.id ? affectedItem.current_stock - oldQuantity : affectedItem.current_stock;
        const newStock = stockAfterRemoval + (affectedItem.id === item.id ? quantity : 0);
        const { error: itemError } = await supabase.from('store_items').update({
          current_stock: newStock,
          status: normalizeStatus(newStock, affectedItem.min_level ?? 0),
          last_movement_date: form.receipt_date,
        }).eq('id', affectedItem.id);
        if (itemError) throw itemError;
      }

      setShowModal(false);
      await fetchReceipts();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (receipt: Receipt) => {
    if (!confirm('Delete this receipt?')) return;
    setError(null);
    try {
      const item = storeItems.find((candidate) => candidate.id === receipt.item_id);
      if (!item) throw new Error('The receipt item could not be found.');
      const newStock = item.current_stock - receipt.quantity;
      const { error: itemError } = await supabase.from('store_items').update({
        current_stock: newStock,
        status: normalizeStatus(newStock, item.min_level ?? 0),
      }).eq('id', item.id);
      if (itemError) throw itemError;
      const { error: receiptError } = await supabase.from('store_receipts').delete().eq('id', receipt.id);
      if (receiptError) throw receiptError;
      await fetchReceipts();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const receiptColumns = useMemo<RecordColumn<Receipt>[]>(() => [
    { key: 'item', header: 'Item', card: 'title', render: (receipt) => <span className="font-medium text-foreground">{receipt.item_name}</span> },
    { key: 'date', header: 'Date', render: (receipt) => <span className="text-muted-foreground">{new Date(`${receipt.receipt_date}T00:00:00`).toLocaleDateString()}</span> },
    { key: 'received-from', header: 'From whom received', render: (receipt) => <span className="text-muted-foreground">{receipt.received_from || '—'}</span> },
    { key: 'voucher', header: 'Receipt Voucher No.', card: 'subtitle', render: (receipt) => <span className="font-mono text-xs text-primary">{receipt.receipt_voucher_no || '—'}</span> },
    { key: 'quantity', header: 'Quantity', card: 'meta', render: (receipt) => <span className="font-700 text-success">+{receipt.quantity}</span> },
    { key: 'rate', header: 'Rate', render: (receipt) => <span className="text-muted-foreground">{formatMoney(Number(receipt.quantity) * Number(receipt.rate), receipt.currency_code || currencyCode)}</span> },
    {
      key: 'actions',
      header: 'Actions',
      card: 'actions',
      render: (receipt) => (
        <div className="flex items-center justify-end gap-1">
          <button title="View receipt" onClick={() => setViewReceipt(receipt)} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><Eye size={14} className="text-muted-foreground" /></button>
          <button title="Edit receipt" onClick={() => openEdit(receipt)} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><Pencil size={14} className="text-muted-foreground" /></button>
          <button title="Delete receipt" onClick={() => handleDelete(receipt)} className="p-1.5 rounded-lg hover:bg-danger/10 transition-colors"><Trash2 size={14} className="text-danger" /></button>
        </div>
      ),
    },
  ], [currencyCode, fetchReceipts, storeItems]);

  return (
    <AppLayout accountType="store" pageTitle="Receipts" pageSubtitle="Record received stock independently from stock adjustments">
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Search receipts..." value={search} onChange={(event) => setSearch(event.target.value)} className="pl-8 pr-3 py-2 text-sm bg-card border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30 w-52" />
          </div>
          <div className="flex gap-2">
            <button onClick={fetchReceipts} title="Refresh receipts" className="flex items-center gap-2 px-3 py-2 text-sm bg-card border border-border rounded-lg hover:bg-muted transition-colors"><RefreshCw size={14} /></button>
            <button onClick={openModal} className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-lg hover:opacity-90 transition-colors font-medium bg-success"><Plus size={14} /> New Receipt</button>
          </div>
        </div>
        {error && <div className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-lg px-4 py-3">{error}</div>}
        <ResponsiveRecordList rows={filtered} getRowId={(receipt) => receipt.id} loading={loading} skeletonRows={5} footer={`${filtered.length} receipt${filtered.length !== 1 ? 's' : ''}`} empty={<div className="px-4 py-16 text-center"><div className="flex flex-col items-center gap-2 text-muted-foreground"><ArrowDownToLine size={32} className="opacity-30" /><p>No receipts recorded yet.</p></div></div>} columns={receiptColumns} />
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between"><h2 className="font-700 text-foreground">{editReceipt ? 'Edit Receipt' : 'New Receipt'}</h2><button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X size={16} className="text-muted-foreground" /></button></div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              <div className="relative">
                <label className="block text-xs font-600 text-muted-foreground mb-1">Item *</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={itemSearch}
                    onFocus={() => setShowItemOptions(true)}
                    onChange={(event) => {
                      setItemSearch(event.target.value);
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
              <div><label className="block text-xs font-600 text-muted-foreground mb-1">Date *</label><input required type="date" value={form.receipt_date} onChange={(event) => setForm({ ...form, receipt_date: event.target.value })} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" /></div>
              <div><label className="block text-xs font-600 text-muted-foreground mb-1">From whom received</label><input value={form.received_from} onChange={(event) => setForm({ ...form, received_from: event.target.value })} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" /></div>
              <div><label className="block text-xs font-600 text-muted-foreground mb-1">Receipt Voucher No.</label><input value={form.receipt_voucher_no} onChange={(event) => setForm({ ...form, receipt_voucher_no: event.target.value })} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" /></div>
              <div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-600 text-muted-foreground mb-1">Quantity *</label><input required type="number" min="1" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" /></div><div><label className="block text-xs font-600 text-muted-foreground mb-1">Rate per item ({currencyCode}) *</label><input required type="number" min="0" step="0.01" value={form.rate} onChange={(event) => setForm({ ...form, rate: event.target.value })} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" /></div></div>
              {error && <p className="text-xs text-danger">{error}</p>}
              <div className="flex gap-3 pt-2"><button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors">Cancel</button><button type="submit" disabled={submitting} className="flex-1 px-4 py-2 text-sm text-white rounded-lg hover:opacity-90 transition-colors font-medium disabled:opacity-60 bg-success">{submitting ? 'Saving...' : editReceipt ? 'Update Receipt' : 'Save Receipt'}</button></div>
            </form>
          </div>
        </div>
      )}

      {viewReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setViewReceipt(null)}>
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border"><h2 className="font-700 text-foreground">Receipt Details</h2><button title="Close" onClick={() => setViewReceipt(null)} className="p-1.5 rounded-lg hover:bg-muted"><X size={16} /></button></div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 px-6 py-5">
              <div className="col-span-2"><dt className="text-xs text-muted-foreground">Item</dt><dd className="mt-1 font-medium text-foreground">{viewReceipt.item_name}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Date</dt><dd className="mt-1 text-foreground">{new Date(`${viewReceipt.receipt_date}T00:00:00`).toLocaleDateString()}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Quantity</dt><dd className="mt-1 text-foreground">{viewReceipt.quantity}</dd></div>
              <div><dt className="text-xs text-muted-foreground">From whom received</dt><dd className="mt-1 text-foreground">{viewReceipt.received_from || '—'}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Voucher No.</dt><dd className="mt-1 text-foreground">{viewReceipt.receipt_voucher_no || '—'}</dd></div>
              <div className="col-span-2"><dt className="text-xs text-muted-foreground">Total Rate</dt><dd className="mt-1 text-foreground">{formatMoney(Number(viewReceipt.quantity) * Number(viewReceipt.rate), viewReceipt.currency_code || currencyCode)}</dd></div>
            </dl>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
