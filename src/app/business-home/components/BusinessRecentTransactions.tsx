'use client';

import React, { useEffect, useState } from 'react';
import { ShoppingBag, ShoppingCart, RotateCcw, ArrowUpFromLine } from 'lucide-react';
import { businessService } from '@/lib/services/vexService';
import Icon from '@/components/ui/AppIcon';


const txnConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  sale: { icon: ShoppingBag, color: 'text-success bg-success/10', label: 'Sale' },
  purchase: { icon: ShoppingCart, color: 'text-primary bg-primary/10', label: 'Purchase' },
  return: { icon: RotateCcw, color: 'text-warning bg-warning/10', label: 'Return' },
  adjustment: { icon: ArrowUpFromLine, color: 'text-danger bg-danger/10', label: 'Adjustment' },
};

const payMethodColors: Record<string, string> = {
  Cash: 'bg-success/10 text-success',
  Card: 'bg-primary/10 text-primary',
  Transfer: 'bg-info/10 text-info',
  Mobile: 'bg-warning/10 text-warning',
  '—': 'bg-muted text-muted-foreground',
};

interface Transaction {
  id: string;
  type: 'sale' | 'purchase' | 'return' | 'adjustment';
  ref: string;
  detail: string;
  cashier: string;
  time: string;
  payMethod: string;
}

export default function BusinessRecentTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    businessService.getRecentTransactions(6)
      .then(setTransactions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-700 text-foreground">Recent Transactions</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Latest business transactions</p>
      </div>
      {loading ? (
        <div className="p-6 text-center">
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="p-6 text-center text-xs text-muted-foreground">No recent transactions</div>
      ) : (
        <div className="divide-y divide-border/50">
          {transactions.map((txn) => {
            const cfg = txnConfig[txn.type] ?? txnConfig.sale;
            const Icon = cfg.icon;
            return (
              <div key={txn.id} className="px-4 py-3 flex items-start gap-3 hover:bg-muted/30 transition-colors cursor-pointer">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.color}`}>
                  <Icon size={13} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-600 text-foreground">{cfg.label}</span>
                    <span className="text-xs text-muted-foreground font-mono">{txn.ref}</span>
                    <span className={`text-xs font-500 px-1.5 py-0.5 rounded-full ${payMethodColors[txn.payMethod] || payMethodColors['—']}`}>
                      {txn.payMethod}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{txn.detail}</p>
                  <p className="text-xs text-muted-foreground">by {txn.cashier}</p>
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0 tabular-nums">{txn.time}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}