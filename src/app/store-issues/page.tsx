'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { fetchAllRows } from '@/lib/supabase/fetchAllRows';
import { useAuth } from '@/contexts/AuthContext';
import { applyStockMovement, normalizeStatus } from '@/lib/stockMath';
import { ArrowUpFromLine, Plus, RefreshCw, Search, X, Eye, Pencil, Trash2 } from 'lucide-react';
import ResponsiveRecordList, { RecordColumn } from '@/components/ui/ResponsiveRecordList';

interface StoreItem {
  id: string;
  name: string;
  current_stock: number;
  min_level: number;
}

interface StoreIssue {
  id: string;
  item_id: string;
  item_name: string;
  issue_date: string;
  issued_to: string;
  identity_or_contacts: string;
  inventory_number: string;
  quantity: number;
  issue_type: 'permanent_transfer' | 'writes_off';
}

interface IssueForm {
  item_id: string;
  item_name: string;
  issue_date: string;
  issued_to: string;
  identity_or_contacts: string;
  inventory_number: string;
  quantity: string;
  issue_type: 'permanent_transfer' | 'writes_off';
}

const defaultForm: IssueForm = {
  item_id: '',
  item_name: '',
  issue_date: new Date().toISOString().split('T')[0],
  issued_to: '',
  identity_or_contacts: '',
  inventory_number: '',
  quantity: '1',
  issue_type: 'permanent_transfer',
};

