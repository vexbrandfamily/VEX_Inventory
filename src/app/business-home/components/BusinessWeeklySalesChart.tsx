'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { businessService } from '@/lib/services/vexService';
import { useAccountCurrency } from '@/hooks/useAccountCurrency';
import { formatMoney, getCurrencySymbol } from '@/lib/countries';

function CustomTooltip({ active, payload, label, currencyCode }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-xs">
      <p className="font-600 text-foreground mb-1">{label}</p>
      <p className="text-muted-foreground">Sales: <span className="font-600 text-foreground">{formatMoney(Number(payload[0]?.value || 0), currencyCode)}</span></p>
    </div>
  );
}

export default function BusinessWeeklySalesChart() {
  const [data, setData] = useState<Array<{ day: string; avg: number }>>([]);
  const [todayIndex, setTodayIndex] = useState<number>(0);
  const { currencyCode } = useAccountCurrency();

  useEffect(() => {
    businessService.getWeeklySalesData()
      .then((result) => {
        setData(result ?? []);
        const idx = (new Date().getDay() + 6) % 7;
        setTodayIndex(idx);
      })
      .catch(() => setData([]));
  }, []);

  if (data.length === 0) {
    return <div className="flex h-[210px] items-center justify-center text-xs text-muted-foreground">No weekly sales data available yet.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={210}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -14, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${getCurrencySymbol(currencyCode)}${(v / 1000).toFixed(1)}k`} />
        <Tooltip content={<CustomTooltip currencyCode={currencyCode} />} />
        <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-day-${index}`}
              fill={index === todayIndex ? 'var(--success)' : 'var(--primary)'}
              opacity={index === todayIndex ? 1 : 0.6}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}