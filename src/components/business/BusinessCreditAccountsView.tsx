'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { fetchAllRows } from '@/lib/supabase/fetchAllRows';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountCurrency } from '@/hooks/useAccountCurrency';
import { formatMoney } from '@/lib/countries';
import { BadgeDollarSign, Banknote, CreditCard, HandCoins, RefreshCw, Search, Smartphone, X } from 'lucide-react';
import ResponsiveRecordList, { RecordColumn } from '@/components/ui/ResponsiveRecordList';
import { QRCodeSVG } from 'qrcode.react';

type CreditAccountType = 'debts' | 'credits';
type PaymentMethod = 'Cash' | 'Transfers' | 'Mobile';

const toCents = (amount: number) => Math.round(amount * 100);
const fromCents = (amount: number) => amount / 100;
const getRemainingBalance = (creditedAmount: number, paidAmount: number) =>
  fromCents(Math.max(0, toCents(creditedAmount) - toCents(paidAmount)));
const hasOutstandingBalance = (transaction: CreditTransaction) =>
  toCents(transaction.balance_due) > 0;

interface CreditTransaction {
  id: string;
  transaction_id: string;
  reference_number: string;
  payment_receipt_numbers?: string[];
  detail: string;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  item_count: number;
  supplier: string;
  product_name?: string;
  quantity?: number;
  customer_name: string;
  purchase_date?: string | null;
  created_at: string;
}

interface PaymentReceipt {
  type: CreditAccountType;
  accountName: string;
  partyName: string;
  accountReference: string;
  receiptReference: string;
  paymentMethod: PaymentMethod;
  paymentAmount: number;
  originalAmount: number;
  previouslyPaid: number;
  remainingBalance: number;
  overpayment: number;
  createdAt: string;
}

const paymentOptions: { method: PaymentMethod; icon: React.ElementType }[] = [
  { method: 'Cash', icon: Banknote },
  { method: 'Transfers', icon: CreditCard },
  { method: 'Mobile', icon: Smartphone },
];

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    const details = 'details' in error && typeof error.details === 'string' ? ` ${error.details}` : '';
    const hint = 'hint' in error && typeof error.hint === 'string' ? ` ${error.hint}` : '';
    return `${error.message}${details}${hint}`;
  }
  return fallback;
};

const viewConfig: Record<CreditAccountType, {
  title: string;
  subtitle: string;
  partyLabel: string;
  emptyMessage: string;
  summaryLabel: string;
  icon: React.ElementType;
  movementSubtype: 'purchase' | 'sale';
}> = {
  debts: {
    title: 'Debts',
    subtitle: 'Purchases recorded with Credit payment method',
    partyLabel: 'Supplier',
    emptyMessage: 'No purchases on credit recorded yet.',
    summaryLabel: 'Total purchases on credit',
    icon: HandCoins,
    movementSubtype: 'purchase',
  },
  credits: {
    title: 'Credits',
    subtitle: 'Sales recorded with Credit payment method',
    partyLabel: 'Customer',
    emptyMessage: 'No sales on credit recorded yet.',
    summaryLabel: 'Total sales on credit',
    icon: BadgeDollarSign,
    movementSubtype: 'sale',
  },
};

