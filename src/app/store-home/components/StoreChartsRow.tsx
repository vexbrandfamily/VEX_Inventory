'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import { ChartSkeleton } from '@/components/ui/LoadingSkeleton';

const StoreMovementChart = dynamic(
  () => import('./StoreMovementChart'),
  { ssr: false, loading: () => <ChartSkeleton height={200} /> }
);

const StoreCategoryChart = dynamic(
  () => import('./StoreCategoryChart'),
  { ssr: false, loading: () => <ChartSkeleton height={200} /> }
);

export default function StoreChartsRow() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 2xl:grid-cols-5 gap-5">
      <div className="xl:col-span-3 bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-700 text-foreground">Stock Movement — Last 14 Days</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Daily units received vs issued</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 rounded-full bg-accent inline-block" />
              <span className="text-xs text-muted-foreground">Received</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 rounded-full bg-primary inline-block" />
              <span className="text-xs text-muted-foreground">Issued</span>
            </div>
          </div>
        </div>
        <StoreMovementChart />
      </div>
      <div className="xl:col-span-2 bg-card border border-border rounded-xl p-5">
        <div className="mb-4">
          <h2 className="text-sm font-700 text-foreground">Stock by Category</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Total units per item category</p>
        </div>
        <StoreCategoryChart />
      </div>
    </div>
  );
}