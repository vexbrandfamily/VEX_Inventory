'use client';

import React, { useEffect, useState } from 'react';
import StatusBadge from '@/components/ui/StatusBadge';
import { Search, ChevronUp, ChevronDown, Edit2, Eye, ArrowDownToLine } from 'lucide-react';
import { storeService } from '@/lib/services/vexService';

type StockStatus = 'available' | 'low-stock' | 'out-of-stock';
type Category = 'permanent' | 'consumable' | 'perishable';

interface StockItem {
  id: string;
  code: string;
  name: string;
  category: Category;
  unit: string;
  currentStock: number;
  minLevel: number;
  maxLevel: number;
  location: string;
  lastMovement: string;
  status: StockStatus;
}

type SortField = 'name' | 'currentStock' | 'category' | 'lastMovement';

export default function StoreStockTable() {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | Category>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | StockStatus>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [activeRow, setActiveRow] = useState<string | null>(null);

  useEffect(() => {
    storeService.getStockItems()
      .then(setStockItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const filtered = stockItems
    .filter((item) => {
      const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.code.toLowerCase().includes(search.toLowerCase());
      const matchCat = categoryFilter === 'all' || item.category === categoryFilter;
      const matchStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchSearch && matchCat && matchStatus;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'currentStock') cmp = a.currentStock - b.currentStock;
      else if (sortField === 'category') cmp = a.category.localeCompare(b.category);
      else if (sortField === 'lastMovement') cmp = a.lastMovement.localeCompare(b.lastMovement);
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp size={12} className="text-border" />;
    return sortDir === 'asc' ? <ChevronUp size={12} className="text-primary" /> : <ChevronDown size={12} className="text-primary" />;
  };

  const stockBarColor = (item: StockItem) => {
    if (item.status === 'out-of-stock') return 'bg-danger';
    if (item.status === 'low-stock') return 'bg-warning';
    return 'bg-success';
  };

  const stockBarWidth = (item: StockItem) => {
    const pct = Math.min((item.currentStock / item.maxLevel) * 100, 100);
    return `${pct}%`;
  };

  const outOfStockCount = stockItems.filter((i) => i.status === 'out-of-stock').length;
  const lowStockCount = stockItems.filter((i) => i.status === 'low-stock').length;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-sm font-700 text-foreground">Stock Level — All Items</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Current inventory position across all categories</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-muted border border-border rounded-lg px-3 py-1.5">
              <Search size={13} className="text-muted-foreground" />
              <input
                type="text"
                placeholder="Search items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent text-xs outline-none w-32 text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as typeof categoryFilter)}
              className="text-xs bg-muted border border-border rounded-lg px-2 py-1.5 text-foreground outline-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              <option value="permanent">Permanent</option>
              <option value="consumable">Consumable</option>
              <option value="perishable">Perishable</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="text-xs bg-muted border border-border rounded-lg px-2 py-1.5 text-foreground outline-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="available">Available</option>
              <option value="low-stock">Low Stock</option>
              <option value="out-of-stock">Out of Stock</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Loading inventory...</p>
        </div>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2.5 text-left text-xs font-600 text-muted-foreground uppercase tracking-wider">
                  <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort('name')}>
                    Item <SortIcon field="name" />
                  </button>
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-600 text-muted-foreground uppercase tracking-wider">
                  <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort('category')}>
                    Category <SortIcon field="category" />
                  </button>
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-600 text-muted-foreground uppercase tracking-wider">Unit</th>
                <th className="px-4 py-2.5 text-left text-xs font-600 text-muted-foreground uppercase tracking-wider">
                  <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort('currentStock')}>
                    Stock <SortIcon field="currentStock" />
                  </button>
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-600 text-muted-foreground uppercase tracking-wider">Min / Max</th>
                <th className="px-4 py-2.5 text-left text-xs font-600 text-muted-foreground uppercase tracking-wider">Level</th>
                <th className="px-4 py-2.5 text-left text-xs font-600 text-muted-foreground uppercase tracking-wider">Location</th>
                <th className="px-4 py-2.5 text-left text-xs font-600 text-muted-foreground uppercase tracking-wider">
                  <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort('lastMovement')}>
                    Last Move <SortIcon field="lastMovement" />
                  </button>
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-600 text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-2.5 text-right text-xs font-600 text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-xs text-muted-foreground">No items found</td>
                </tr>
              ) : filtered.map((item, idx) => (
                <tr
                  key={item.id}
                  className={`border-b border-border/50 transition-colors duration-100 ${idx % 2 === 0 ? 'bg-card' : 'bg-muted/20'} hover:bg-primary/5`}
                  onMouseEnter={() => setActiveRow(item.id)}
                  onMouseLeave={() => setActiveRow(null)}
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-xs font-600 text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{item.code}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3"><StatusBadge variant={item.category} /></td>
                  <td className="px-4 py-3"><span className="text-xs text-muted-foreground">{item.unit}</span></td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-700 tabular-nums ${item.status === 'out-of-stock' ? 'text-danger' : item.status === 'low-stock' ? 'text-warning' : 'text-foreground'}`}>
                      {item.currentStock}
                    </span>
                  </td>
                  <td className="px-4 py-3"><span className="text-xs text-muted-foreground tabular-nums">{item.minLevel} / {item.maxLevel}</span></td>
                  <td className="px-4 py-3">
                    <div className="w-20">
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-300 ${stockBarColor(item)}`} style={{ width: stockBarWidth(item) }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className="text-xs text-muted-foreground">{item.location}</span></td>
                  <td className="px-4 py-3"><span className="text-xs text-muted-foreground tabular-nums">{item.lastMovement}</span></td>
                  <td className="px-4 py-3"><StatusBadge variant={item.status} /></td>
                  <td className="px-4 py-3">
                    <div className={`flex items-center justify-end gap-1 transition-opacity duration-150 ${activeRow === item.id ? 'opacity-100' : 'opacity-0'}`}>
                      <button title="View item history" className="p-1.5 rounded hover:bg-muted transition-colors">
                        <Eye size={13} className="text-muted-foreground hover:text-primary" />
                      </button>
                      <button title="Edit item" className="p-1.5 rounded hover:bg-muted transition-colors">
                        <Edit2 size={13} className="text-muted-foreground hover:text-primary" />
                      </button>
                      <button title="Create receipt for this item" className="p-1.5 rounded hover:bg-muted transition-colors">
                        <ArrowDownToLine size={13} className="text-muted-foreground hover:text-accent" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="md:hidden p-3 space-y-3">
            {filtered.length === 0 ? (
              <p className="px-2 py-8 text-center text-xs text-muted-foreground">No items found</p>
            ) : filtered.map((item) => (
              <article key={item.id} className="border border-border rounded-xl p-4 bg-muted/10">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-600 text-foreground break-words">{item.name}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{item.code}</p>
                  </div>
                  <StatusBadge variant={item.status} />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5">
                  <div>
                    <dt className="text-[11px] font-600 uppercase tracking-wide text-muted-foreground">Category</dt>
                    <dd className="mt-0.5"><StatusBadge variant={item.category} /></dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-600 uppercase tracking-wide text-muted-foreground">Unit</dt>
                    <dd className="mt-0.5 text-sm text-foreground">{item.unit}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-600 uppercase tracking-wide text-muted-foreground">Stock</dt>
                    <dd className={`mt-0.5 text-sm font-700 tabular-nums ${item.status === 'out-of-stock' ? 'text-danger' : item.status === 'low-stock' ? 'text-warning' : 'text-foreground'}`}>{item.currentStock}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-600 uppercase tracking-wide text-muted-foreground">Min / Max</dt>
                    <dd className="mt-0.5 text-sm text-foreground tabular-nums">{item.minLevel} / {item.maxLevel}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-[11px] font-600 uppercase tracking-wide text-muted-foreground">Level</dt>
                    <dd className="mt-1">
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${stockBarColor(item)}`} style={{ width: stockBarWidth(item) }} />
                      </div>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-600 uppercase tracking-wide text-muted-foreground">Location</dt>
                    <dd className="mt-0.5 text-sm text-foreground break-words">{item.location || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-600 uppercase tracking-wide text-muted-foreground">Last Move</dt>
                    <dd className="mt-0.5 text-sm text-foreground">{item.lastMovement}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </>
      )}
      <div className="px-4 py-3 border-t border-border flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {stockItems.length} items
          {statusFilter !== 'all' && <span> · filtered by {statusFilter}</span>}
        </p>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            <span className="text-danger font-600">{outOfStockCount}</span> out of stock ·
            <span className="text-warning font-600"> {lowStockCount}</span> low stock
          </span>
          <button className="text-xs text-primary font-600 hover:underline">View all items →</button>
        </div>
      </div>
    </div>
  );
}