export default function BusinessCreditAccountsView({ type }: { type: CreditAccountType }) {
  const config = viewConfig[type];
  const Icon = config.icon;
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [accountName, setAccountName] = useState('Business Account');
  const [updatingCredit, setUpdatingCredit] = useState<CreditTransaction | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [paymentReceiptNumber, setPaymentReceiptNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const { user } = useAuth();
  const { currencyCode } = useAccountCurrency();
  const supabase = useMemo(() => createClient(), []);
  const checkoutDisabled = submitting;

  const loadAccountId = useCallback(async () => {
    if (!user?.id && !user?.email) {
      setAccountId(null);
      return null;
    }

    let nextAccountId: string | null = null;
    let nextAccountName = '';
    if (user?.id) {
      const { data } = await supabase.from('accounts').select('id, name').eq('user_id', user.id).maybeSingle();
      nextAccountId = data?.id ?? null;
      nextAccountName = data?.name ?? '';
    }
    if (!nextAccountId && user?.id) {
      const { data } = await supabase
        .from('accounts')
        .select('id, name')
        .eq('pos_user_id', user.id)
        .maybeSingle();
      nextAccountId = data?.id ?? null;
      nextAccountName = data?.name ?? '';
    }
    if (!nextAccountId && user?.email) {
      const { data } = await supabase.from('accounts').select('id, name').eq('email', user.email).maybeSingle();
      nextAccountId = data?.id ?? null;
      nextAccountName = data?.name ?? '';
    }

    setAccountId(nextAccountId);
    if (nextAccountName) setAccountName(nextAccountName);
    return nextAccountId;
  }, [supabase, user?.email, user?.id]);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const currentAccountId = accountId ?? await loadAccountId();
      if (!currentAccountId) {
        setTransactions([]);
        return;
      }

      let creditRows: CreditTransaction[];
      if (type === 'debts') {
        const query = supabase
          .from('business_purchases')
          .select('id, transaction_id, reference_number, product_name, quantity, supplier, total_amount, purchase_date, created_at')
          .eq('account_id', currentAccountId)
          .eq('payment_method', 'Credit')
          .order('created_at', { ascending: false });
        const purchases = await fetchAllRows((from, to) => query.range(from, to));
        creditRows = (purchases ?? []).map((purchase) => ({
          ...purchase,
          transaction_id: purchase.transaction_id || purchase.id,
          reference_number: purchase.reference_number || '',
          detail: `${purchase.product_name} x${purchase.quantity}`,
          item_count: purchase.quantity,
          customer_name: '',
          paid_amount: 0,
          balance_due: Number(purchase.total_amount || 0),
        }));
        if (creditRows.length) {
          const paymentQuery = supabase
            .from('business_credit_payments')
            .select('transaction_id, amount, reference_number')
            .eq('account_id', currentAccountId);
          const payments = await fetchAllRows((from, to) => paymentQuery.range(from, to));
          const paidByTransaction = new Map<string, number>();
          const receiptsByTransaction = new Map<string, string[]>();
          for (const payment of payments ?? []) {
            paidByTransaction.set(
              payment.transaction_id,
              (paidByTransaction.get(payment.transaction_id) || 0) + toCents(Number(payment.amount || 0)),
            );
            if (payment.reference_number) {
              const references = receiptsByTransaction.get(payment.transaction_id) || [];
              references.push(payment.reference_number);
              receiptsByTransaction.set(payment.transaction_id, references);
            }
          }
          creditRows = creditRows.map((transaction) => {
            const paidAmount = fromCents(paidByTransaction.get(transaction.transaction_id) || 0);
            return {
              ...transaction,
              payment_receipt_numbers: receiptsByTransaction.get(transaction.transaction_id) || [],
              paid_amount: paidAmount,
              balance_due: getRemainingBalance(Number(transaction.total_amount || 0), paidAmount),
            };
          }).filter(hasOutstandingBalance);
        }
      } else {
        const query = supabase
          .from('business_transactions')
          .select('id, reference_number, detail, total_amount, item_count, supplier, customer_name, created_at')
          .eq('account_id', currentAccountId)
          .eq('movement_subtype', config.movementSubtype)
          .eq('payment_method', 'Credit')
          .order('created_at', { ascending: false });
        const rows = await fetchAllRows((from, to) => query.range(from, to));
        creditRows = (rows ?? []).map((transaction) => ({
          ...transaction,
          transaction_id: transaction.id,
          paid_amount: 0,
          balance_due: Number(transaction.total_amount || 0),
        }));
        if (creditRows.length) {
          const paymentQuery = supabase
            .from('business_credit_payments')
            .select('transaction_id, amount')
            .eq('account_id', currentAccountId);
          const payments = await fetchAllRows((from, to) => paymentQuery.range(from, to));
          const paidByTransaction = new Map<string, number>();
          for (const payment of payments ?? []) {
            paidByTransaction.set(
              payment.transaction_id,
              (paidByTransaction.get(payment.transaction_id) || 0) + toCents(Number(payment.amount || 0)),
            );
          }
          creditRows = creditRows.map((transaction) => {
            const paidAmount = fromCents(paidByTransaction.get(transaction.transaction_id) || 0);
            return {
              ...transaction,
              paid_amount: paidAmount,
              balance_due: getRemainingBalance(Number(transaction.total_amount || 0), paidAmount),
            };
          }).filter(hasOutstandingBalance);
        }
      }
      setTransactions(creditRows);
    } catch (fetchError) {
      setError(`Unable to load ${config.title.toLowerCase()}: ${getErrorMessage(fetchError, 'An unexpected database error occurred.')}`);
    } finally {
      setLoading(false);
    }
  }, [accountId, config.movementSubtype, loadAccountId, supabase]);

  useEffect(() => { void fetchTransactions(); }, [fetchTransactions]);

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return transactions;
    return transactions.filter((transaction) => [
      transaction.reference_number,
      transaction.detail,
      type === 'debts' ? transaction.supplier : transaction.customer_name,
    ].some((value) => value?.toLowerCase().includes(normalizedSearch)));
  }, [search, transactions, type]);

  const totalAmount = useMemo(
    () => filtered.reduce((sum, transaction) => sum + Number(transaction.balance_due || 0), 0),
    [filtered],
  );

  const startCreditUpdate = (transaction: CreditTransaction) => {
    setError(null);
    setUpdatingCredit(transaction);
    setPaymentAmount('');
    setPaymentMethod('Cash');
    setPaymentReceiptNumber('');
  };

  const submitCreditPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!updatingCredit) return;

    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a payment amount greater than zero.');
      return;
    }
    if (type === 'debts' && !paymentReceiptNumber.trim()) {
      setError('Enter a receipt number.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const currentAccountId = accountId ?? await loadAccountId();
      if (!currentAccountId) throw new Error('Business account not found.');

      const receiptReference = type === 'debts'
        ? paymentReceiptNumber.trim()
        : `CR-${Date.now().toString().slice(-8)}-${crypto.randomUUID().slice(0, 8)}`;
      const paidAmount = fromCents(toCents(updatingCredit.paid_amount) + toCents(amount));
      const remainingBalance = getRemainingBalance(updatingCredit.total_amount, paidAmount);
      const overpayment = fromCents(Math.max(0, toCents(amount) - toCents(updatingCredit.balance_due)));
      const { error: paymentError } = await supabase.from('business_credit_payments').insert({
        account_id: currentAccountId,
        transaction_id: updatingCredit.transaction_id,
        amount,
        payment_method: paymentMethod,
        reference_number: receiptReference,
      });
      if (paymentError) throw paymentError;

      setTransactions((currentTransactions) => currentTransactions
        .map((transaction) => transaction.transaction_id === updatingCredit.transaction_id
          || transaction.id === updatingCredit.id
          ? {
              ...transaction,
              paid_amount: paidAmount,
              balance_due: remainingBalance,
              payment_receipt_numbers: type === 'debts'
                ? [...(transaction.payment_receipt_numbers || []), receiptReference]
                : transaction.payment_receipt_numbers,
            }
          : transaction)
        .filter(hasOutstandingBalance));

      setReceipt({
        type,
        accountName,
        partyName: type === 'debts'
          ? updatingCredit.supplier || 'Supplier'
          : updatingCredit.customer_name || 'Customer',
        accountReference: updatingCredit.reference_number || updatingCredit.id,
        receiptReference,
        paymentMethod,
        paymentAmount: amount,
        originalAmount: updatingCredit.total_amount,
        previouslyPaid: updatingCredit.paid_amount,
        remainingBalance,
        overpayment,
        createdAt: new Date().toLocaleString(),
      });
      setUpdatingCredit(null);
      setPaymentAmount('');
      setPaymentReceiptNumber('');
    } catch (paymentError) {
      setError(getErrorMessage(paymentError, 'Unable to save credit payment.'));
    } finally {
      setSubmitting(false);
    }
  };

  const columns = useMemo<RecordColumn<CreditTransaction>[]>(() => {
    const cols: RecordColumn<CreditTransaction>[] = [{
      key: 'reference',
      header: 'Reference',
      card: 'title',
      render: (transaction) => type === 'debts' ? (
        <div className="flex flex-col items-start gap-1">
          {transaction.reference_number && (
            <span className="font-600 text-danger">{transaction.reference_number}</span>
          )}
          {transaction.payment_receipt_numbers?.map((receiptNumber, index) => (
            <span key={`${receiptNumber}-${index}`} className="font-600 text-success">{receiptNumber}</span>
          ))}
          {!transaction.reference_number && !transaction.payment_receipt_numbers?.length && '—'}
        </div>
      ) : transaction.reference_number || '—',
    },
    {
      key: 'party',
      header: config.partyLabel,
      card: 'subtitle',
      render: (transaction) => (
        type === 'debts'
          ? transaction.supplier || 'Supplier not specified'
          : transaction.customer_name || 'Customer not specified'
      ),
    },
    {
      key: 'detail',
      header: 'Details',
      cardSpan: 2,
      render: (transaction) => transaction.detail || '—',
    },
    {
      key: 'amount',
      header: 'Amount',
      card: 'meta',
      render: (transaction) => (
        <span className="font-700 text-foreground">{formatMoney(transaction.balance_due, currencyCode)}</span>
      ),
    }];
    if (type === 'credits' || type === 'debts') {
      cols.push({
        key: 'paid',
        header: 'Paid',
        render: (transaction) => <span className="text-muted-foreground">{formatMoney(transaction.paid_amount, currencyCode)}</span>,
      });
    }
    cols.push(
    {
      key: 'date',
      header: 'Date',
      render: (transaction) => <span className="text-muted-foreground">{new Date(transaction.created_at).toLocaleDateString()}</span>,
    });
    if (type === 'credits' || type === 'debts') {
      cols.push({
        key: 'actions',
        header: '',
        card: 'actions',
        render: (transaction) => (
          <button
            type="button"
            onClick={() => startCreditUpdate(transaction)}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-600 text-primary-foreground hover:bg-primary/90"
          >
            Update
          </button>
        ),
      });
    }
    return cols;
  }, [config.partyLabel, currencyCode, type]);

  return (
    <AppLayout accountType="business" pageTitle={config.title} pageSubtitle={config.subtitle}>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Search ${config.title.toLowerCase()}...`}
              className="w-full sm:w-72 pl-8 pr-3 py-2 text-sm bg-card border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
          <button onClick={() => void fetchTransactions()} className="flex items-center gap-2 self-start px-3 py-2 text-sm bg-card border border-border rounded-lg hover:bg-muted transition-colors">
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        {error && !updatingCredit && <div role="alert" className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-lg px-4 py-3">{error}</div>}

        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon size={20} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{config.summaryLabel}</p>
            <p className="text-lg font-700 text-foreground">{formatMoney(totalAmount, currencyCode)}</p>
          </div>
        </div>

        <ResponsiveRecordList
          rows={filtered}
          getRowId={(transaction) => transaction.id}
          columns={columns}
          loading={loading}
          empty={
            <div className="px-4 py-16 text-center">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Icon size={32} className="opacity-30" />
                <p>{config.emptyMessage}</p>
              </div>
            </div>
          }
        />
      </div>

      {updatingCredit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="font-700 text-foreground">Update {type === 'debts' ? 'Debt' : 'Credit'} Payment</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {type === 'debts' ? updatingCredit.supplier || 'Supplier' : updatingCredit.customer_name || 'Customer'} · Balance {formatMoney(updatingCredit.balance_due, currencyCode)}
                </p>
              </div>
              <button type="button" onClick={() => { setUpdatingCredit(null); setError(null); }} className="rounded-lg p-1.5 hover:bg-muted" aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={submitCreditPayment} className="space-y-4 p-5">
              <div>
                <label className="mb-1 block text-xs font-600 text-muted-foreground">Amount</label>
                <input
                  required
                  type="text"
                  inputMode="decimal"
                  value={paymentAmount}
                  onChange={(event) => setPaymentAmount(event.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-600 text-muted-foreground">Payment Method</label>
                <div className="flex gap-2">
                  {paymentOptions.map(({ method, icon: PaymentIcon }) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-600 ${
                        paymentMethod === method
                          ? 'border-warning bg-warning text-warning-foreground'
                          : 'border-border bg-background text-muted-foreground hover:border-warning/50'
                      }`}
                    >
                      <PaymentIcon size={14} />
                      {method}
                    </button>
                  ))}
                </div>
              </div>
              {type === 'debts' && (
                <div>
                  <label className="mb-1 block text-xs font-600 text-muted-foreground">Receipt Number</label>
                  <input
                    required
                    type="text"
                    value={paymentReceiptNumber}
                    onChange={(event) => setPaymentReceiptNumber(event.target.value)}
                    placeholder="Enter receipt number"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>
              )}
              {error && <p role="alert" className="text-xs text-danger">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => { setUpdatingCredit(null); setError(null); }} className="flex-1 rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">Cancel</button>
                <button type="submit" disabled={checkoutDisabled} className="flex-1 rounded-lg bg-warning px-4 py-2 text-sm font-700 text-warning-foreground hover:bg-warning/90 disabled:cursor-not-allowed disabled:opacity-60">
                  {submitting ? 'Processing...' : type === 'debts' ? 'Update' : 'Checkout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {receipt && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
          <style>{`@media print {
            body * { visibility: hidden !important; }
            .credit-payment-receipt, .credit-payment-receipt * { visibility: visible !important; }
            .credit-payment-receipt { position: absolute !important; inset: 0 !important; width: 80mm !important; max-width: 80mm !important; margin: 0 auto !important; box-shadow: none !important; }
            .credit-payment-receipt-actions { display: none !important; }
          }`}</style>
          <div className="mx-auto max-w-sm rounded-xl bg-card p-4 shadow-xl">
            <div className="credit-payment-receipt rounded-lg border border-border bg-background p-5 text-sm">
              <h2 className="text-center text-lg font-700">{receipt.accountName}</h2>
              <p className="mt-1 text-center font-600">{receipt.type === 'debts' ? 'DEBT PAYMENT RECEIPT' : 'CREDIT PAYMENT RECEIPT'}</p>
              <div className="my-3 border-t border-dashed border-border" />
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Receipt No.: <span className="float-right text-foreground">{receipt.receiptReference}</span></p>
                <p>{receipt.type === 'debts' ? 'Purchase Ref.:' : 'Credit Ref.:'} <span className="float-right text-foreground">{receipt.accountReference}</span></p>
                <p>{receipt.type === 'debts' ? 'Supplier:' : 'Customer:'} <span className="float-right text-foreground">{receipt.partyName}</span></p>
                <p>Date: <span className="float-right text-foreground">{receipt.createdAt}</span></p>
                <p>Payment method: <span className="float-right text-foreground">{receipt.paymentMethod}</span></p>
              </div>
              <div className="my-3 border-t border-dashed border-border" />
              <table className="w-full text-sm">
                <tbody>
                  <tr><td className="py-1">Original {receipt.type === 'debts' ? 'debt' : 'credit'}</td><td className="py-1 text-right">{formatMoney(receipt.originalAmount, currencyCode)}</td></tr>
                  <tr><td className="py-1">Previously paid</td><td className="py-1 text-right">{formatMoney(receipt.previouslyPaid, currencyCode)}</td></tr>
                  <tr className="text-lg font-700"><td className="py-1">Paid today</td><td className="py-1 text-right">{formatMoney(receipt.paymentAmount, currencyCode)}</td></tr>
                  {receipt.remainingBalance > 0 && (
                    <tr><td className="py-1">Balance Due</td><td className="py-1 text-right">{formatMoney(receipt.remainingBalance, currencyCode)}</td></tr>
                  )}
                  {receipt.overpayment > 0 && (
                    <tr className="font-700"><td className="py-1">Overpayment</td><td className="py-1 text-right">{formatMoney(receipt.overpayment, currencyCode)}</td></tr>
                  )}
                </tbody>
              </table>
              <div className="my-3 border-t border-dashed border-border" />
              <p className="text-center font-700">THANK YOU</p>
              <div className="mt-4 flex justify-center">
                <QRCodeSVG
                  value={JSON.stringify({
                    type: receipt.type === 'debts' ? 'vex-debt-payment' : 'vex-credit-payment',
                    receipt: receipt.receiptReference,
                    reference: receipt.accountReference,
                    party: receipt.partyName,
                    date: receipt.createdAt,
                    currency: currencyCode,
                    amount: receipt.paymentAmount,
                    balance: receipt.remainingBalance,
                  })}
                  size={112}
                  level="M"
                  marginSize={2}
                  title={`QR code for ${receipt.type === 'debts' ? 'debt' : 'credit'} payment ${receipt.receiptReference}`}
                />
              </div>
            </div>
            <div className="credit-payment-receipt-actions mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setReceipt(null)} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">Close</button>
              <button type="button" onClick={() => window.print()} className="rounded-lg bg-warning px-4 py-2 text-sm font-700 text-warning-foreground hover:bg-warning/90">Print Receipt</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
