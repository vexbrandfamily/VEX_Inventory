'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { fetchAllRows } from '@/lib/supabase/fetchAllRows';
import { Search, RefreshCw, FileText } from 'lucide-react';
import ResponsiveRecordList, { RecordColumn } from '@/components/ui/ResponsiveRecordList';

interface Invoice {
  id: string;
  name: string;
  email: string;
  account_type: string;
  country: string;
  currency_code: string;
}

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const supabase = createClient();

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('accounts')
        .select('id, name, email, account_type, country, currency_code')
        .order('name', { ascending: true });
      setInvoices(await fetchAllRows((from, to) => query.range(from, to)));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const filtered = invoices.filter((inv) =>
    inv.name.toLowerCase().includes(search.toLowerCase()) ||
    inv.email.toLowerCase().includes(search.toLowerCase())
  );

  const getInvoiceNumber = (id: string, index: number) => `INV-${String(index + 1001).padStart(4, '0')}`;


  const invoiceColumns = useMemo<RecordColumn<Invoice>[]>(() => [
    {
      key: 'number',
      header: 'Invoice #',
      card: 'subtitle',
      render: (inv, index) => <span className="font-mono text-xs font-600 text-primary">{getInvoiceNumber(inv.id, index)}</span>,
    },
    {
      key: 'account',
      header: 'Account',
      card: 'title',
      render: (inv) => (
        <div>
          <p className="font-medium text-foreground">{inv.name}</p>
          <p className="text-xs text-muted-foreground break-all">{inv.email}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (inv) => (
        <span className={`text-xs font-600 px-2 py-0.5 rounded-full ${inv.account_type === 'store' ? 'bg-accent/10 text-accent' : 'bg-warning/10 text-warning'}`}>
          {inv.account_type}
        </span>
      ),
    },
    {
      key: 'country',
      header: 'Country',
      render: (inv) => <span className="text-muted-foreground text-xs">{inv.country || '—'} ({inv.currency_code})</span>,
    },
  ], []);

  return (
    <AppLayout accountType="admin" pageTitle="Invoices" pageSubtitle="Billing and payment records">
      <div className="space-y-5">
        {/* Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Invoices', value: filtered.length, icon: FileText, color: 'text-primary', bg: 'bg-primary/10' },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.bg}`}>
                  <Icon size={18} className={card.color} />
                </div>
                <div>
                  <p className="text-xl font-700 text-foreground">{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
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
                placeholder="Search invoices..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-2 text-sm bg-card border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30 w-52"
              />
            </div>
          </div>
          <button onClick={fetchInvoices} className="flex items-center gap-2 px-3 py-2 text-sm bg-card border border-border rounded-lg hover:bg-muted transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-lg px-4 py-3">{error}</div>
        )}

        <ResponsiveRecordList
          rows={filtered}
          getRowId={(inv) => inv.id}
          loading={loading}
          skeletonRows={6}
          footer={
            <div className="flex items-center justify-between">
              <span>{filtered.length} invoice{filtered.length !== 1 ? 's' : ''}</span>
            </div>
          }
          empty={<div className="px-4 py-12 text-center text-muted-foreground">No invoices found.</div>}
          columns={invoiceColumns}
        />
      </div>
    </AppLayout>
  );
}
