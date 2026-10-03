'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, Bell, CheckCircle, FileText, MessageSquare, RefreshCw, X, Receipt as ReceiptIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { fetchAllRows } from '@/lib/supabase/fetchAllRows';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { RecordPagination, useRecordPagination } from '@/components/ui/RecordPagination';
import InvoiceDocument from '@/components/InvoiceDocument';
import { formatMoney } from '@/lib/countries';
import { InvoiceData, parseInvoiceData } from '@/lib/invoices';
import ReceiptDocument from '@/components/ReceiptDocument';
import { parseReceiptData, ReceiptData } from '@/lib/receipts';
import { getReadNotificationIds, saveReadNotificationIds } from '@/lib/notificationReadState';

type AccountType = 'business' | 'store';
type NotificationCategory = 'admin_message' | 'invoice' | 'receipt' | 'low_stock' | 'out_of_stock';

interface AccountNotification {
  id: string;
  category: NotificationCategory;
  subject: string;
  body: string;
  createdAt: string;
  invoice?: InvoiceData | null;
  receipt?: ReceiptData | null;
}

interface AccountNotificationsProps {
  accountType: AccountType;
}

const categoryConfig: Record<NotificationCategory, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  admin_message: { label: 'Messages from Admin', icon: MessageSquare, color: 'text-primary', bg: 'bg-primary/10' },
  invoice: { label: 'Invoice', icon: FileText, color: 'text-primary', bg: 'bg-primary/10' },
  receipt: { label: 'Receipt', icon: ReceiptIcon, color: 'text-success', bg: 'bg-success/10' },
  low_stock: { label: 'Low Stock Alert', icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10' },
  out_of_stock: { label: 'Out of Stock Alert', icon: Bell, color: 'text-danger', bg: 'bg-danger/10' },
};

