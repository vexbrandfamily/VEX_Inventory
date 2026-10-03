'use client';

import React, { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { businessService } from '@/lib/services/vexService';

interface TopProduct {
  id: string;
  name: string;
  unitsSold: number;
  trend: 'up' | 'neutral';
}

export default function BusinessTopProducts() {
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    businessService.getTopProducts(5)
      .then(setTopProducts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const maxUnits = topProducts.length > 0 ? Math.max(...topProducts.map((p) => p.unitsSold)) : 1;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <TrendingUp size={15} className="text-success flex-shrink-0" />
        <div>
          <h3 className="text-sm font-700 text-foreground">Top Selling Products</h3>
          <p className="text-xs text-muted-foreground mt-0.5">By stock volume</p>
        </div>
      </div>
      {loading ? (
        <div className="p-6 text-center">
          <div className="w-5 h-5 border-2 border-success/30 border-t-success rounded-full animate-spin mx-auto" />
        </div>
      ) : topProducts.length === 0 ? (
        <div className="p-6 text-center text-xs text-muted-foreground">No products found</div>
      ) : (
        <div className="divide-y divide-border/50 px-4">
          {topProducts.map((product, idx) => (
            <div key={product.id} className="py-3 flex items-center gap-3 hover:bg-muted/20 transition-colors -mx-4 px-4">
              <span className="text-xs font-700 text-muted-foreground w-4 flex-shrink-0 tabular-nums">{idx + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-600 text-foreground truncate">{product.name}</p>
                <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-success transition-all duration-300"
                    style={{ width: `${(product.unitsSold / maxUnits) * 100}%` }}
                  />
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-700 text-foreground tabular-nums">{product.unitsSold} units</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}