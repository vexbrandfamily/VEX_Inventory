'use client';

import React, { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import EmptyState from '@/components/ui/EmptyState';
import { storeService } from '@/lib/services/vexService';

interface IssuedItem {
  name: string;
  quantity: number;
}

const pieColors = ['#4f46e5', '#0891b2', '#16a34a', '#d97706', '#db2777', '#7c3aed', '#059669', '#ea580c', '#2563eb', '#65a30d'];

function QuantityTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-xs">
      <p className="font-600 text-foreground mb-1">{label ?? payload[0]?.name}</p>
      <p className="text-muted-foreground">
        Units issued: <span className="font-600 text-foreground">{Number(payload[0]?.value ?? 0).toLocaleString()}</span>
      </p>
    </div>
  );
}

export default function StoreTopIssuedItems() {
  const [data, setData] = useState<IssuedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    storeService.getMostIssuedItems(10)
      .then((items) => {
        if (active) setData(items);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load issued item reports.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-700 text-foreground">Most Issued Items</h2>
        <p className="text-sm text-muted-foreground mt-1">Top 10 items by total units issued</p>
      </div>
      {loading ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {[0, 1].map((item) => (
            <div key={item} className="h-80 rounded-xl border border-border bg-card animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-card p-5 text-sm text-destructive">
          Unable to load issued item reports: {error}
        </div>
      ) : data.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState title="No issued items yet" description="Item issue data will appear here after issues are recorded." />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div className="min-w-0 rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-700 text-foreground mb-1">Units Issued by Item</h3>
            <p className="text-xs text-muted-foreground mb-4">Histogram of the most issued items</p>
            <ResponsiveContainer width="100%" height={Math.max(240, data.length * 42)}>
              <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<QuantityTooltip />} />
                <Bar dataKey="quantity" name="Units issued" fill="var(--primary)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="min-w-0 rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-700 text-foreground mb-1">Share of Units Issued</h3>
            <p className="text-xs text-muted-foreground mb-4">Distribution across the same top items</p>
            <ResponsiveContainer width="100%" height={Math.max(280, data.length * 30)}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="quantity"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius="68%"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {data.map((item, index) => (
                    <Cell key={item.name} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip content={<QuantityTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </section>
  );
}
