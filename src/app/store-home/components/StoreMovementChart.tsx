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
import { storeService } from '@/lib/services/vexService';

interface MovementChartRow {
  day: string;
  receipts: number;
  issues: number;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-xs">
      <p className="font-600 text-foreground mb-1.5">{label}</p>
      {payload.map((entry: any) => (
        <div key={`tt-${entry.dataKey}`} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground capitalize">{entry.dataKey}:</span>
          <span className="font-600 text-foreground">{entry.value} units</span>
        </div>
      ))}
    </div>
  );
}

export default function StoreMovementChart() {
  const [data, setData] = useState<MovementChartRow[]>([]);

  useEffect(() => {
    storeService.getMovementChartData().then(setData).catch(console.error);
  }, []);

  return (
    <ResponsiveContainer width="100%" height={190}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -14, bottom: 0 }}>
        <defs>
          <linearGradient id="gradReceived" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.2} />
            <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradIssued" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.15} />
            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} interval={2} />
        <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="received" stroke="var(--accent)" strokeWidth={2} fill="url(#gradReceived)" dot={false} />
        <Area type="monotone" dataKey="issued" stroke="var(--primary)" strokeWidth={2} fill="url(#gradIssued)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}