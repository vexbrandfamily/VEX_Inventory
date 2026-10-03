'use client';

import React, { useEffect, useState } from 'react';
import MetricCard from '@/components/ui/MetricCard';
import { Users, Store, Briefcase } from 'lucide-react';
import { adminService } from '@/lib/services/vexService';

interface AdminMetrics {
  totalAccounts: number;
  storeAccounts: number;
  businessAccounts: number;
}

export default function AdminMetricsBento() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getMetrics()
      .then(setMetrics)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) => n.toLocaleString();

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={`${i === 0 ? 'sm:col-span-2 xl:col-span-2' : 'xl:col-span-2'} h-28 bg-muted animate-pulse rounded-xl`} />
        ))}
      </div>
    );
  }

  const m = metrics ?? { totalAccounts: 0, storeAccounts: 0, businessAccounts: 0 };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      <div>
        <MetricCard
          label="Total Registered Accounts"
          value={fmt(m.totalAccounts)}
          subValue="Platform-wide client accounts"
          trend="up"
          trendValue={`+${m.totalAccounts}`}
          trendLabel="total registered"
          icon={Users}
          variant="default"
          className="h-full"
        />
      </div>
      <div>
        <MetricCard
          label="Store Accounts"
          value={fmt(m.storeAccounts)}
          subValue="Organizations & institutions"
          trend="up"
          trendValue={`+${m.storeAccounts}`}
          trendLabel="registered"
          icon={Store}
          variant="info"
          className="h-full"
        />
      </div>
      <div>
        <MetricCard
          label="Business Accounts"
          value={fmt(m.businessAccounts)}
          subValue="Commercial businesses"
          trend="up"
          trendValue={`+${m.businessAccounts}`}
          trendLabel="registered"
          icon={Briefcase}
          variant="default"
          className="h-full"
        />
      </div>
    </div>
  );
}