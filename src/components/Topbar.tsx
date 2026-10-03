'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Bell, ChevronDown, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AccountAvatar from '@/components/AccountAvatar';
import { useStableAccountIdentity } from '@/hooks/useStableAccountIdentity';
import { fetchAllRows } from '@/lib/supabase/fetchAllRows';
import { createClient } from '@/lib/supabase/client';
import { getNotificationReadStateEvent, getReadNotificationIds, notificationReadStorageKey } from '@/lib/notificationReadState';

interface TopbarProps {
  title: string;
  subtitle?: string;
  accountType: 'admin' | 'store' | 'business';
  isHomePage: boolean;
  onBack?: () => void;
}

const accountColors = {
  admin: 'bg-primary text-primary-foreground',
  store: 'bg-accent text-accent-foreground',
  business: 'bg-warning text-warning-foreground',
};

const accountBadgeLabels = {
  admin: 'Admin',
  store: 'Store',
  business: 'Business',
};

const accountRoleLabels = {
  admin: 'Platform Administrator',
  store: 'Store Account',
  business: 'Business Account',
};

export default function Topbar({ title, subtitle, accountType, isHomePage, onBack }: TopbarProps) {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const { profile, user, signOut } = useAuth();
  const router = useRouter();
  const { displayName, logoUrl, email } = useStableAccountIdentity(profile, user);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  useEffect(() => {
    if (accountType === 'admin' || !user?.email) {
      setHasUnreadNotifications(false);
      return;
    }

    const supabase = createClient();
    const storageKey = notificationReadStorageKey(accountType);
    const syncNotifications = async () => {
      const { data: account } = await supabase.from('accounts').select('id').eq('email', user.email).maybeSingle();
      if (!account) {
        setHasUnreadNotifications(false);
        return;
      }

      const messages = await fetchAllRows((from, to) =>
        supabase.from('sms_messages').select('id').eq('recipient_account_id', account.id).range(from, to),
      );
      const inventory = accountType === 'business'
        ? await fetchAllRows((from, to) => supabase.from('business_products').select('id, current_stock, minimum_stock, reorder_level').eq('account_id', account.id).range(from, to))
        : await fetchAllRows((from, to) => supabase.from('store_items').select('id, current_stock, min_level').range(from, to));

      const currentIds = new Set<string>((messages ?? []).map((message) => `message-${message.id}`));
      (inventory ?? []).forEach((item: any) => {
        const currentStock = Number(item.current_stock ?? 0);
        const minimumStock = Number(item.minimum_stock ?? item.min_level ?? item.reorder_level ?? 0);
        if (currentStock === 0) currentIds.add(`${accountType}-out-of-stock-${item.id}`);
        else if (currentStock < minimumStock) currentIds.add(`${accountType}-low-stock-${item.id}`);
      });

      const readIds = getReadNotificationIds(accountType);
      setHasUnreadNotifications([...currentIds].some((id) => !readIds.has(id)));
    };

    const syncOnReadStateChange = () => void syncNotifications();
    const syncOnStorageChange = (event: StorageEvent) => {
      if (event.key === storageKey) void syncNotifications();
    };
    const syncOnFocus = () => void syncNotifications();

    void syncNotifications();
    const intervalId = window.setInterval(syncOnReadStateChange, 30_000);
    window.addEventListener(getNotificationReadStateEvent(), syncOnReadStateChange);
    window.addEventListener('storage', syncOnStorageChange);
    window.addEventListener('focus', syncOnFocus);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener(getNotificationReadStateEvent(), syncOnReadStateChange);
      window.removeEventListener('storage', syncOnStorageChange);
      window.removeEventListener('focus', syncOnFocus);
    };
  }, [accountType, user?.email]);

  useEffect(() => {
    if (!accountMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !accountMenuRef.current?.contains(event.target)) {
        setAccountMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAccountMenuOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [accountMenuOpen]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <header className="h-14 bg-card/90 backdrop-blur-xl border-b border-border flex items-center px-4 lg:px-6 gap-4 sticky top-0 z-30">
      {onBack ? (
        <button
          type="button"
          aria-label="Go back"
          onClick={onBack}
          className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft size={20} className="text-muted-foreground" />
        </button>
      ) : (
        <>
          {!isHomePage && (
            <button
              type="button"
              aria-label="Go back"
              onClick={() => router.back()}
              className="md:hidden w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
            >
              <ArrowLeft size={20} className="text-muted-foreground" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-base font-700 text-foreground leading-tight truncate">{title}</h1>
                {subtitle && (
                  <p className="hidden md:block text-xs text-muted-foreground leading-tight">{subtitle}</p>
                )}
              </div>
              <span className={`hidden sm:inline-flex text-xs font-600 px-2 py-0.5 rounded-full ${accountColors[accountType]}`}>
                {accountBadgeLabels[accountType]}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {accountType !== 'admin' && (
              <button
                type="button"
                aria-label="Open notifications"
                onClick={() => router.push(`/${accountType}-notifications`)}
                className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
              >
                <Bell size={16} className="text-muted-foreground" />
                {hasUnreadNotifications && <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full" />}
              </button>
            )}
            <div className="relative" ref={accountMenuRef}>
              <button
                type="button"
                aria-label="Open account menu"
                aria-expanded={accountMenuOpen}
                aria-haspopup="menu"
                onClick={() => setAccountMenuOpen((open) => !open)}
                className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-muted transition-colors"
                title={displayName}
              >
                <AccountAvatar name={displayName} logoUrl={logoUrl} accountType={accountType} size={24} />
                <ChevronDown size={12} className="text-muted-foreground" />
              </button>
              {accountMenuOpen && (
                <div role="menu" className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-border bg-card p-2 shadow-xl">
                  <div className="flex items-center gap-3 px-2 py-2">
                    <AccountAvatar name={displayName} logoUrl={logoUrl} accountType={accountType} size={40} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-600 text-foreground" title={displayName}>{displayName}</p>
                      <p className="truncate text-xs text-muted-foreground">{accountRoleLabels[accountType]}</p>
                      {email && <p className="truncate text-xs text-muted-foreground" title={email}>{email}</p>}
                    </div>
                  </div>
                  <div className="my-1 border-t border-border" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-danger/5 hover:text-danger"
                  >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </header>
  );
}
