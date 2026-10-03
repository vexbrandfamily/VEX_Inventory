'use client';

import React, { useEffect, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, RotateCcw } from 'lucide-react';
import { storeService } from '@/lib/services/vexService';
import Icon from '@/components/ui/AppIcon';


const movementConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  receipt: { icon: ArrowDownToLine, color: 'text-accent bg-accent/10', label: 'Receipt' },
  issue: { icon: ArrowUpFromLine, color: 'text-primary bg-primary/10', label: 'Issue' },
  adjustment: { icon: RotateCcw, color: 'text-warning bg-warning/10', label: 'Adjustments' },
  transfer: { icon: ArrowUpFromLine, color: 'text-info bg-info/10', label: 'Transfer' },
};

interface Movement {
  id: string;
  type: 'receipt' | 'issue' | 'adjustment' | 'transfer';
  ref: string;
  item: string;
  user: string;
  time: string;
}

export default function StoreRecentMovements() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    storeService.getRecentMovements(5)
      .then(setMovements)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-700 text-foreground">Recent Stock Movements</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Latest inventory transactions</p>
      </div>
      {loading ? (
        <div className="p-6 text-center">
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
        </div>
      ) : movements.length === 0 ? (
        <div className="p-6 text-center text-xs text-muted-foreground">No recent movements</div>
      ) : (
        <div className="divide-y divide-border/50">
          {movements.map((item) => {
            const cfg = movementConfig[item.type] ?? movementConfig.receipt;
            const Icon = cfg.icon;
            return (
              <div key={item.id} className="px-4 py-3 flex items-start gap-3 hover:bg-muted/30 transition-colors">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.color}`}>
                  <Icon size={13} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-600 text-foreground">{cfg.label}</span>
                    <span className="text-xs text-muted-foreground font-mono">{item.ref}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{item.item}</p>
                  <p className="text-xs text-muted-foreground">by {item.user}</p>
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0 tabular-nums">{item.time}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}