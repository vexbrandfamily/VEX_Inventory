'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { fetchAllRows } from '@/lib/supabase/fetchAllRows';
import { RecordPagination, useRecordPagination } from '@/components/ui/RecordPagination';
import { Bell, AlertTriangle, CheckCircle, Info, RefreshCw, Trash2 } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


interface Notification {
  id: string;
  activity_type: string;
  title: string;
  detail: string;
  created_at: string;
  read?: boolean;
}

const activityIcons: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  account_registered: { icon: CheckCircle, color: 'text-success', bg: 'bg-success/10' },
  subscription_renewed: { icon: CheckCircle, color: 'text-primary', bg: 'bg-primary/10' },
  invoice_generated: { icon: Info, color: 'text-accent', bg: 'bg-accent/10' },
  account_suspended: { icon: AlertTriangle, color: 'text-danger', bg: 'bg-danger/10' },
  invoice_paid: { icon: CheckCircle, color: 'text-success', bg: 'bg-success/10' },
  default: { icon: Bell, color: 'text-muted-foreground', bg: 'bg-muted' },
};

interface NotificationsPageProps {
  accountType: 'admin' | 'store' | 'business';
}

function NotificationsContent({ accountType }: NotificationsPageProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const supabase = createClient();

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const query = supabase
        .from('platform_activities')
        .select('*')
        .order('created_at', { ascending: false });
      setNotifications(await fetchAllRows((from, to) => query.range(from, to)));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotifications(); }, []);

  const markAllRead = () => {
    setReadIds(new Set(notifications.map((n) => n.id)));
  };

  const markRead = (id: string) => {
    setReadIds((prev) => new Set([...prev, id]));
  };

  const handleDelete = async (id: string) => {
    const { error: err } = await supabase.from('platform_activities').delete().eq('id', id);
    if (!err) setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;
  const { currentPage, pageCount, pageRows, setPage } = useRecordPagination(notifications);

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-700 text-foreground">Notifications</h2>
          {unreadCount > 0 && (
            <span className="bg-danger text-danger-foreground text-xs font-700 px-2 py-0.5 rounded-full">
              {unreadCount} new
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              className="text-sm text-primary hover:underline font-medium">
              Mark all read
            </button>
          )}
          <button onClick={fetchNotifications}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-card border border-border rounded-lg hover:bg-muted transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      {/* Notifications List */}
      <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4 px-5 py-4">
              <div className="w-9 h-9 bg-muted rounded-lg animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
              </div>
            </div>
          ))
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Bell size={32} className="opacity-20 mb-2" />
            <p>No notifications yet</p>
          </div>
        ) : (
          pageRows.map((notif) => {
            const cfg = activityIcons[notif.activity_type] || activityIcons.default;
            const Icon = cfg.icon;
            const isRead = readIds.has(notif.id);
            return (
              <div
                key={notif.id}
                onClick={() => markRead(notif.id)}
                className={`flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-muted/30 transition-colors ${!isRead ? 'bg-primary/5' : ''}`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                  <Icon size={16} className={cfg.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm ${!isRead ? 'font-700 text-foreground' : 'font-medium text-foreground'}`}>
                      {notif.title}
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-muted-foreground">{formatTime(notif.created_at)}</span>
                      {!isRead && <span className="w-2 h-2 bg-primary rounded-full" />}
                    </div>
                  </div>
                  {notif.detail && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{notif.detail}</p>
                  )}
                  <p className="text-xs text-muted-foreground/60 mt-1 capitalize">
                    {notif.activity_type.replace(/_/g, ' ')}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(notif.id); }}
                  className="p-1.5 rounded-lg hover:bg-danger/10 hover:text-danger text-muted-foreground transition-colors flex-shrink-0"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })
        )}
      </div>
      {!loading && <RecordPagination total={notifications.length} currentPage={currentPage} pageCount={pageCount} onPageChange={setPage} />}
    </div>
  );
}

export default function AdminNotificationsPage() {
  return (
    <AppLayout accountType="admin" pageTitle="Notifications" pageSubtitle="Platform activity and alerts">
      <NotificationsContent accountType="admin" />
    </AppLayout>
  );
}
