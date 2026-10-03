'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import { ChartSkeleton } from '@/components/ui/LoadingSkeleton';

const BusinessSalesTrendChart = dynamic(
  () => import('./BusinessSalesTrendChart'),
  { ssr: false, loading: () => <ChartSkeleton height={220} /> }
);

const BusinessWeeklySalesChart = dynamic(
  () => import('./BusinessWeeklySalesChart'),
  { ssr: false, loading: () => <ChartSkeleton height={220} /> }
);

export default function BusinessChartsRow() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 2xl:grid-cols-5 gap-5">
      <div className="xl:col-span-3 bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-700 text-foreground">Daily Sales Revenue — Last 30 Days</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Sales vs purchases spend</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 rounded-full bg-success inline-block" />
              <span className="text-xs text-muted-foreground">Sales</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 rounded-full bg-primary inline-block" />
              <span className="text-xs text-muted-foreground">Purchases</span>
            </div>
          </div>
        </div>
        <BusinessSalesTrendChart />
      </div>
      <div className="xl:col-span-2 bg-card border border-border rounded-xl p-5">
        <div className="mb-4">
          <h2 className="text-sm font-700 text-foreground">Sales by Day of Week</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Average daily revenue — Sep 2026</p>
        </div>
        <BusinessWeeklySalesChart />
      </div>
    </div>
  );
}