'use client';

import React, { useEffect, useState } from 'react';
import StatusBadge from '@/components/ui/StatusBadge';
import { Search, ChevronUp, ChevronDown, Eye, Edit2, ShoppingCart } from 'lucide-react';
import { businessService } from '@/lib/services/vexService';

type StockStatus = 'available' | 'low-stock' | 'out-of-stock';
interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  unit: string;
  currentStock: number;
  minLevel: number;
  margin: number;
  lastSale: string;
  status: StockStatus;
}

  type SortField = 'name' | 'currentStock' | 'margin' | 'lastSale';

export default function BusinessStockTable() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | StockStatus>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [activeRow, setActiveRow] = useState<string | null>(null);

  useEffect(() => {
    businessService.getProducts()
      .then(setProducts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const filtered = products
    .filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.brand.toLowerCase().includes(search.toLowerCase());
      const matchCat = categoryFilter === 'all' || p.category === categoryFilter;
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchSearch && matchCat && matchStatus;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'currentStock') cmp = a.currentStock - b.currentStock;
      else if (sortField === 'margin') cmp = a.margin - b.margin;
      else if (sortField === 'lastSale') cmp = a.lastSale.localeCompare(b.lastSale);
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const categories = [...new Set(products.map((product) => product.category.trim()).filter(Boolean))].sort();

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp size={12} className="text-border" />;
    return sortDir === 'asc' ? <ChevronUp size={12} className="text-primary" /> : <ChevronDown size={12} className="text-primary" />;
  };

  const stockBarColor = (p: Product) => {
    if (p.status === 'out-of-stock') return 'bg-danger';
    if (p.status === 'low-stock') return 'bg-warning';
    return 'bg-success';
  };

  const stockBarWidth = (p: Product) => {
    const pct = Math.min((p.currentStock / (p.minLevel * 4)) * 100, 100);
    return `${pct}%`;
  };

  const outOfStockCount = products.filter((p) => p.status === 'out-of-stock').length;
  const lowStockCount = products.filter((p) => p.status === 'low-stock').length;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-sm font-700 text-foreground">Product Stock Levels</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Current inventory with pricing and margin data</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-muted border border-border rounded-lg px-3 py-1.5">
              <Search size={13} className="text-muted-foreground" />
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent text-xs outline-none w-32 text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="text-xs bg-muted border border-border rounded-lg px-2 py-1.5 text-foreground outline-none cursor-pointer">
              <option value="all">All Categories</option>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="text-xs bg-muted border border-border rounded-lg px-2 py-1.5 text-foreground outline-none cursor-pointer">
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
          <p className="text-xs text-muted-foreground">Loading products...</p>
        </div>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2.5 text-left text-xs font-600 text-muted-foreground uppercase tracking-wider">
                  <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort('name')}>Product <SortIcon field="name" /></button>
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-600 text-muted-foreground uppercase tracking-wider">Category</th>
                <th className="px-4 py-2.5 text-left text-xs font-600 text-muted-foreground uppercase tracking-wider">Unit</th>
                <th className="px-4 py-2.5 text-left text-xs font-600 text-muted-foreground uppercase tracking-wider">
                  <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort('currentStock')}>Stock <SortIcon field="currentStock" /></button>
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-600 text-muted-foreground uppercase tracking-wider">Level</th>
                <th className="px-4 py-2.5 text-left text-xs font-600 text-muted-foreground uppercase tracking-wider">
                  <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort('margin')}>Margin <SortIcon field="margin" /></button>
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-600 text-muted-foreground uppercase tracking-wider">
                  <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort('lastSale')}>Last Sale <SortIcon field="lastSale" /></button>
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-600 text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-2.5 text-right text-xs font-600 text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-xs text-muted-foreground">No products found</td></tr>
              ) : filtered.map((product, idx) => (
                <tr
                  key={product.id}
                  className={`border-b border-border/50 transition-colors duration-100 ${idx % 2 === 0 ? 'bg-card' : 'bg-muted/20'} hover:bg-primary/5`}
                  onMouseEnter={() => setActiveRow(product.id)}
                  onMouseLeave={() => setActiveRow(null)}
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-xs font-600 text-foreground">{product.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{product.brand}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className="inline-flex items-center text-xs font-500 px-2 py-0.5 rounded-full border border-border bg-muted text-muted-foreground">{product.category || '—'}</span></td>
                  <td className="px-4 py-3"><span className="text-xs text-muted-foreground">{product.unit}</span></td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-700 tabular-nums ${product.status === 'out-of-stock' ? 'text-danger' : product.status === 'low-stock' ? 'text-warning' : 'text-foreground'}`}>
                      {product.currentStock}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-16">
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-300 ${stockBarColor(product)}`} style={{ width: stockBarWidth(product) }} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">min {product.minLevel}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-700 tabular-nums ${product.margin >= 50 ? 'text-success' : product.margin >= 35 ? 'text-foreground' : 'text-warning'}`}>
                      {product.margin}%
                    </span>
                  </td>
                  <td className="px-4 py-3"><span className="text-xs text-muted-foreground tabular-nums">{product.lastSale}</span></td>
                  <td className="px-4 py-3"><StatusBadge variant={product.status} /></td>
                  <td className="px-4 py-3">
                    <div className={`flex items-center justify-end gap-1 transition-opacity duration-150 ${activeRow === product.id ? 'opacity-100' : 'opacity-0'}`}>
                      <button title="View product details" className="p-1.5 rounded hover:bg-muted transition-colors">
                        <Eye size={13} className="text-muted-foreground hover:text-primary" />
                      </button>
                      <button title="Edit product" className="p-1.5 rounded hover:bg-muted transition-colors">
                        <Edit2 size={13} className="text-muted-foreground hover:text-primary" />
                      </button>
                      <button title="Create purchase order" className="p-1.5 rounded hover:bg-muted transition-colors">
                        <ShoppingCart size={13} className="text-muted-foreground hover:text-accent" />
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
              <p className="px-2 py-8 text-center text-xs text-muted-foreground">No products found</p>
            ) : filtered.map((product) => (
              <article key={product.id} className="border border-border rounded-xl p-4 bg-muted/10">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-600 text-foreground break-words">{product.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {product.brand || ''}
                    </p>
                  </div>
                  <StatusBadge variant={product.status} />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5">
                  <div>
                    <dt className="text-[11px] font-600 uppercase tracking-wide text-muted-foreground">Category</dt>
                    <dd className="mt-0.5"><span className="inline-flex items-center text-xs font-500 px-2 py-0.5 rounded-full border border-border bg-muted text-muted-foreground">{product.category || '—'}</span></dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-600 uppercase tracking-wide text-muted-foreground">Unit</dt>
                    <dd className="mt-0.5 text-sm text-foreground">{product.unit}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-600 uppercase tracking-wide text-muted-foreground">Stock</dt>
                    <dd className={`mt-0.5 text-sm font-700 tabular-nums ${product.status === 'out-of-stock' ? 'text-danger' : product.status === 'low-stock' ? 'text-warning' : 'text-foreground'}`}>{product.currentStock}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-600 uppercase tracking-wide text-muted-foreground">Min</dt>
                    <dd className="mt-0.5 text-sm text-foreground">{product.minLevel}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-600 uppercase tracking-wide text-muted-foreground">Margin</dt>
                    <dd className={`mt-0.5 text-sm font-700 ${product.margin >= 50 ? 'text-success' : product.margin >= 35 ? 'text-foreground' : 'text-warning'}`}>{product.margin}%</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-600 uppercase tracking-wide text-muted-foreground">Last Sale</dt>
                    <dd className="mt-0.5 text-sm text-foreground">{product.lastSale}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </>
      )}
      <div className="px-4 py-3 border-t border-border flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {products.length} products
          {statusFilter !== 'all' && <span> · filtered by {statusFilter}</span>}
        </p>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            <span className="text-danger font-600">{outOfStockCount}</span> out of stock ·
            <span className="text-warning font-600"> {lowStockCount}</span> low stock
          </span>
          <button className="text-xs text-primary font-600 hover:underline">View all products →</button>
        </div>
      </div>
    </div>
  );
}