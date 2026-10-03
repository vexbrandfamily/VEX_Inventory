'use client';

import React, { useEffect, useState, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { fetchAllRows } from '@/lib/supabase/fetchAllRows';
import { RecordPagination, useRecordPagination } from '@/components/ui/RecordPagination';
import { Search, RefreshCw, Plus, Send, FileText, Receipt, MessageSquare, X, ChevronDown, Eye } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';
import InvoiceDocument from '@/components/InvoiceDocument';
import { getInvoiceMessagePreview, InvoiceData, parseInvoiceData } from '@/lib/invoices';
import ReceiptDocument from '@/components/ReceiptDocument';
import { getReceiptMessagePreview, parseReceiptData, ReceiptData } from '@/lib/receipts';


interface Account {
  id: string;
  name: string;
  email: string;
  account_type: string;
}

interface SmsMessage {
  id: string;
  message_type: 'invoice' | 'receipt' | 'short_message';
  subject: string;
  body: string;
  recipient_account_id: string;
  recipient_name: string;
  recipient_email: string;
  sent_by: string;
  created_at: string;
}

interface MessageForm {
  message_type: 'invoice' | 'receipt' | 'short_message';
  subject: string;
  body: string;
  recipient_account_id: string;
  recipient_name: string;
  recipient_email: string;
}

const typeConfig = {
  invoice: { label: 'Invoice', icon: FileText, color: 'text-primary', bg: 'bg-primary/10' },
  receipt: { label: 'Receipt', icon: Receipt, color: 'text-success', bg: 'bg-success/10' },
  short_message: { label: 'Short Message', icon: MessageSquare, color: 'text-accent', bg: 'bg-accent/10' },
};

export default function AdminSmsPage() {
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'invoice' | 'receipt' | 'short_message'>('all');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [accountSearch, setAccountSearch] = useState('');
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [editMessage, setEditMessage] = useState<SmsMessage | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<InvoiceData | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<ReceiptData | null>(null);
  const [form, setForm] = useState<MessageForm>({
    message_type: 'short_message', subject: '', body: '', recipient_account_id: '', recipient_name: '', recipient_email: '',
  });

  const supabase = createClient();

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('sms_messages').select('*').order('created_at', { ascending: false });
      if (filterType !== 'all') query = query.eq('message_type', filterType);
      setMessages(await fetchAllRows((from, to) => query.range(from, to)));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  const fetchAccounts = useCallback(async () => {
    const query = supabase.from('accounts').select('id, name, email, account_type').order('name');
    setAccounts(await fetchAllRows((from, to) => query.range(from, to)));
  }, []);

  useEffect(() => { fetchMessages(); fetchAccounts(); }, [fetchMessages, fetchAccounts]);

  const filtered = messages.filter((m) =>
    m.recipient_name.toLowerCase().includes(search.toLowerCase()) ||
    m.subject.toLowerCase().includes(search.toLowerCase()) ||
    m.body.toLowerCase().includes(search.toLowerCase())
  );
  const { currentPage, pageCount, pageRows, setPage } = useRecordPagination(filtered);

  const filteredAccounts = accounts.filter((a) =>
    a.name.toLowerCase().includes(accountSearch.toLowerCase()) ||
    a.email.toLowerCase().includes(accountSearch.toLowerCase())
  );

  const selectAccount = (acc: Account) => {
    setForm({ ...form, recipient_account_id: acc.id, recipient_name: acc.name, recipient_email: acc.email });
    setAccountSearch(acc.name);
    setShowAccountDropdown(false);
  };

  const openCompose = (msg?: SmsMessage) => {
    if (msg) {
      setEditMessage(msg);
      setForm({
        message_type: msg.message_type,
        subject: msg.subject,
        body: msg.message_type === 'invoice'
          ? getInvoiceMessagePreview(msg.body)
          : msg.message_type === 'receipt'
            ? getReceiptMessagePreview(msg.body)
            : msg.body,
        recipient_account_id: msg.recipient_account_id,
        recipient_name: msg.recipient_name,
        recipient_email: msg.recipient_email,
      });
      setAccountSearch(msg.recipient_name);
    } else {
      setEditMessage(null);
      setForm({ message_type: 'short_message', subject: '', body: '', recipient_account_id: '', recipient_name: '', recipient_email: '' });
      setAccountSearch('');
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.recipient_account_id) { setError('Please select a recipient'); return; }
    setSubmitting(true);
    setError(null);
    try {
      if (editMessage) {
        const { error: err } = await supabase.from('sms_messages').update({
          message_type: form.message_type,
          subject: form.subject,
          body: editMessage.message_type === 'invoice' || editMessage.message_type === 'receipt' ? editMessage.body : form.body,
          recipient_account_id: form.recipient_account_id,
          recipient_name: form.recipient_name,
          recipient_email: form.recipient_email,
        }).eq('id', editMessage.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('sms_messages').insert({
          message_type: form.message_type,
          subject: form.subject,
          body: form.body,
          recipient_account_id: form.recipient_account_id,
          recipient_name: form.recipient_name,
          recipient_email: form.recipient_email,
          sent_by: 'Admin',
        });
        if (err) throw err;
      }
      setShowModal(false);
      setAccountSearch('');
      fetchMessages();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this message?')) return;
    await supabase.from('sms_messages').delete().eq('id', id);
    fetchMessages();
  };

  return (
    <AppLayout accountType="admin" pageTitle="SMS" pageSubtitle="Send Invoices, Receipts and Short Messages to users">
      <div className="space-y-5">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          {(Object.entries(typeConfig) as [string, typeof typeConfig.invoice][]).map(([key, cfg]) => {
            const Icon = cfg.icon;
            const count = messages.filter((m) => m.message_type === key).length;
            return (
              <div key={key} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${cfg.bg}`}>
                  <Icon size={18} className={cfg.color} />
                </div>
                <div>
                  <p className="text-xl font-700 text-foreground">{count}</p>
                  <p className="text-xs text-muted-foreground">{cfg.label}s Sent</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search messages..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-2 text-sm bg-card border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30 w-52"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="text-sm bg-card border border-border rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary/30"
            >
              <option value="all">All Types</option>
              <option value="invoice">Invoice</option>
              <option value="receipt">Receipt</option>
              <option value="short_message">Short Message</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchMessages} className="flex items-center gap-2 px-3 py-2 text-sm bg-card border border-border rounded-lg hover:bg-muted transition-colors">
              <RefreshCw size={14} />
            </button>
            <button
              onClick={() => openCompose()}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              <Plus size={14} />
              Compose
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-lg px-4 py-3">{error}</div>
        )}

        {/* Messages List */}
        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-muted rounded-lg animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
                  <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                </div>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="bg-card border border-border rounded-xl flex flex-col items-center justify-center py-16 text-muted-foreground">
              <MessageSquare size={32} className="opacity-20 mb-2" />
              <p className="font-medium">No messages yet</p>
              <p className="text-sm mt-1">Compose your first message to a user.</p>
            </div>
          ) : (
            pageRows.map((msg) => {
              const cfg = typeConfig[msg.message_type];
              const Icon = cfg.icon;
              return (
                <div key={msg.id} className="bg-card border border-border rounded-xl p-4 hover:bg-muted/20 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                      <Icon size={18} className={cfg.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs font-600 px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                        <span className="text-xs text-muted-foreground">To: <span className="font-600 text-foreground">{msg.recipient_name}</span></span>
                        <span className="text-xs text-muted-foreground">{msg.recipient_email}</span>
                      </div>
                      {msg.subject && <p className="font-600 text-foreground text-sm mb-0.5">{msg.subject}</p>}
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {msg.message_type === 'receipt' ? getReceiptMessagePreview(msg.body) : getInvoiceMessagePreview(msg.body)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        Sent by {msg.sent_by} · {new Date(msg.created_at).toLocaleDateString()} {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {msg.message_type === 'invoice' && parseInvoiceData(msg.body) && (
                        <button
                          onClick={() => setViewingInvoice(parseInvoiceData(msg.body))}
                          className="inline-flex items-center gap-1 p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors text-xs"
                          title="View invoice"
                        >
                          <Eye size={13} />
                          <span className="sr-only">View invoice</span>
                        </button>
                      )}
                      {msg.message_type === 'receipt' && parseReceiptData(msg.body) && (
                        <button
                          onClick={() => setViewingReceipt(parseReceiptData(msg.body))}
                          className="inline-flex items-center gap-1 p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors text-xs"
                          title="View receipt"
                        >
                          <Eye size={13} />
                          <span className="sr-only">View receipt</span>
                        </button>
                      )}
                      <button
                        onClick={() => openCompose(msg)}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors text-xs"
                        title="Edit"
                      >
                        <FileText size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(msg.id)}
                        className="p-1.5 rounded-lg hover:bg-danger/10 text-muted-foreground hover:text-danger transition-colors"
                        title="Delete"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {!loading && <RecordPagination total={filtered.length} currentPage={currentPage} pageCount={pageCount} onPageChange={setPage} />}
      </div>

      {/* Compose Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
              <div>
                <h2 className="font-700 text-foreground">{editMessage ? 'Edit Message' : 'Compose Message'}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Select recipient and compose your message</p>
              </div>
              <button onClick={() => { setShowModal(false); setError(null); setAccountSearch(''); }} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              {/* Message Type */}
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-2">Message Type *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.entries(typeConfig) as [string, typeof typeConfig.invoice][]).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setForm({ ...form, message_type: key as any })}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-600 transition-all ${
                          form.message_type === key
                            ? `border-primary bg-primary/5 ${cfg.color}`
                            : 'border-border text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        <Icon size={16} />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Recipient Search */}
              <div className="relative">
                <label className="block text-xs font-600 text-muted-foreground mb-1">Recipient *</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search user by name or email..."
                    value={accountSearch}
                    onChange={(e) => { setAccountSearch(e.target.value); setShowAccountDropdown(true); if (!e.target.value) setForm({ ...form, recipient_account_id: '', recipient_name: '', recipient_email: '' }); }}
                    onFocus={() => setShowAccountDropdown(true)}
                    className="w-full pl-8 pr-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30"
                  />
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>
                {showAccountDropdown && filteredAccounts.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {filteredAccounts.map((acc) => (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => selectAccount(acc)}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted transition-colors text-left"
                      >
                        <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-700 flex-shrink-0 ${acc.account_type === 'store' ? 'bg-accent/10 text-accent' : 'bg-warning/10 text-warning'}`}>
                          {acc.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{acc.name}</p>
                          <p className="text-xs text-muted-foreground">{acc.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {form.recipient_account_id && (
                <div className="flex items-center gap-2 p-2.5 bg-success/5 border border-success/20 rounded-lg">
                  <Send size={13} className="text-success flex-shrink-0" />
                  <p className="text-xs text-success font-600">Sending to: {form.recipient_name} ({form.recipient_email})</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1">Subject</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="Message subject..."
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1">Message Body *</label>
                <textarea
                  required
                  rows={5}
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  placeholder="Write your message here..."
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30 resize-none"
                />
              </div>
              {error && <p className="text-xs text-danger">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setError(null); setAccountSearch(''); }}
                  className="flex-1 px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-60">
                  <Send size={14} />
                  {submitting ? 'Sending...' : editMessage ? 'Update' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {viewingInvoice && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-2 sm:p-6" role="dialog" aria-modal="true" aria-label="Invoice">
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-2 sm:p-6" role="dialog" aria-modal="true" aria-label="Receipt">
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
