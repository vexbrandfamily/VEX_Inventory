'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { fetchAllRows } from '@/lib/supabase/fetchAllRows';
import { formatMoney } from '@/lib/countries';
import { Eye, Search, RefreshCw, Send, X } from 'lucide-react';
import InvoiceDocument from '@/components/InvoiceDocument';
import {
  applyInvoiceDiscount,
  createInvoiceData,
  formatInvoicePeriod,
  getUsagePeriod,
  getUsdExchangeRate,
  InvoiceData,
  serializeInvoiceData,
} from '@/lib/invoices';

interface Account {
  id: string;
  name: string;
  email: string;
  account_type: 'store' | 'business';
  contacts: string;
  country: string;
  currency_code: string;
}

const usageTables = {
  store: ['store_items', 'store_receipts', 'store_issues', 'store_adjustment_in', 'store_adjustment_out'],
  business: ['business_products', 'business_purchases', 'business_sales', 'business_transactions', 'business_adjustment_in', 'business_adjustment_out'],
} as const;

const currentMonth = () => new Date().toISOString().slice(0, 7);

export default function AdminUsagePage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [search, setSearch] = useState('');
  const [accountType, setAccountType] = useState<'all' | 'store' | 'business'>('all');
  const [recordCounts, setRecordCounts] = useState<Record<string, number | null>>({});
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [invoiceAccount, setInvoiceAccount] = useState<Account | null>(null);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [discountInput, setDiscountInput] = useState('');
  const [invoiceSubject, setInvoiceSubject] = useState('');
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceSending, setInvoiceSending] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [invoiceSuccess, setInvoiceSuccess] = useState<string | null>(null);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchUsage = async () => {
    setLoading(true);
    setError(null);
    try {
      const query = supabase.from('accounts').select('id, name, email, account_type, contacts, country, currency_code').in('account_type', ['store', 'business']).order('name');
      const accounts = await fetchAllRows((from, to) => query.range(from, to));
      setAccounts(accounts as Account[]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsage(); }, []);

  useEffect(() => {
    if (accounts.length === 0) {
      setRecordCounts({});
      setUsageLoading(false);
      return;
    }

    let cancelled = false;
    setRecordCounts({});
    setUsageLoading(true);
    setUsageError(null);

    const countUsage = async () => {
      try {
        const usagePeriod = getUsagePeriod(selectedMonth);
        const start = usagePeriod.start.toISOString();
        const end = usagePeriod.endExclusive.toISOString();
        for (let offset = 0; offset < accounts.length; offset += 5) {
          const batch = accounts.slice(offset, offset + 5);
          const counts = await Promise.all(batch.map(async (account) => {
            try {
              const results = await Promise.all(usageTables[account.account_type].map((table) =>
                supabase.from(table).select('id', { count: 'exact', head: true })
                  .eq('account_id', account.id)
                  .gte('created_at', start)
                  .lt('created_at', end)
              ));
              const failedResult = results.find((result) => result.error);
              if (failedResult?.error) throw failedResult.error;
              return [account.id, results.reduce((total, result) => total + (result.count ?? 0), 0)] as const;
            } catch (e: any) {
              if (!cancelled) setUsageError(e.message || `Could not load usage for ${account.name}.`);
              return [account.id, null] as const;
            }
          }));

          if (cancelled) return;
          setRecordCounts((current) => ({ ...current, ...Object.fromEntries(counts) }));
        }
      } catch (e: any) {
        if (!cancelled) setUsageError(e.message || 'Could not load account usage.');
      } finally {
        if (!cancelled) setUsageLoading(false);
      }
    };

    void countUsage();
    return () => { cancelled = true; };
  }, [accounts, selectedMonth]);

  const filteredAccounts = accounts.filter((account) =>
    (accountType === 'all' || account.account_type === accountType) &&
    `${account.name} ${account.email}`.toLowerCase().includes(search.toLowerCase())
  );
  const discountValue = discountInput.trim() === '' ? 0 : Number(discountInput);
  const invalidDiscount = Boolean(invoiceData && (
    !Number.isFinite(discountValue) ||
    discountValue < 0 ||
    discountValue > invoiceData.subtotalAmount
  ));
  const invoiceToSend = invoiceData && !invalidDiscount
    ? applyInvoiceDiscount(invoiceData, discountValue)
    : invoiceData;

  const openInvoiceComposer = async (account: Account) => {
    setInvoiceAccount(account);
    setInvoiceData(null);
    setDiscountInput('');
    setInvoiceError(null);
    setInvoiceLoading(true);
    setShowInvoicePreview(false);
    try {
      const recordCount = recordCounts[account.id];
      if (typeof recordCount !== 'number') throw new Error('The selected account usage count is not available yet.');

      const currencyCode = account.currency_code || 'USD';
      const exchangeRate = await getUsdExchangeRate(currencyCode);
      const invoiceNumber = `VEX-${String(crypto.getRandomValues(new Uint32Array(1))[0] % 100000).padStart(5, '0')}`;
      const invoice = createInvoiceData({
        invoiceNumber,
        invoiceDate: new Date(),
        period: selectedMonth,
        accountName: account.name,
        accountEmail: account.email,
        accountContacts: account.contacts,
        accountCountry: account.country,
        currencyCode,
        recordCount,
        exchangeRate,
      });
      setInvoiceData(invoice);
      setInvoiceSubject(`Invoice for VEX Inventory Management System invoice (#${invoiceNumber})`);
    } catch (e: any) {
      setInvoiceError(e.message || 'Could not prepare the invoice.');
    } finally {
      setInvoiceLoading(false);
    }
  };

  const closeInvoiceComposer = () => {
    setInvoiceAccount(null);
    setInvoiceData(null);
    setDiscountInput('');
    setInvoiceError(null);
    setShowInvoicePreview(false);
  };

  const sendInvoice = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!invoiceAccount || !invoiceToSend || invalidDiscount) return;
    setInvoiceSending(true);
    setInvoiceError(null);
    try {
      const { error: insertError } = await supabase.from('sms_messages').insert({
        message_type: 'invoice',
        subject: invoiceSubject,
        body: serializeInvoiceData(invoiceToSend),
        recipient_account_id: invoiceAccount.id,
        recipient_name: invoiceAccount.name,
        recipient_email: invoiceAccount.email,
        sent_by: 'Admin',
      });
      if (insertError) throw insertError;
      setInvoiceSuccess(`Invoice ${invoiceToSend.invoiceNumber} sent to ${invoiceAccount.email}.`);
      closeInvoiceComposer();
    } catch (e: any) {
      setInvoiceError(e.message || 'Could not send the invoice.');
    } finally {
      setInvoiceSending(false);
    }
  };

  return (
    <AppLayout accountType="admin" pageTitle="Usage" pageSubtitle="Platform usage analytics and statistics">
      <div className="space-y-6">
        <div className="flex justify-end">
          <button onClick={fetchUsage} className="flex items-center gap-2 px-3 py-2 text-sm bg-card border border-border rounded-lg hover:bg-muted transition-colors">
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-lg px-4 py-3">{error}</div>
        )}
        {invoiceSuccess && (
          <div role="status" className="bg-success/10 border border-success/20 text-success text-sm rounded-lg px-4 py-3">{invoiceSuccess}</div>
        )}

        <section className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-700 text-foreground">Account Database Usage</h3>
              <p className="text-xs text-muted-foreground mt-1">Total records created during the selected month’s 30-day billing period</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                Month
                <input
                  type="month"
                  value={selectedMonth}
                  max={currentMonth()}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                  className="bg-card border border-border rounded-lg px-3 py-2 text-foreground outline-none focus:ring-1 focus:ring-primary/30"
                />
              </label>
              <label className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 text-sm">
                <Search size={14} className="text-muted-foreground" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search accounts..."
                  aria-label="Search accounts"
                  className="w-36 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
                />
              </label>
              <select
                aria-label="Filter by account type"
                value={accountType}
                onChange={(event) => setAccountType(event.target.value as typeof accountType)}
                className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/30"
              >
                <option value="all">All account types</option>
                <option value="store">Store</option>
                <option value="business">Business</option>
              </select>
            </div>
          </div>
          {usageError && <p role="alert" className="mx-5 mt-4 bg-danger/10 border border-danger/20 text-danger text-sm rounded-lg px-4 py-3">{usageError}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <th className="px-5 py-3 font-600">Account</th>
                  <th className="px-5 py-3 font-600">Type</th>
                  <th className="px-5 py-3 text-right font-600">Quantity</th>
                  <th className="px-5 py-3 text-right font-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">Loading accounts...</td></tr>
                ) : filteredAccounts.length === 0 ? (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">No accounts found</td></tr>
                ) : filteredAccounts.map((account) => (
                  <tr key={account.id} className="border-b border-border/50 last:border-0">
                    <td className="px-5 py-3">
                      <p className="font-600 text-foreground">{account.name}</p>
                      <p className="text-xs text-muted-foreground">{account.email}</p>
                    </td>
                    <td className="px-5 py-3 capitalize text-foreground">{account.account_type}</td>
                    <td className="px-5 py-3 text-right tabular-nums font-600 text-foreground">
                      {typeof recordCounts[account.id] === 'number'
                        ? recordCounts[account.id]?.toLocaleString()
                        : usageLoading
                          ? 'Counting...'
                          : recordCounts[account.id] === null
                            ? 'Unavailable'
                            : '0'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => void openInvoiceComposer(account)}
                        disabled={usageLoading || typeof recordCounts[account.id] !== 'number'}
                        className="inline-flex items-center gap-2 px-3 py-2 text-xs font-600 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50"
                      >
                        <Send size={14} />
                        Send Invoice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-border text-xs text-muted-foreground">
            30-day period in {selectedMonth} · {filteredAccounts.length} of {accounts.length} accounts
          </div>
        </section>
      </div>
      {invoiceAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-5">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
              <div>
                <h2 className="font-700 text-foreground">Send Invoice</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Invoice for {invoiceAccount.name}</p>
              </div>
              <button type="button" onClick={closeInvoiceComposer} className="p-1.5 rounded-lg hover:bg-muted" aria-label="Close invoice">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={sendInvoice} className="p-5 space-y-4">
              <label className="block">
                <span className="block mb-1 text-xs font-600 text-muted-foreground">To</span>
                <input value={invoiceAccount.email} readOnly className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg text-foreground" />
              </label>
              <label className="block">
                <span className="block mb-1 text-xs font-600 text-muted-foreground">Subject</span>
                <input value={invoiceSubject} onChange={(event) => setInvoiceSubject(event.target.value)} required className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground outline-none focus:ring-1 focus:ring-primary/30" />
              </label>

              {invoiceLoading ? (
                <div className="py-12 text-center text-sm text-muted-foreground">Preparing invoice and currency conversion...</div>
              ) : invoiceToSend ? (
                <>
                  <label className="block">
                    <span className="block mb-1 text-xs font-600 text-muted-foreground">Discount ({invoiceToSend.currencyCode})</span>
                    <input
                      type="number"
                      min="0"
                      max={invoiceToSend.subtotalAmount}
                      step="0.01"
                      inputMode="decimal"
                      value={discountInput}
                      onChange={(event) => setDiscountInput(event.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground outline-none focus:ring-1 focus:ring-primary/30"
                    />
                    {invalidDiscount && <span role="alert" className="mt-1 block text-xs text-danger">Discount cannot exceed the subtotal.</span>}
                  </label>
                  <div className="space-y-2 rounded-lg border border-border p-4">
                    <button type="button" onClick={() => setShowInvoicePreview(true)} disabled={invalidDiscount} className="inline-flex items-center gap-2 text-sm font-600 text-primary hover:underline disabled:opacity-50">
                      <Eye size={15} /> View Invoice
                    </button>
                    <div>
                      <p className="text-xs font-600 uppercase text-muted-foreground">Amount due · {invoiceToSend.currencyCode}</p>
                      <p className="text-[32pt] leading-tight font-700 text-foreground">{formatMoney(invoiceToSend.totalAmount, invoiceToSend.currencyCode)}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{invoiceToSend.invoiceNumber} · {invoiceToSend.recordCount.toLocaleString()} records · {formatInvoicePeriod(invoiceToSend.periodStart, invoiceToSend.periodEnd)}</p>
                  </div>
                  <section aria-label="Invoice message body" className="space-y-2 rounded-lg border border-border p-4">
                    <p className="text-xs font-700 uppercase text-muted-foreground">Body</p>
                    <p className="text-sm text-foreground">Invoice Number: {invoiceToSend.invoiceNumber}</p>
                    {invoiceToSend.discountAmount && (
                      <>
                        <p className="text-sm text-foreground">Subtotal: {formatMoney(invoiceToSend.subtotalAmount, invoiceToSend.currencyCode)}</p>
                        <p className="text-sm text-foreground">Discount: ({formatMoney(invoiceToSend.discountAmount, invoiceToSend.currencyCode)})</p>
                      </>
                    )}
                    <p className="text-[32pt] leading-tight font-700 text-foreground">Amount Due: {formatMoney(invoiceToSend.totalAmount, invoiceToSend.currencyCode)}</p>
                    <p className="text-xs leading-5 text-muted-foreground">Memo: {invoiceToSend.memo}</p>
                  </section>
                </>
              ) : null}

              {invoiceError && <p role="alert" className="text-sm text-danger">{invoiceError}</p>}
              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <button type="button" onClick={closeInvoiceComposer} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted">Cancel</button>
                <button type="submit" disabled={invoiceSending || invoiceLoading || !invoiceToSend || invalidDiscount} className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg disabled:opacity-50">
                  <Send size={14} /> {invoiceSending ? 'Sending...' : 'Send Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showInvoicePreview && invoiceToSend && !invalidDiscount && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-2 sm:p-6" role="dialog" aria-modal="true" aria-label="Invoice preview">
          <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-lg bg-card shadow-xl">
            <div className="sticky top-0 z-10 flex justify-end border-b border-border bg-card p-2">
              <button type="button" onClick={() => setShowInvoicePreview(false)} className="inline-flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg">
                <X size={15} /> Close invoice
              </button>
            </div>
            <InvoiceDocument invoice={invoiceToSend} />
          </div>
        </div>
      )}
    </AppLayout>
  );
}
