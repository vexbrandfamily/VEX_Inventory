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
import { storeService } from '@/lib/services/vexService';

const fills = ['var(--info)', 'var(--primary)'];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-xs">
      <p className="font-600 text-foreground mb-1">{label}</p>
      <p className="text-muted-foreground">Total units: <span className="font-600 text-foreground">{payload[0]?.value?.toLocaleString()}</span></p>
    </div>
  );
}

export default function StoreCategoryChart() {
  const [data, setData] = useState<Array<{ category: string; units: number; fill: string }>>([]);

  useEffect(() => {
    storeService.getCategoryBreakdown().then((rows) => {
      setData(rows.map((row, index) => ({ ...row, category: row.name, units: row.value, fill: fills[index % fills.length] })));
    }).catch(console.error);
  }, []);

  return (
    <ResponsiveContainer width="100%" height={190}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -14, bottom: 0 }} barCategoryGap="35%">
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="category" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="units" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-cat-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}