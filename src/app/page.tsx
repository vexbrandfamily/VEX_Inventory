import React from 'react';
import AppLayout from '@/components/AppLayout';
import AdminMetricsBento from './components/AdminMetricsBento';
import AdminRecentRegistrations from './components/AdminRecentRegistrations';
import AdminActivityFeed from './components/AdminActivityFeed';

export default function AdminDashboardPage() {
  return (
    <AppLayout
      accountType="admin"
      pageTitle="Admin Dashboard"
      pageSubtitle="Platform overview — Sep 4, 2026"
    >
      <div className="space-y-5">
        {/* KPI Bento Grid */}
        <AdminMetricsBento />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2">
            <AdminRecentRegistrations />
          </div>
          <AdminActivityFeed />
        </div>
      </div>
    </AppLayout>
  );
}