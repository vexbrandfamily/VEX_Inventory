'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { fetchAllRows } from '@/lib/supabase/fetchAllRows';
import { Search } from 'lucide-react';
import { RecordPagination, useRecordPagination } from '@/components/ui/RecordPagination';
import StatusBadge from '@/components/ui/StatusBadge';
import { getInventoryStatus } from '@/lib/stockMath';

interface StockRow {
  id: string;
  name: string;
  currentStock: number;
  reorderLevel: number;
  minimumStock: number;
  maximumStock: number;
  status: 'Normal' | 'Low Stock' | 'Critical' | 'Out of Stock' | 'Overstocked';
}

export default function BusinessStockPage() {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const query = supabase
        .from('business_products')
        .select('id, name, current_stock, reorder_level, minimum_stock, maximum_stock')
        .neq('status', 'inactive')
        .order('name', { ascending: true });
      let data;
      try {
        data = await fetchAllRows((from, to) => query.range(from, to));
      } catch {
        if (active) setLoading(false);
        return;
      }

      if (!active) return;
      {
        setRows(data.map((item) => {
          const status = getInventoryStatus(item.current_stock ?? 0, item.reorder_level ?? 0, item.minimum_stock ?? 0, item.maximum_stock ?? 0);
          return {
            id: item.id,
            name: item.name,
            currentStock: Number(item.current_stock ?? 0),
            reorderLevel: Number(item.reorder_level ?? 0),
            minimumStock: Number(item.minimum_stock ?? 0),
            maximumStock: Number(item.maximum_stock ?? 0),
            status,
          } as StockRow;
        }));
      }
      setLoading(false);
    };

    void load();
    return () => { active = false; };
  }, [supabase]);

  const filtered = rows.filter((row) => {
    const haystack = row.name.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });
  const { currentPage, pageCount, pageRows, setPage } = useRecordPagination(filtered);

  const statusVariantMap: Record<StockRow['status'], 'normal' | 'low-stock' | 'critical' | 'out-of-stock' | 'overstocked'> = {
    Normal: 'normal',
    'Low Stock': 'low-stock',
    Critical: 'critical',
    'Out of Stock': 'out-of-stock',
    Overstocked: 'overstocked',
  };

  return (
    <AppLayout accountType="business" pageTitle="Stock Level" pageSubtitle="Current stock position and reorder thresholds">
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-sm font-700 text-foreground">Product Stock Levels</h2>
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products..."
                className="pl-8 pr-3 py-1.5 text-xs bg-muted border border-border rounded-lg outline-none w-40 text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Loading stock levels...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left text-xs font-600 text-muted-foreground uppercase tracking-wider">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-600 text-muted-foreground uppercase tracking-wider">Current</th>
                  <th className="px-4 py-3 text-left text-xs font-600 text-muted-foreground uppercase tracking-wider">Reorder</th>
                  <th className="px-4 py-3 text-left text-xs font-600 text-muted-foreground uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-xs text-muted-foreground">No products found</td>
                  </tr>
                ) : pageRows.map((row) => (
                  <tr key={row.id} className="border-b border-border/50 hover:bg-primary/5">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-600 text-foreground">{row.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="text-sm font-700 tabular-nums text-foreground">{row.currentStock}</span></td>
                    <td className="px-4 py-3"><span className="text-sm tabular-nums text-muted-foreground">{row.reorderLevel}</span></td>
                    <td className="px-4 py-3">
                      <StatusBadge variant={statusVariantMap[row.status]} label={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && <RecordPagination total={filtered.length} currentPage={currentPage} pageCount={pageCount} onPageChange={setPage} />}
      </div>
    </AppLayout>
  );
}
