'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import {
  Package,
  Layers,
  PackageMinus,
  ArrowDownUp,
  TrendingUp,
  X,
  ArrowDownToLine,
  ArrowUpFromLine,
} from 'lucide-react';
import StoreMetricsBento from './components/StoreMetricsBento';
import StoreChartsRow from './components/StoreChartsRow';
import StoreRecentMovements from './components/StoreRecentMovements';
import StoreLowStockAlert from './components/StoreLowStockAlert';

/* Mobile-specific modules for Store */
const storeMobileModules = [
  {
    title: 'Items',
    icon: Package,
    href: '/store-items',
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/20',
    type: 'link',
  },
  {
    title: 'Stock Level',
    icon: Layers,
    href: '/store-stock',
    color: 'text-accent',
    bg: 'bg-accent/10',
    border: 'border-accent/20',
    type: 'link',
  },
  {
    title: 'Issues',
    icon: PackageMinus,
    href: '/store-issues',
    color: 'text-danger',
    bg: 'bg-danger/10',
    border: 'border-danger/20',
    type: 'link',
  },
  {
    title: 'Adjustments',
    icon: ArrowDownUp,
    href: null,
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    type: 'adjustment',
  },
];

export default function StoreHomePage() {
  const [showAdjustmentChoice, setShowAdjustmentChoice] = useState(false);
  const { profile } = useAuth();
  const accountName = profile?.full_name || 'Store Account';

  return (
    <AppLayout
      accountType="store"
      pageTitle="Store Home"
      pageSubtitle={`${accountName} — Inventory overview`}
    >
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-accent/10 to-primary/10 border border-accent/20 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
              <TrendingUp size={20} className="text-accent" />
            </div>
            <div>
              <h2 className="font-700 text-foreground text-base">Welcome to Store Management</h2>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <StoreMetricsBento />
          <StoreChartsRow />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StoreRecentMovements />
            <StoreLowStockAlert />
          </div>
        </div>

        {/* Mobile page shortcuts */}
        <div className="md:hidden grid grid-cols-2 gap-2">
          {storeMobileModules.map((mod) => {
            const ModIcon = mod.icon;
            if (mod.type === 'adjustment') {
              return (
                <button
                  key={mod.title}
                  onClick={() => setShowAdjustmentChoice(true)}
                  className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border ${mod.border} bg-card hover:shadow-md transition-all w-full`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${mod.bg}`}>
                    <ModIcon size={20} className={mod.color} />
                  </div>
                  <span className={`text-[11px] font-600 text-center leading-tight ${mod.color}`}>
                    {mod.title}
                  </span>
                </button>
              );
            }
            return (
              <Link
                key={mod.title}
                href={mod.href!}
                className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border ${mod.border} bg-card hover:shadow-md transition-all`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${mod.bg}`}>
                  <ModIcon size={20} className={mod.color} />
                </div>
                <span className={`text-[11px] font-600 text-center leading-tight ${mod.color}`}>
                  {mod.title}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Adjustments choice modal */}
      {showAdjustmentChoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-xs p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                  <ArrowDownUp size={18} className="text-teal-600" />
                </div>
                <span className="font-700 text-foreground text-base">Adjustments</span>
              </div>
              <button
                onClick={() => setShowAdjustmentChoice(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-5 text-center">Select adjustment type</p>
            <div className="flex flex-col gap-3">
              <Link
                href="/store-adjustments-in"
                onClick={() => setShowAdjustmentChoice(false)}
                className="flex flex-col items-center gap-3 p-5 rounded-xl border border-teal-200 bg-teal-50 hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-teal-100">
                  <ArrowDownToLine size={28} className="text-teal-600" />
                </div>
                <span className="text-sm font-600 text-center text-teal-600">Adjustments In</span>
              </Link>
              <Link
                href="/store-adjustments-out"
                onClick={() => setShowAdjustmentChoice(false)}
                className="flex flex-col items-center gap-3 p-5 rounded-xl border border-orange-200 bg-orange-50 hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-orange-100">
                  <ArrowUpFromLine size={28} className="text-orange-600" />
                </div>
                <span className="text-sm font-600 text-center text-orange-600">
                  Adjustments Out
                </span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
