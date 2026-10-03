'use client';

import React, { useEffect, useState } from 'react';
import StatusBadge from '@/components/ui/StatusBadge';
import { AlertTriangle, ArrowDownToLine } from 'lucide-react';
import { storeService } from '@/lib/services/vexService';
import { RecordPagination, useRecordPagination } from '@/components/ui/RecordPagination';

interface LowStockItem {
  id: string;
  name: string;
  current: number;
  min: number;
  category: 'permanent' | 'consumable' | 'perishable';
}

export default function StoreLowStockAlert() {
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    storeService.getLowStockItems()
      .then(setLowStockItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const { currentPage, pageCount, pageRows, setPage } = useRecordPagination(lowStockItems);

  return (
    <div className="bg-danger/5 border border-danger/20 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-danger/20 flex items-center gap-2">
        <AlertTriangle size={15} className="text-danger flex-shrink-0" />
        <div>
          <h3 className="text-sm font-700 text-foreground">Low Stock Alerts</h3>
          <p className="text-xs text-muted-foreground">Items below minimum level</p>
        </div>
        <span className="ml-auto bg-danger text-danger-foreground text-xs font-700 px-2 py-0.5 rounded-full">
          {lowStockItems.length}
        </span>
      </div>
      {loading ? (
        <div className="p-6 text-center">
          <div className="w-5 h-5 border-2 border-danger/30 border-t-danger rounded-full animate-spin mx-auto" />
        </div>
      ) : lowStockItems.length === 0 ? (
        <div className="p-6 text-center text-xs text-muted-foreground">All items are well stocked</div>
      ) : (
        <div className="divide-y divide-danger/10">
          {pageRows.map((item) => (
            <div key={item.id} className="px-4 py-3 flex items-center gap-3 hover:bg-danger/10 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-600 text-foreground truncate">{item.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <StatusBadge variant={item.category} />
                </div>
              </div>
              <div className="text-right flex-shrink-0 flex items-center gap-2">
                <div>
                  <p className={`text-sm font-700 tabular-nums ${item.current === 0 ? 'text-danger' : 'text-warning'}`}>
                    {item.current}
                  </p>
                  <p className="text-xs text-muted-foreground">min: {item.min}</p>
                </div>
                <button title="Create receipt for this item" className="p-1.5 rounded-lg bg-accent/10 hover:bg-accent/20 transition-colors">
                  <ArrowDownToLine size={13} className="text-accent" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {!loading && <RecordPagination total={lowStockItems.length} currentPage={currentPage} pageCount={pageCount} onPageChange={setPage} />}
    </div>
  );
}