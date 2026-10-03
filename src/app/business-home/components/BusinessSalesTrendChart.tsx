'use client';

import React, { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { businessService } from '@/lib/services/vexService';
import { useAccountCurrency } from '@/hooks/useAccountCurrency';
import { formatMoney, getCurrencySymbol } from '@/lib/countries';

function CustomTooltip({ active, payload, label, currencyCode }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-xs">
      <p className="font-600 text-foreground mb-1.5">{label}</p>
      {payload.filter((e: any) => e.value > 0).map((entry: any) => (
        <div key={`tt-${entry.dataKey}`} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground capitalize">{entry.dataKey}:</span>
          <span className="font-600 text-foreground">{formatMoney(Number(entry.value || 0), currencyCode)}</span>
        </div>
      ))}
    </div>
  );
}

export default function BusinessSalesTrendChart() {
  const [data, setData] = useState<Array<{ date: string; sales: number; purchases: number }>>([]);
  const { currencyCode } = useAccountCurrency();

  useEffect(() => {
    businessService.getSalesTrendData()
      .then((result) => setData(result ?? []))
      .catch(() => setData([]));
  }, []);

  if (data.length === 0) {
    return <div className="flex h-[210px] items-center justify-center text-xs text-muted-foreground">No sales data available yet.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={210}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="gradSales" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--success)" stopOpacity={0.2} />
            <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradPurchases" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.15} />
            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} interval={5} />
        <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${getCurrencySymbol(currencyCode)}${(v / 1000).toFixed(1)}k`} />
        <Tooltip content={<CustomTooltip currencyCode={currencyCode} />} />
        <Area type="monotone" dataKey="purchases" stroke="var(--primary)" strokeWidth={1.5} fill="url(#gradPurchases)" dot={false} />
        <Area type="monotone" dataKey="sales" stroke="var(--success)" strokeWidth={2} fill="url(#gradSales)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}