export default function StoreIssuesPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [issues, setIssues] = useState<StoreIssue[]>([]);
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editIssue, setEditIssue] = useState<StoreIssue | null>(null);
  const [viewIssue, setViewIssue] = useState<StoreIssue | null>(null);
  const [form, setForm] = useState<IssueForm>(defaultForm);
  const [submitting, setSubmitting] = useState(false);

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

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const currentAccountId = await fetchAccount();
      const itemQuery = supabase.from('store_items').select('id, name, current_stock, min_level').order('name');
      const issueQuery = currentAccountId
        ? supabase.from('store_issues').select('*').eq('account_id', currentAccountId).order('issue_date', { ascending: false }).order('created_at', { ascending: false })
        : null;
      const [itemData, issueData] = await Promise.all([
        fetchAllRows((from, to) => itemQuery.range(from, to)),
        issueQuery ? fetchAllRows((from, to) => issueQuery.range(from, to)) : Promise.resolve([]),
      ]);
      setStoreItems(itemData);
      setIssues(issueData);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [fetchAccount, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = issues.filter((issue) =>
    [issue.item_name, issue.issued_to, issue.identity_or_contacts, issue.inventory_number]
      .some((value) => value.toLowerCase().includes(search.toLowerCase()))
  );

  const openModal = () => {
    setEditIssue(null);
    setForm({ ...defaultForm, issue_date: new Date().toISOString().split('T')[0] });
    setError(null);
    setShowModal(true);
  };

  const openEdit = (issue: StoreIssue) => {
    setEditIssue(issue);
    setForm({
      item_id: issue.item_id,
      item_name: issue.item_name,
      issue_date: issue.issue_date,
      issued_to: issue.issued_to,
      identity_or_contacts: issue.identity_or_contacts,
      inventory_number: issue.inventory_number,
      quantity: String(issue.quantity),
      issue_type: issue.issue_type,
    });
    setShowModal(true);
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const currentAccountId = accountId ?? await fetchAccount();
      const item = storeItems.find((candidate) => candidate.id === form.item_id);
      const quantity = parseInt(form.quantity, 10) || 0;
      if (!currentAccountId) throw new Error('Store account could not be found.');
      if (!item) throw new Error('Please select an item.');
      if (quantity < 1) throw new Error('Quantity must be at least 1.');
      const availableStock = editIssue?.item_id === item.id ? item.current_stock + editIssue.quantity : item.current_stock;
      if (quantity > availableStock) throw new Error('Quantity cannot exceed current stock.');

      const issuePayload = {
        account_id: currentAccountId,
        item_id: item.id,
        item_name: item.name,
        issue_date: form.issue_date,
        issued_to: form.issued_to.trim(),
        identity_or_contacts: form.identity_or_contacts.trim(),
        inventory_number: form.inventory_number.trim(),
        quantity,
        issue_type: form.issue_type,
      };
      const { error: issueError } = editIssue
        ? await supabase.from('store_issues').update(issuePayload).eq('id', editIssue.id)
        : await supabase.from('store_issues').insert(issuePayload);
      if (issueError) throw issueError;

      const oldItem = editIssue ? storeItems.find((candidate) => candidate.id === editIssue.item_id) : null;
      const affectedItems = oldItem && oldItem.id !== item.id ? [oldItem, item] : [item];
      for (const affectedItem of affectedItems) {
        const stockAfterRestore = affectedItem.id === oldItem?.id ? affectedItem.current_stock + editIssue!.quantity : affectedItem.current_stock;
        const newStock = applyStockMovement(stockAfterRestore, affectedItem.id === item.id ? quantity : 0, 'out');
        const { error: itemError } = await supabase.from('store_items').update({
          current_stock: newStock,
          status: normalizeStatus(newStock, affectedItem.min_level ?? 0),
          last_movement_date: form.issue_date,
        }).eq('id', affectedItem.id);
        if (itemError) throw itemError;
      }

      setShowModal(false);
      await fetchData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (issue: StoreIssue) => {
    if (!confirm('Delete this issue?')) return;
    setError(null);
    try {
      const item = storeItems.find((candidate) => candidate.id === issue.item_id);
      if (!item) throw new Error('The issue item could not be found.');
      const newStock = applyStockMovement(item.current_stock, issue.quantity, 'in');
      const { error: itemError } = await supabase.from('store_items').update({
        current_stock: newStock,
        status: normalizeStatus(newStock, item.min_level ?? 0),
      }).eq('id', item.id);
      if (itemError) throw itemError;
      const { error: issueError } = await supabase.from('store_issues').delete().eq('id', issue.id);
      if (issueError) throw issueError;
      await fetchData();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const issueColumns = useMemo<RecordColumn<StoreIssue>[]>(() => [
    { key: 'item', header: 'Item', card: 'title', render: (issue) => <span className="font-medium text-foreground">{issue.item_name}</span> },
    { key: 'date', header: 'Date', render: (issue) => <span className="text-muted-foreground">{new Date(`${issue.issue_date}T00:00:00`).toLocaleDateString()}</span> },
    { key: 'issued-to', header: 'To whom Issued', render: (issue) => <span className="text-muted-foreground">{issue.issued_to || '—'}</span> },
    { key: 'contacts', header: 'ID No. or Contacts', render: (issue) => <span className="text-muted-foreground">{issue.identity_or_contacts || '—'}</span> },
    { key: 'inventory', header: 'Inventory No', render: (issue) => <span className="font-mono text-xs text-primary">{issue.inventory_number || '—'}</span> },
    { key: 'quantity', header: 'Quantity', card: 'meta', render: (issue) => <span className="font-700 text-danger">-{issue.quantity}</span> },
    { key: 'type', header: 'Permanent Transfer or Writes Off', render: (issue) => <span className="text-muted-foreground">{issue.issue_type === 'permanent_transfer' ? 'Permanent Transfer' : 'Writes Off'}</span> },
    {
      key: 'actions',
      header: 'Actions',
      card: 'actions',
      render: (issue) => (
        <div className="flex items-center justify-end gap-1">
          <button title="View issue" onClick={() => setViewIssue(issue)} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><Eye size={14} className="text-muted-foreground" /></button>
          <button title="Edit issue" onClick={() => openEdit(issue)} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><Pencil size={14} className="text-muted-foreground" /></button>
          <button title="Delete issue" onClick={() => handleDelete(issue)} className="p-1.5 rounded-lg hover:bg-danger/10 transition-colors"><Trash2 size={14} className="text-danger" /></button>
        </div>
      ),
    },
  ], [fetchData, storeItems]);

  return (
    <AppLayout accountType="store" pageTitle="Issues" pageSubtitle="Record issued items independently from Adjustments Out">
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input type="text" placeholder="Search issues..." value={search} onChange={(event) => setSearch(event.target.value)} className="pl-8 pr-3 py-2 text-sm bg-card border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30 w-56" /></div>
          <div className="flex gap-2"><button onClick={fetchData} title="Refresh issues" className="flex items-center gap-2 px-3 py-2 text-sm bg-card border border-border rounded-lg hover:bg-muted transition-colors"><RefreshCw size={14} /></button><button onClick={openModal} className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-lg hover:opacity-90 transition-colors font-medium bg-danger"><Plus size={14} /> New Issue</button></div>
        </div>
        {error && <div className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-lg px-4 py-3">{error}</div>}
        <ResponsiveRecordList rows={filtered} getRowId={(issue) => issue.id} loading={loading} skeletonRows={5} footer={`${filtered.length} issue${filtered.length !== 1 ? 's' : ''}`} empty={<div className="px-4 py-16 text-center"><div className="flex flex-col items-center gap-2 text-muted-foreground"><ArrowUpFromLine size={32} className="opacity-30" /><p>No issues recorded yet.</p></div></div>} columns={issueColumns} />
      </div>

      {showModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4"><div className="px-6 py-4 border-b border-border flex items-center justify-between"><h2 className="font-700 text-foreground">{editIssue ? 'Edit Issue' : 'New Issue'}</h2><button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X size={16} className="text-muted-foreground" /></button></div><form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
        <div><label className="block text-xs font-600 text-muted-foreground mb-1">Item *</label><select required value={form.item_id} onChange={(event) => { const item = storeItems.find((candidate) => candidate.id === event.target.value); setForm({ ...form, item_id: event.target.value, item_name: item?.name || '' }); }} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30"><option value="">Select item...</option>{storeItems.map((item) => <option key={item.id} value={item.id}>{item.name} (Stock: {item.current_stock})</option>)}</select></div>
        <div><label className="block text-xs font-600 text-muted-foreground mb-1">Date *</label><input required type="date" value={form.issue_date} onChange={(event) => setForm({ ...form, issue_date: event.target.value })} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" /></div>
        <div><label className="block text-xs font-600 text-muted-foreground mb-1">To whom Issued *</label><input required value={form.issued_to} onChange={(event) => setForm({ ...form, issued_to: event.target.value })} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" /></div>
        <div><label className="block text-xs font-600 text-muted-foreground mb-1">ID No. or Contacts</label><input value={form.identity_or_contacts} onChange={(event) => setForm({ ...form, identity_or_contacts: event.target.value })} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" /></div>
        <div><label className="block text-xs font-600 text-muted-foreground mb-1">Inventory No</label><input value={form.inventory_number} onChange={(event) => setForm({ ...form, inventory_number: event.target.value })} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" /></div>
        <div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-600 text-muted-foreground mb-1">Quantity *</label><input required type="number" min="1" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30" /></div><div><label className="block text-xs font-600 text-muted-foreground mb-1">Disposition *</label><select required value={form.issue_type} onChange={(event) => setForm({ ...form, issue_type: event.target.value as IssueForm['issue_type'] })} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30"><option value="permanent_transfer">Permanent Transfer</option><option value="writes_off">Writes Off</option></select></div></div>
        {error && <p className="text-xs text-danger">{error}</p>}<div className="flex gap-3 pt-2"><button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors">Cancel</button><button type="submit" disabled={submitting} className="flex-1 px-4 py-2 text-sm text-white rounded-lg hover:opacity-90 transition-colors font-medium disabled:opacity-60 bg-danger">{submitting ? 'Saving...' : editIssue ? 'Update Issue' : 'Save Issue'}</button></div>
      </form></div></div>}

      {viewIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setViewIssue(null)}>
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border"><h2 className="font-700 text-foreground">Issue Details</h2><button title="Close" onClick={() => setViewIssue(null)} className="p-1.5 rounded-lg hover:bg-muted"><X size={16} /></button></div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 px-6 py-5"><div className="col-span-2"><dt className="text-xs text-muted-foreground">Item</dt><dd className="mt-1 font-medium text-foreground">{viewIssue.item_name}</dd></div><div><dt className="text-xs text-muted-foreground">Date</dt><dd className="mt-1 text-foreground">{new Date(`${viewIssue.issue_date}T00:00:00`).toLocaleDateString()}</dd></div><div><dt className="text-xs text-muted-foreground">Quantity</dt><dd className="mt-1 text-foreground">-{viewIssue.quantity}</dd></div><div><dt className="text-xs text-muted-foreground">To whom Issued</dt><dd className="mt-1 text-foreground">{viewIssue.issued_to || '—'}</dd></div><div><dt className="text-xs text-muted-foreground">ID or Contacts</dt><dd className="mt-1 text-foreground">{viewIssue.identity_or_contacts || '—'}</dd></div><div><dt className="text-xs text-muted-foreground">Inventory No</dt><dd className="mt-1 text-foreground">{viewIssue.inventory_number || '—'}</dd></div><div><dt className="text-xs text-muted-foreground">Disposition</dt><dd className="mt-1 text-foreground">{viewIssue.issue_type === 'permanent_transfer' ? 'Permanent Transfer' : 'Writes Off'}</dd></div></dl>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
