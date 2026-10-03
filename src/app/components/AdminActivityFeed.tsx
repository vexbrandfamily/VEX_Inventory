'use client';

import React, { useEffect, useState } from 'react';
import { UserPlus, CreditCard, FileText, Ban, CheckCircle, AlertCircle } from 'lucide-react';
import { adminService } from '@/lib/services/vexService';
import Icon from '@/components/ui/AppIcon';


const activityConfig: Record<string, { icon: React.ElementType; color: string }> = {
  account_registered: { icon: UserPlus, color: 'text-primary bg-primary/10' },
  subscription_renewed: { icon: CreditCard, color: 'text-success bg-success/10' },
  invoice_generated: { icon: FileText, color: 'text-info bg-info/10' },
  account_suspended: { icon: Ban, color: 'text-danger bg-danger/10' },
  invoice_paid: { icon: CheckCircle, color: 'text-success bg-success/10' },
};

interface ActivityItem {
  id: string;
  activityType: string;
  title: string;
  detail: string;
  time: string;
}

export default function AdminActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getActivityFeed(6)
      .then(setActivities)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-700 text-foreground">Platform Activity</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Recent platform-level events</p>
      </div>
      {loading ? (
        <div className="p-6 text-center">
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
        </div>
      ) : activities.length === 0 ? (
        <div className="p-6 text-center text-xs text-muted-foreground">No recent activity</div>
      ) : (
        <div className="divide-y divide-border/50">
          {activities.map((item) => {
            const cfg = activityConfig[item.activityType] ?? { icon: AlertCircle, color: 'text-muted-foreground bg-muted' };
            const Icon = cfg.icon;
            return (
              <div key={item.id} className="px-4 py-3 flex items-start gap-3 hover:bg-muted/30 transition-colors">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.color}`}>
                  <Icon size={13} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-600 text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.detail}</p>
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">{item.time}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}