export default function AccountNotifications({ accountType }: AccountNotificationsProps) {
  const [notifications, setNotifications] = useState<AccountNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | NotificationCategory>('all');
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [selectedNotification, setSelectedNotification] = useState<AccountNotification | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<InvoiceData | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<ReceiptData | null>(null);
  const { user } = useAuth();
  const supabase = createClient();

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!user?.email) {
        setNotifications([]);
        return;
      }

      const { data: account } = await supabase.from('accounts').select('id').eq('email', user.email).maybeSingle();
      if (!account) {
        setNotifications([]);
        return;
      }

      const messageQuery = supabase
        .from('sms_messages')
        .select('id, subject, body, created_at, message_type')
        .eq('recipient_account_id', account.id)
        .order('created_at', { ascending: false });
      const messages = await fetchAllRows((from, to) => messageQuery.range(from, to));

      const inventory = accountType === 'business'
        ? await fetchAllRows((from, to) => supabase.from('business_products').select('id, name, current_stock, minimum_stock, reorder_level').eq('account_id', account.id).range(from, to))
        : await fetchAllRows((from, to) => supabase.from('store_items').select('id, name, current_stock, min_level').range(from, to));

      const alerts: AccountNotification[] = [];
      (inventory ?? []).forEach((item: any) => {
        const currentStock = Number(item.current_stock ?? 0);
        const minimumStock = Number(item.minimum_stock ?? item.min_level ?? item.reorder_level ?? 0);
        const itemName = item.name || 'Item';
        const timestamp = new Date().toISOString();
        if (currentStock === 0) {
          alerts.push({ id: `${accountType}-out-of-stock-${item.id}`, category: 'out_of_stock', subject: `${itemName} is out of stock`, body: `${itemName} has reached zero stock.`, createdAt: timestamp });
        } else if (currentStock < minimumStock) {
          alerts.push({ id: `${accountType}-low-stock-${item.id}`, category: 'low_stock', subject: `${itemName} is low in stock`, body: `${itemName} has fallen below its minimum stock level of ${minimumStock}.`, createdAt: timestamp });
        }
      });

      const adminMessages: AccountNotification[] = (messages ?? []).map((message) => {
        const invoice = message.message_type === 'invoice' ? parseInvoiceData(message.body) : null;
        const receipt = message.message_type === 'receipt' ? parseReceiptData(message.body) : null;
        return {
          id: `message-${message.id}`,
          category: message.message_type === 'invoice' ? 'invoice' : message.message_type === 'receipt' ? 'receipt' : 'admin_message',
          subject: message.subject || (receipt ? 'Receipt from Admin' : 'Message from Admin'),
          body: message.body,
          createdAt: message.created_at,
          invoice,
          receipt,
        };
      });
      const fetchedNotifications = [...adminMessages, ...alerts];
      setNotifications(fetchedNotifications);
      setReadIds(getReadNotificationIds(accountType));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setReadIds(getReadNotificationIds(accountType));
    void fetchNotifications();
  }, [user, accountType]);

  const markRead = (id: string) => {
    setReadIds((previous) => {
      const next = new Set(previous);
      next.add(id);
      saveReadNotificationIds(accountType, next);
      return next;
    });
  };

  const markAllRead = () => {
    const next = new Set(notifications.map((notification) => notification.id));
    setReadIds(next);
    saveReadNotificationIds(accountType, next);
  };

  const returnToNotifications = () => {
    if (selectedNotification) markRead(selectedNotification.id);
    setSelectedNotification(null);
  };

  const visibleNotifications = notifications
    .filter((notification) => filter === 'all' || notification.category === filter)
    .sort((a, b) => {
      const unreadOrder = Number(readIds.has(a.id)) - Number(readIds.has(b.id));
      if (unreadOrder !== 0) return unreadOrder;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  const unreadCount = notifications.filter((notification) => !readIds.has(notification.id)).length;
  const { currentPage, pageCount, pageRows, setPage } = useRecordPagination(visibleNotifications);

  return (
    <AppLayout
      accountType={accountType}
      pageTitle={selectedNotification?.subject ?? 'Notifications'}
      pageSubtitle={selectedNotification ? categoryConfig[selectedNotification.category].label : 'Messages and stock alerts'}
      onBack={selectedNotification ? returnToNotifications : undefined}
    >
      {selectedNotification ? (
        <section className="max-w-3xl space-y-5">
          <button
            type="button"
            onClick={returnToNotifications}
            className="hidden md:inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted"
          >
            <ArrowLeft size={16} /> Back to notifications
          </button>
          <article className="rounded-xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-start gap-4">
              {(() => {
                const config = categoryConfig[selectedNotification.category];
                const CategoryIcon = config.icon;
                return (
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${config.bg}`}>
                    <CategoryIcon size={18} className={config.color} />
                  </div>
                );
              })()}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-700 text-foreground">{selectedNotification.subject}</h2>
                  <time className="text-xs text-muted-foreground">{new Date(selectedNotification.createdAt).toLocaleString()}</time>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{categoryConfig[selectedNotification.category].label}</p>
                {selectedNotification.invoice ? (
                  <div className="mt-5 space-y-2 border-t border-border pt-4">
                    <p className="text-sm text-muted-foreground">Invoice {selectedNotification.invoice.invoiceNumber} · {selectedNotification.invoice.currencyCode}</p>
                    <p className="text-2xl font-700 text-foreground">{formatMoney(selectedNotification.invoice.totalAmount, selectedNotification.invoice.currencyCode)}</p>
                    {selectedNotification.invoice.memo && <p className="text-sm text-muted-foreground">{selectedNotification.invoice.memo}</p>}
                    <button
                      type="button"
                      onClick={() => setViewingInvoice(selectedNotification.invoice ?? null)}
                      className="mt-2 inline-flex items-center gap-2 text-sm font-600 text-primary hover:underline"
                    >
                      <FileText size={14} /> View Invoice
                    </button>
                  </div>
                ) : selectedNotification.receipt ? (
                  <div className="mt-5 space-y-2 border-t border-border pt-4">
                    <p className="text-sm text-muted-foreground">Receipt {selectedNotification.receipt.receiptNumber} · {selectedNotification.receipt.currencyCode} · {selectedNotification.receipt.accountType} account</p>
                    <p className="text-2xl font-700 text-foreground">{formatMoney(selectedNotification.receipt.amount, selectedNotification.receipt.currencyCode)}</p>
                    {selectedNotification.receipt.notes && <p className="text-sm text-muted-foreground">{selectedNotification.receipt.notes}</p>}
                    <button
                      type="button"
                      onClick={() => setViewingReceipt(selectedNotification.receipt ?? null)}
                      className="mt-2 inline-flex items-center gap-2 text-sm font-600 text-success hover:underline"
                    >
                      <ReceiptIcon size={14} /> View Receipt
                    </button>
                  </div>
                ) : (
                  <p className="mt-5 whitespace-pre-wrap border-t border-border pt-4 text-sm text-foreground">{selectedNotification.body}</p>
                )}
              </div>
            </div>
          </article>
        </section>
      ) : (
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-700 text-foreground">Notifications</h2>
            {unreadCount > 0 && <span className="bg-danger text-danger-foreground text-xs font-700 px-2 py-0.5 rounded-full">{unreadCount} unread</span>}
          </div>
          <div className="flex gap-2">
            <select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} className="text-sm bg-card border border-border rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary/30">
              <option value="all">All Notifications</option>
              <option value="admin_message">Messages from Admin</option>
              <option value="invoice">Invoices</option>
              <option value="receipt">Receipts</option>
              <option value="low_stock">Low Stock Alerts</option>
              <option value="out_of_stock">Out of Stock Alerts</option>
            </select>
            {unreadCount > 0 && <button onClick={markAllRead} className="text-sm text-primary hover:underline font-medium">Mark all read</button>}
            <button onClick={fetchNotifications} className="flex items-center gap-2 px-3 py-2 text-sm bg-card border border-border rounded-lg hover:bg-muted transition-colors" aria-label="Refresh notifications"><RefreshCw size={14} /></button>
          </div>
        </div>

        {error && <div className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-lg px-4 py-3">{error}</div>}
        <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
          {loading ? Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-start gap-4 px-5 py-4"><div className="w-9 h-9 bg-muted rounded-lg animate-pulse" /><div className="flex-1 space-y-2"><div className="h-4 bg-muted rounded animate-pulse w-1/2" /><div className="h-3 bg-muted rounded animate-pulse w-3/4" /></div></div>
          )) : visibleNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground"><CheckCircle size={32} className="opacity-20 mb-2" /><p>No notifications yet</p></div>
          ) : pageRows.map((notification) => {
            const config = categoryConfig[notification.category];
            const CategoryIcon = config.icon;
            const isRead = readIds.has(notification.id);
            return (
              <div
                key={notification.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedNotification(notification)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedNotification(notification);
                  }
                }}
                className={`flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/30 ${!isRead ? 'bg-primary/5' : ''}`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${config.bg}`}><CategoryIcon size={16} className={config.color} /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm text-foreground ${isRead ? 'font-normal' : 'font-700'}`}>{notification.subject}</p>
                    <div className="flex flex-shrink-0 items-center gap-3">
                      <span className="text-xs text-muted-foreground">{new Date(notification.createdAt).toLocaleDateString()}</span>
                      {!isRead && <span aria-label="Unread" className="h-2 w-2 rounded-full bg-danger" />}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{config.label}</p>
                  {notification.invoice ? (
                    <div className="mt-3 border-t border-border/70 pt-3">
                      <p className="text-xs text-muted-foreground">Invoice {notification.invoice.invoiceNumber} · {notification.invoice.currencyCode}</p>
                      {notification.invoice.discountAmount && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          <p>Subtotal: {formatMoney(notification.invoice.subtotalAmount, notification.invoice.currencyCode)}</p>
                          <p>Discount: ({formatMoney(notification.invoice.discountAmount, notification.invoice.currencyCode)})</p>
                        </div>
                      )}
                      <p className="text-[32pt] leading-tight font-700 text-foreground">{formatMoney(notification.invoice.totalAmount, notification.invoice.currencyCode)}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{notification.invoice.memo}</p>
                    </div>
                  ) : notification.receipt ? (
                    <div className="mt-3 border-t border-border/70 pt-3">
                      <p className="text-xs text-muted-foreground">Receipt {notification.receipt.receiptNumber} · {notification.receipt.currencyCode} · {notification.receipt.accountType} account</p>
                      <p className="text-[32pt] leading-tight font-700 text-foreground">{formatMoney(notification.receipt.amount, notification.receipt.currencyCode)}</p>
                      {notification.receipt.notes && <p className="mt-2 text-xs text-muted-foreground">{notification.receipt.notes}</p>}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{notification.body}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {!loading && <RecordPagination total={visibleNotifications.length} currentPage={currentPage} pageCount={pageCount} onPageChange={setPage} />}
      </div>
      )}
      {viewingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-6" role="dialog" aria-modal="true" aria-label="Invoice">
          <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-lg bg-card shadow-xl">
            <div className="sticky top-0 z-10 flex justify-end border-b border-border bg-card p-2">
              <button type="button" onClick={() => setViewingInvoice(null)} className="inline-flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg">
                <X size={15} /> Close invoice
              </button>
            </div>
            <InvoiceDocument invoice={viewingInvoice} />
          </div>
        </div>
      )}
      {viewingReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-6" role="dialog" aria-modal="true" aria-label="Receipt">
          <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-lg bg-card shadow-xl">
            <div className="sticky top-0 z-10 flex justify-end border-b border-border bg-card p-2">
              <button type="button" onClick={() => setViewingReceipt(null)} className="inline-flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg">
                <X size={15} /> Close receipt
              </button>
            </div>
            <ReceiptDocument receipt={viewingReceipt} />
          </div>
        </div>
      )}
    </AppLayout>
  );
}