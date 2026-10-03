'use client';

import React from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import {
  Package,
  ShoppingBag,
  Layers,
  ShoppingCart,
  TrendingDown,
  ArrowDownToLine,
  ArrowUpFromLine,
  TrendingUp,
} from 'lucide-react';
import BusinessMetricsBento from './components/BusinessMetricsBento';
import BusinessChartsRow from './components/BusinessChartsRow';
import BusinessRecentTransactions from './components/BusinessRecentTransactions';
import BusinessTopProducts from './components/BusinessTopProducts';

const businessModules = [
  {
    title: 'Products',
    icon: Package,
    href: '/business-products',
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/20',
  },
  {
    title: 'Purchases',
    icon: ShoppingBag,
    href: '/business-purchases',
    color: 'text-success',
    bg: 'bg-success/10',
    border: 'border-success/20',
  },
  {
    title: 'Stock Level',
    icon: Layers,
    href: '/business-stock',
    color: 'text-accent',
    bg: 'bg-accent/10',
    border: 'border-accent/20',
  },
  {
    title: 'Point of Sale',
    icon: ShoppingCart,
    href: '/business-pos',
    color: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/20',
  },
  {
    title: 'Sales',
    icon: TrendingDown,
    href: '/business-sales',
    color: 'text-danger',
    bg: 'bg-danger/10',
    border: 'border-danger/20',
  },
  {
    title: 'Adjustments In',
    icon: ArrowDownToLine,
    href: '/business-adjustments-in',
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
  },
  {
    title: 'Adjustments Out',
    icon: ArrowUpFromLine,
    href: '/business-adjustments-out',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
  },
];

export default function BusinessHomePage() {
  const { profile } = useAuth();
  const accountName = profile?.full_name || 'Business Account';

  return (
    <AppLayout
      accountType="business"
      pageTitle="Business Home"
      pageSubtitle={`${accountName} — Commercial operations overview`}
    >
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-warning/10 to-primary/10 border border-warning/20 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center flex-shrink-0">
              <TrendingUp size={20} className="text-warning" />
            </div>
            <div>
              <h2 className="font-700 text-foreground text-base">Welcome to Business Management</h2>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <BusinessMetricsBento />
          <BusinessChartsRow />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BusinessRecentTransactions />
            <BusinessTopProducts />
          </div>
        </div>

        {/* Mobile page shortcuts */}
        <div className="md:hidden grid grid-cols-4 gap-2">
          {businessModules.map((mod) => {
            const ModIcon = mod.icon;
            return (
              <Link
                key={mod.title}
                href={mod.href}
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
    </AppLayout>
  );
}
