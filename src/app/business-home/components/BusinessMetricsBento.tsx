'use client';

import React, { useEffect, useState } from 'react';
import MetricCard from '@/components/ui/MetricCard';
import { DollarSign, ShoppingBag, AlertTriangle, XCircle, ShoppingCart } from 'lucide-react';
import { businessService } from '@/lib/services/vexService';
import { useAccountCurrency } from '@/hooks/useAccountCurrency';
import { formatMoney } from '@/lib/countries';

interface BusinessMetrics {
  todaySales: number;
  todayTransactions: number;
  todayReturns: number;
  mtdPurchases: number;
  lowStockProducts: number;
  outOfStock: number;
}

export default function BusinessMetricsBento() {
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const { currencyCode } = useAccountCurrency();

  useEffect(() => {
    businessService.getMetrics()
      .then(setMetrics)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 2xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`${i === 0 ? 'sm:col-span-2 xl:col-span-2' : 'xl:col-span-1'} h-28 bg-muted animate-pulse rounded-xl`} />
        ))}
      </div>
    );
  }

  const m = metrics ?? { todaySales: 0, todayTransactions: 0, todayReturns: 0, mtdPurchases: 0, lowStockProducts: 0, outOfStock: 0 };
  const fmtMoney = (n: number) => formatMoney(n, currencyCode);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 2xl:grid-cols-6 gap-4">
      <div className="sm:col-span-2 xl:col-span-2">
        <MetricCard
          label="Today's Sales Revenue"
          value={fmtMoney(m.todaySales)}
          subValue={`${m.todayTransactions} transactions today`}
          trend="up"
          trendValue={fmtMoney(m.todaySales)}
          trendLabel="today"
          icon={DollarSign}
          variant="success"
          className="h-full"
        />
      </div>
      <div className="xl:col-span-1">
        <MetricCard
          label="Transactions Today"
          value={m.todayTransactions.toString()}
          subValue={`${m.todayTransactions - m.todayReturns} sales · ${m.todayReturns} returns`}
          trend="up"
          trendValue={`+${m.todayTransactions}`}
          trendLabel="today"
          icon={ShoppingBag}
          variant="default"
          className="h-full"
        />
      </div>
      <div className="xl:col-span-1">
        <MetricCard
          label="Purchases (MTD)"
          value={fmtMoney(m.mtdPurchases)}
          subValue="Purchase orders this month"
          trend="neutral"
          trendValue={fmtMoney(m.mtdPurchases)}
          trendLabel="MTD"
          icon={ShoppingCart}
          variant="info"
          className="h-full"
        />
      </div>
      <div className="xl:col-span-1">
        <MetricCard
          label="Low Stock Products"
          value={m.lowStockProducts.toString()}
          subValue="Below reorder level"
          trend={m.lowStockProducts > 0 ? 'down' : 'up'}
          trendValue={`${m.lowStockProducts}`}
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
          subValue="Lost sales risk"
          trend={m.outOfStock > 0 ? 'down' : 'up'}
          trendValue={`${m.outOfStock}`}
          trendLabel="out of stock"
          icon={XCircle}
          variant="danger"
          className="h-full"
        />
      </div>
    </div>
  );
}