'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { fetchAllRows } from '@/lib/supabase/fetchAllRows';
import { Search, RefreshCw, Plus, DollarSign, Calendar, X, ChevronDown, Send, Eye, Trash2 } from 'lucide-react';
import ResponsiveRecordList, { RecordColumn } from '@/components/ui/ResponsiveRecordList';
import ReceiptDocument from '@/components/ReceiptDocument';
import { ReceiptData, serializeReceiptData } from '@/lib/receipts';
import { formatMoney } from '@/lib/countries';
import { getUsdExchangeRate } from '@/lib/invoices';

interface Account {
  id: string;
  name: string;
  email: string;
  account_type: string;
  country: string;
  currency_code: string;
}

interface PaymentRecord {
  id: string;
  account_id: string | null;
  account_name: string;
  account_type: string;
  country: string;
  amount: number;
  payment_date: string;
  notes: string;
  created_at: string;
}

interface PaymentForm {
  account_id: string;
  account_name: string;
  account_type: string;
  country: string;
  amount: string;
  payment_date: string;
  notes: string;
}

export default function AdminSubscriptionsPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [accountSearch, setAccountSearch] = useState('');
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [receiptRecord, setReceiptRecord] = useState<PaymentRecord | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [receiptEmail, setReceiptEmail] = useState('');
  const [receiptSubject, setReceiptSubject] = useState('');
  const [receiptSending, setReceiptSending] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [receiptSuccess, setReceiptSuccess] = useState<string | null>(null);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const receiptRequestId = useRef(0);
  const [form, setForm] = useState<PaymentForm>({
    account_id: '', account_name: '', account_type: '', country: '', amount: '', payment_date: new Date().toISOString().split('T')[0], notes: '',
  });

  const supabase = createClient();

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = supabase
        .from('subscriptions')
        .select('*')
        .order('payment_date', { ascending: false });
      setPayments(await fetchAllRows((from, to) => query.range(from, to)));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAccounts = useCallback(async () => {
    const query = supabase
      .from('accounts')
      .select('id, name, email, account_type, country, currency_code')
      .order('name');
    setAccounts(await fetchAllRows((from, to) => query.range(from, to)));
  }, []);

  useEffect(() => { fetchPayments(); fetchAccounts(); }, [fetchPayments, fetchAccounts]);

  const filtered = payments.filter((p) =>
    p.account_name.toLowerCase().includes(search.toLowerCase()) ||
    p.account_type.toLowerCase().includes(search.toLowerCase())
  );

  const filteredAccounts = accounts.filter((a) =>
    a.name.toLowerCase().includes(accountSearch.toLowerCase()) ||
    a.email.toLowerCase().includes(accountSearch.toLowerCase())
  );

  const selectAccount = (acc: Account) => {
    setForm({ ...form, account_id: acc.id, account_name: acc.name, account_type: acc.account_type, country: acc.country });
    setAccountSearch(acc.name);
    setShowAccountDropdown(false);
  };

  const openReceiptComposer = async (payment: PaymentRecord) => {
    const recipient = accounts.find((account) => account.id === payment.account_id);
    if (!recipient) {
      setReceiptError('This account is no longer available, so a receipt cannot be sent.');
      return;
    }
    const requestId = ++receiptRequestId.current;
    setReceiptRecord(payment);
    setReceiptData(null);
    setReceiptEmail(recipient.email);
    setReceiptSubject('');
    setReceiptError(null);
    setReceiptLoading(true);
    setShowReceiptPreview(false);
    try {
      const currencyCode = recipient.currency_code || 'USD';
      const exchangeRate = await getUsdExchangeRate(currencyCode);
      if (requestId !== receiptRequestId.current) return;
      const receipt: ReceiptData = {
        version: 1,
        receiptNumber: `VEX-R-${payment.id.slice(0, 8).toUpperCase()}`,
        receiptDate: payment.payment_date,
        accountName: payment.account_name,
        accountEmail: recipient.email,
        accountType: payment.account_type,
        accountCountry: payment.country,
        amount: Math.round((Number(payment.amount || 0) * exchangeRate + Number.EPSILON) * 100) / 100,
        currencyCode,
        notes: payment.notes || '',
      };
      setReceiptData(receipt);
      setReceiptSubject(`Receipt for VEX Inventory Management System payment (#${receipt.receiptNumber})`);
    } catch (e: any) {
      if (requestId === receiptRequestId.current) setReceiptError(e.message || 'Could not convert the payment amount.');
    } finally {
      if (requestId === receiptRequestId.current) setReceiptLoading(false);
    }
  };

  const closeReceiptComposer = () => {
    receiptRequestId.current += 1;
    setReceiptRecord(null);
    setReceiptData(null);
    setReceiptEmail('');
    setReceiptLoading(false);
    setReceiptError(null);
    setShowReceiptPreview(false);
  };

  const sendReceipt = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!receiptRecord || !receiptData) return;
    setReceiptSending(true);
    setReceiptError(null);
    try {
      const recipient = accounts.find((account) => account.id === receiptRecord.account_id);
      if (!recipient) throw new Error('This account is no longer available.');
      const { error: insertError } = await supabase.from('sms_messages').insert({
        message_type: 'receipt',
        subject: receiptSubject,
        body: serializeReceiptData(receiptData),
        recipient_account_id: recipient.id,
        recipient_name: receiptData.accountName,
        recipient_email: receiptEmail,
        sent_by: 'Admin',
      });
      if (insertError) throw insertError;
      setReceiptSuccess(`Receipt ${receiptData.receiptNumber} sent to ${receiptEmail}.`);
      closeReceiptComposer();
    } catch (e: any) {
      setReceiptError(e.message || 'Could not send the receipt.');
    } finally {
      setReceiptSending(false);
    }
  };

  const handleDeletePayment = async (payment: PaymentRecord) => {
    if (!confirm(`Delete the payment record for ${payment.account_name}? This cannot be undone.`)) return;
    setError(null);
    const { error: deleteError } = await supabase.from('subscriptions').delete().eq('id', payment.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setPayments((current) => current.filter((record) => record.id !== payment.id));
    if (receiptRecord?.id === payment.id) closeReceiptComposer();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.account_id) { setError('Please select an account'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const { error: err } = await supabase.from('subscriptions').insert({
        account_id: form.account_id,
        account_name: form.account_name,
        account_type: form.account_type,
        country: form.country,
        amount: parseFloat(form.amount) || 0,
        payment_date: form.payment_date,
        notes: form.notes,
      });
      if (err) throw err;
      setShowModal(false);
      setForm({ account_id: '', account_name: '', account_type: '', country: '', amount: '', payment_date: new Date().toISOString().split('T')[0], notes: '' });
      setAccountSearch('');
      fetchPayments();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalAmount = filtered.reduce((sum, p) => sum + (p.amount || 0), 0);

  const paymentColumns = useMemo<RecordColumn<PaymentRecord>[]>(() => [
    {
      key: 'name',
      header: 'Account Name',
      card: 'title',
      render: (p) => <span className="font-medium text-foreground">{p.account_name}</span>,
    },
    {
      key: 'type',
      header: 'Account Type',
      card: 'subtitle',
      render: (p) => (
        <span className={`text-xs font-600 px-2 py-0.5 rounded-full ${p.account_type === 'store' ? 'bg-accent/10 text-accent' : 'bg-warning/10 text-warning'}`}>
          {p.account_type}
        </span>
      ),
    },
    { key: 'country', header: 'Country', render: (p) => <span className="text-muted-foreground">{p.country || '—'}</span> },
    {
      key: 'amount',
      header: 'Amount',
      card: 'meta',
      render: (p) => <span className="font-700 text-success">${(p.amount || 0).toFixed(2)}</span>,
    },
    {
      key: 'date',
      header: 'Date',
      render: (p) => (
        <span className="text-muted-foreground text-xs">
          <span className="inline-flex items-center gap-1">
            <Calendar size={12} />
            {p.payment_date ? new Date(p.payment_date).toLocaleDateString() : '—'}
          </span>
        </span>
      ),
    },
    {
      key: 'notes',
      header: 'Notes',
      cardSpan: 2,
      tableCellClassName: 'text-muted-foreground text-xs max-w-40 truncate',
      render: (p) => <span className="text-muted-foreground text-xs">{p.notes || '—'}</span>,
    },
    {
      key: 'actions',
      header: 'Action',
      card: 'actions',
      render: (payment) => (
        <div className="inline-flex items-center gap-2">
          <button
            type="button"
            onClick={() => openReceiptComposer(payment)}
            disabled={!accounts.some((account) => account.id === payment.account_id)}
            title="Send receipt"
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-600 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            <Send size={14} />
            Send Receipt
          </button>
          <button
            type="button"
            onClick={() => void handleDeletePayment(payment)}
            title="Delete payment"
            aria-label={`Delete payment for ${payment.account_name}`}
            className="inline-flex items-center justify-center p-2 text-danger border border-danger/20 rounded-lg hover:bg-danger/10 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ], [accounts]);

  return (
    <AppLayout accountType="admin" pageTitle="Subscriptions" pageSubtitle="Record and manage user subscription payments">
      <div className="space-y-5">
        {/* Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-xl font-700 text-foreground">${totalAmount.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Collected</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <Calendar size={18} className="text-success" />
            </div>
            <div>
              <p className="text-xl font-700 text-foreground">{filtered.length}</p>
              <p className="text-xs text-muted-foreground">Payment Records</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Search size={18} className="text-accent" />
            </div>
            <div>
              <p className="text-xl font-700 text-foreground">{accounts.length}</p>
              <p className="text-xs text-muted-foreground">Active Accounts</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search payments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-2 text-sm bg-card border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30 w-56"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={fetchPayments} className="flex items-center gap-2 px-3 py-2 text-sm bg-card border border-border rounded-lg hover:bg-muted transition-colors">
              <RefreshCw size={14} />
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              <Plus size={14} />
              Record Payment
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-lg px-4 py-3">{error}</div>
        )}
        {receiptError && <div role="alert" className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-lg px-4 py-3">{receiptError}</div>}
        {receiptSuccess && <div role="status" className="bg-success/10 border border-success/20 text-success text-sm rounded-lg px-4 py-3">{receiptSuccess}</div>}

        <ResponsiveRecordList
          rows={filtered}
          getRowId={(p) => p.id}
          loading={loading}
          skeletonRows={6}
          footer={
            filtered.length > 0 ? (
              <div className="flex items-center justify-between">
                <span>{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
                <span className="font-600 text-foreground">Total: ${totalAmount.toFixed(2)}</span>
              </div>
            ) : null
          }
          empty={<div className="px-4 py-12 text-center text-muted-foreground">No payment records found. Record the first payment.</div>}
          columns={paymentColumns}
        />
      </div>

      {/* Record Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="font-700 text-foreground">Record Payment</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Search and select a user, then enter payment details</p>
              </div>
              <button onClick={() => { setShowModal(false); setError(null); setAccountSearch(''); }} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              {/* Account Search */}
              <div className="relative">
                <label className="block text-xs font-600 text-muted-foreground mb-1">Search Account *</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Type name or email..."
                    value={accountSearch}
                    onChange={(e) => { setAccountSearch(e.target.value); setShowAccountDropdown(true); if (!e.target.value) setForm({ ...form, account_id: '', account_name: '', account_type: '', country: '' }); }}
                    onFocus={() => setShowAccountDropdown(true)}
                    className="w-full pl-8 pr-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30"
                  />
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>
                {showAccountDropdown && filteredAccounts.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredAccounts.map((acc) => (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => selectAccount(acc)}
                        className="w-full flex items-start gap-2 px-3 py-2.5 text-sm hover:bg-muted transition-colors text-left"
                      >
                        <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-700 flex-shrink-0 mt-0.5 ${acc.account_type === 'store' ? 'bg-accent/10 text-accent' : 'bg-warning/10 text-warning'}`}>
                          {acc.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{acc.name}</p>
                          <p className="text-xs text-muted-foreground">{acc.email} · {acc.account_type}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Auto-filled fields */}
              {form.account_id && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-lg border border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">Account Type</p>
                    <p className="text-sm font-600 text-foreground capitalize">{form.account_type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Country</p>
                    <p className="text-sm font-600 text-foreground">{form.country || '—'}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-600 text-muted-foreground mb-1">Amount ($) *</label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-600 text-muted-foreground mb-1">Payment Date *</label>
                  <input
                    required
                    type="date"
                    value={form.payment_date}
                    onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1">Notes</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Optional notes..."
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
              {error && <p className="text-xs text-danger">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setError(null); setAccountSearch(''); }}
                  className="flex-1 px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-60">
                  {submitting ? 'Saving...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {receiptRecord && (receiptLoading || receiptData) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-5">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
              <div>
                <h2 className="font-700 text-foreground">Send Receipt</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Receipt for {receiptRecord.account_name}</p>
              </div>
              <button type="button" onClick={closeReceiptComposer} className="p-1.5 rounded-lg hover:bg-muted" aria-label="Close receipt"><X size={16} /></button>
            </div>
            <form onSubmit={sendReceipt} className="p-5 space-y-4">
              {receiptLoading ? (
                <div className="py-12 text-center text-sm text-muted-foreground">Converting payment to account currency...</div>
              ) : receiptData ? (
                <>
              <label className="block">
                <span className="block mb-1 text-xs font-600 text-muted-foreground">To</span>
                <input value={receiptEmail} readOnly className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg text-foreground" />
              </label>
              <label className="block">
                <span className="block mb-1 text-xs font-600 text-muted-foreground">Subject</span>
                <input value={receiptSubject} onChange={(event) => setReceiptSubject(event.target.value)} required className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground outline-none focus:ring-1 focus:ring-primary/30" />
              </label>
              <div className="space-y-2 rounded-lg border border-border p-4">
                <button type="button" onClick={() => setShowReceiptPreview(true)} className="inline-flex items-center gap-2 text-sm font-600 text-primary hover:underline">
                  <Eye size={15} /> View Receipt
                </button>
                <div>
                  <p className="text-xs font-600 uppercase text-muted-foreground">Amount paid · {receiptData.currencyCode}</p>
                  <p className="text-[32pt] leading-tight font-700 text-foreground">{formatMoney(receiptData.amount, receiptData.currencyCode)}</p>
                </div>
                <p className="text-xs text-muted-foreground">{receiptData.receiptNumber} · {new Date(`${receiptData.receiptDate}T12:00:00`).toLocaleDateString()}</p>
              </div>
              <section aria-label="Receipt details" className="space-y-2 rounded-lg border border-border p-4">
                <p className="text-xs font-700 uppercase text-muted-foreground">Details</p>
                <p className="text-sm text-foreground">Account Type: <span className="capitalize">{receiptData.accountType}</span></p>
                <p className="text-sm text-foreground">Country: {receiptData.accountCountry || '—'}</p>
                <p className="text-sm text-foreground">Notes: {receiptData.notes || '—'}</p>
              </section>
              {receiptError && <p role="alert" className="text-sm text-danger">{receiptError}</p>}
                </>
              ) : null}
              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <button type="button" onClick={closeReceiptComposer} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted">Cancel</button>
                <button type="submit" disabled={receiptSending || receiptLoading || !receiptData} className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg disabled:opacity-50">
                  <Send size={14} /> {receiptSending ? 'Sending...' : 'Send Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showReceiptPreview && receiptData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-2 sm:p-6" role="dialog" aria-modal="true" aria-label="Receipt preview">
          <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-lg bg-card shadow-xl">
            <div className="sticky top-0 z-10 flex justify-end border-b border-border bg-card p-2">
              <button type="button" onClick={() => setShowReceiptPreview(false)} className="inline-flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg">
                <X size={15} /> Close receipt
              </button>
            </div>
            <ReceiptDocument receipt={receiptData} />
          </div>
        </div>
      )}
    </AppLayout>
  );
}
