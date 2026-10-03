'use client';

import React from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import BusinessMetricsBento from '@/app/business-home/components/BusinessMetricsBento';
import BusinessChartsRow from '@/app/business-home/components/BusinessChartsRow';
import BusinessRecentTransactions from '@/app/business-home/components/BusinessRecentTransactions';
import BusinessTopProducts from '@/app/business-home/components/BusinessTopProducts';

export default function BusinessReportsPage() {
  const { profile } = useAuth();
  const accountName = profile?.full_name || 'Business Account';

  return (
    <AppLayout accountType="business" pageTitle="Reports & Analysis" pageSubtitle={accountName}>
      <div className="space-y-6">
        <BusinessMetricsBento />
        <BusinessChartsRow />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BusinessRecentTransactions />
          <BusinessTopProducts />
        </div>
      </div>
    </AppLayout>
  );
}