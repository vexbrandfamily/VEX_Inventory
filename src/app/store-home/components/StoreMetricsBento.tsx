'use client';

import React, { useEffect, useState } from 'react';
import MetricCard from '@/components/ui/MetricCard';
import { Package, AlertTriangle, XCircle, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { storeService } from '@/lib/services/vexService';

interface StoreMetrics {
  totalItems: number;
  lowStockItems: number;
  outOfStock: number;
  receivedToday: number;
  issuedToday: number;
  receiptsCount: number;
  issuesCount: number;
}

export default function StoreMetricsBento() {
  const [metrics, setMetrics] = useState<StoreMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    storeService.getMetrics()
      .then(setMetrics)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 2xl:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`${i === 0 ? 'sm:col-span-2 xl:col-span-1' : 'xl:col-span-1'} h-28 bg-muted animate-pulse rounded-xl`} />
        ))}
      </div>
    );
  }

  const m = metrics ?? { totalItems: 0, lowStockItems: 0, outOfStock: 0, receivedToday: 0, issuedToday: 0, receiptsCount: 0, issuesCount: 0 };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 2xl:grid-cols-5 gap-4">
      <div className="sm:col-span-2 xl:col-span-1">
        <MetricCard
          label="Total Registered Items"
          value={m.totalItems.toString()}
          subValue="Across all categories"
          trend="up"
          trendValue={`+${m.totalItems}`}
          trendLabel="total items"
          icon={Package}
          variant="default"
          className="h-full"
        />
      </div>
      <div className="xl:col-span-1">
        <MetricCard
          label="Low Stock Items"
          value={m.lowStockItems.toString()}
          subValue="Below minimum level"
          trend={m.lowStockItems > 0 ? 'down' : 'up'}
          trendValue={`${m.lowStockItems}`}
          trendLabel="items low"
          icon={AlertTriangle}
          variant="warning"
          className="h-full"
        />
      </div>
      <div className="xl:col-span-1">
        <MetricCard
          label="Out of Stock"
          value={m.outOfStock.toString()}
          subValue="Immediate restocking needed"
          trend={m.outOfStock > 0 ? 'down' : 'up'}
          trendValue={`${m.outOfStock}`}
          trendLabel="out of stock"
          icon={XCircle}
          variant="danger"
          className="h-full"
        />
      </div>
      <div className="xl:col-span-1">
        <MetricCard
          label="Received Today"
          value={`${m.receivedToday} units`}
          subValue={`${m.receiptsCount} receipts processed`}
          trend="up"
          trendValue={`+${m.receivedToday}`}
          trendLabel="units in"
          icon={ArrowDownToLine}
          variant="success"
          className="h-full"
        />
      </div>
      <div className="xl:col-span-1">
        <MetricCard
          label="Issued Today"
          value={`${m.issuedToday} units`}
          subValue={`${m.issuesCount} issue transactions`}
          trend="neutral"
          trendValue={`${m.issuedToday}`}
          trendLabel="units out"
          icon={ArrowUpFromLine}
          variant="info"
          className="h-full"
        />
      </div>
    </div>
  );
}