'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, CreditCard, BarChart2, MessageSquare, Settings, Package, ArrowDownToLine, ArrowUpFromLine, ShoppingCart, ShoppingBag, TrendingDown, Home, Layers, PackageCheck, PackageMinus, PanelLeft, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AccountAvatar from '@/components/AccountAvatar';
import { useStableAccountIdentity } from '@/hooks/useStableAccountIdentity';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  group: string;
}

interface SidebarProps {
  accountType: 'admin' | 'store' | 'business';
}

type SidebarMode = 'expanded' | 'collapsed' | 'hover';

const adminNavItems: NavItem[] = [
  { id: 'nav-admin-dashboard', label: 'Dashboard', href: '/', icon: LayoutDashboard, group: 'overview' },
  { id: 'nav-admin-accounts', label: 'Accounts', href: '/admin-accounts', icon: Users, group: 'management' },
  { id: 'nav-admin-subscriptions', label: 'Subscriptions', href: '/admin-subscriptions', icon: CreditCard, group: 'management' },
  { id: 'nav-admin-usage', label: 'Usage', href: '/admin-usage', icon: BarChart2, group: 'management' },
  { id: 'nav-admin-sms', label: 'SMS', href: '/admin-sms', icon: MessageSquare, group: 'management' },
  { id: 'nav-admin-settings', label: 'Settings', href: '/admin-settings', icon: Settings, group: 'system' },
];

const storeNavItems: NavItem[] = [
  { id: 'nav-store-home', label: 'Home', href: '/store-home', icon: Home, group: 'overview' },
  { id: 'nav-store-reports', label: 'Reports', href: '/store-reports', icon: BarChart2, group: 'overview' },
  { id: 'nav-store-items', label: 'Items', href: '/store-items', icon: Package, group: 'inventory' },
  { id: 'nav-store-receipts', label: 'Receipts', href: '/store-receipts', icon: PackageCheck, group: 'inventory' },
  { id: 'nav-store-issues', label: 'Issues', href: '/store-issues', icon: PackageMinus, group: 'inventory' },
  { id: 'nav-store-stocklevel', label: 'Stock Level', href: '/store-stock', icon: Layers, group: 'inventory' },
  { id: 'nav-store-adjustmentin', label: 'Adjustments In', href: '/store-adjustments-in', icon: ArrowDownToLine, group: 'movements' },
  { id: 'nav-store-adjustmentout', label: 'Adjustments Out', href: '/store-adjustments-out', icon: ArrowUpFromLine, group: 'movements' },
  { id: 'nav-store-settings', label: 'Settings', href: '/store-settings', icon: Settings, group: 'system' },
];

const businessNavItems: NavItem[] = [
  { id: 'nav-biz-home', label: 'Home', href: '/business-home', icon: Home, group: 'overview' },
  { id: 'nav-biz-products', label: 'Products', href: '/business-products', icon: Package, group: 'inventory' },
  { id: 'nav-biz-stockin-inv', label: 'Purchases', href: '/business-purchases', icon: ShoppingBag, group: 'inventory' },
  { id: 'nav-biz-stocklevel', label: 'Stock Level', href: '/business-stock', icon: Layers, group: 'inventory' },
  { id: 'nav-biz-pos', label: 'Point of Sale', href: '/business-pos', icon: ShoppingCart, group: 'sales' },
  { id: 'nav-biz-stockout-sales', label: 'Sales', href: '/business-sales', icon: TrendingDown, group: 'sales' },
  { id: 'nav-biz-stockin', label: 'Adjustments In', href: '/business-adjustments-in', icon: ArrowDownToLine, group: 'movements' },
  { id: 'nav-biz-stockout', label: 'Adjustments Out', href: '/business-adjustments-out', icon: ArrowUpFromLine, group: 'movements' },
  { id: 'nav-biz-settings', label: 'Settings', href: '/business-settings', icon: Settings, group: 'system' },
];

const navMap = {
  admin: adminNavItems,
  store: storeNavItems,
  business: businessNavItems,
};

const roleLabels = {
  admin: 'Platform Administrator',
  store: 'Store Account',
  business: 'Business Account',
};

export default function Sidebar({ accountType }: SidebarProps) {
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>('hover');
  const [loadedStorageKey, setLoadedStorageKey] = useState<string | null>(null);
  const [pointerInside, setPointerInside] = useState(false);
  const [controlOpen, setControlOpen] = useState(false);
  const controlRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const navItems = navMap[accountType];
  const { profile, user } = useAuth();
  const storageKey = `vex-sidebar-control:${user?.id ?? 'anonymous'}`;
  const expanded = sidebarMode === 'expanded' || (sidebarMode === 'hover' && pointerInside);
  const { displayName, logoUrl } = useStableAccountIdentity(profile, user);

  useEffect(() => {
    let savedMode: string | null = null;
    try {
      savedMode = window.localStorage.getItem(storageKey);
    } catch {
      savedMode = null;
    }
    setSidebarMode(savedMode === 'expanded' || savedMode === 'collapsed' || savedMode === 'hover' ? savedMode : 'hover');
    setLoadedStorageKey(storageKey);
  }, [storageKey]);

  useEffect(() => {
    if (loadedStorageKey !== storageKey) return;
    try {
      window.localStorage.setItem(storageKey, sidebarMode);
    } catch {
      // Preference persistence is optional when storage is unavailable.
    }
  }, [loadedStorageKey, sidebarMode, storageKey]);

  useEffect(() => {
    if (!controlOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !controlRef.current?.contains(event.target)) {
        setControlOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setControlOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [controlOpen]);

  const groups = Array.from(new Set(navItems.map((i) => i.group)));

  const isActive = (item: NavItem) => {
    const path = item.href.split('?')[0];
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <aside
      onMouseEnter={() => setPointerInside(true)}
      onMouseLeave={() => setPointerInside(false)}
      className={`relative flex flex-col bg-card/90 backdrop-blur-xl border-r border-border h-screen sticky top-0 sidebar-transition ${
        expanded ? 'w-60 min-w-60' : 'w-16 min-w-16'
      }`}
    >
      {/* Account profile */}
      <div
        title={expanded ? undefined : displayName}
        className={`h-20 flex-shrink-0 flex items-center border-b border-border px-4 ${expanded ? 'gap-3' : 'justify-center px-2'}`}
      >
        <AccountAvatar name={displayName} logoUrl={logoUrl} accountType={accountType} size={36} />
        {expanded && (
          <div className="min-w-0">
            <p className="truncate text-xs font-600 text-foreground">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">{roleLabels[accountType]}</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-2 px-2">
        {groups.map((group) => {
          const items = navItems.filter((i) => i.group === group);
          return (
            <div key={`group-${group}`} className="mb-3">
              {items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item);
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    title={expanded ? undefined : item.label}
                    className={`flex items-center gap-3 px-2 py-2 rounded-lg mb-0.5 text-sm font-medium transition-all duration-150 group relative ${
                      active
                        ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    } ${expanded ? '' : 'justify-center'}`}
                  >
                    <Icon size={18} className="flex-shrink-0" />
                    {expanded && <span className="truncate fade-in">{item.label}</span>}
                    {expanded && item.badge ? (
                      <span className="ml-auto bg-danger text-danger-foreground text-xs font-700 px-1.5 py-0.5 rounded-full min-w-5 text-center leading-none">
                        {item.badge}
                      </span>
                    ) : null}
                    {!expanded && item.badge ? (
                      <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-danger rounded-full" />
                    ) : null}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-border p-2">
        <div className="relative" ref={controlRef}>
          <button
            type="button"
            aria-label="Sidebar Control"
            aria-expanded={controlOpen}
            aria-haspopup="menu"
            onClick={() => setControlOpen((open) => !open)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Sidebar Control"
          >
            <PanelLeft size={18} />
          </button>
          {controlOpen && (
            <div role="menu" aria-label="Sidebar Control" className="absolute bottom-full left-0 mb-2 w-56 rounded-lg border border-border bg-card p-2 shadow-xl">
              <p className="px-2 py-2 text-sm font-600 text-foreground">Sidebar Control</p>
              <div className="my-1 border-t border-border" />
              {([
                ['expanded', 'Expanded'],
                ['collapsed', 'Collapsed'],
                ['hover', 'Expand on hover'],
              ] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  role="menuitemradio"
                  aria-checked={sidebarMode === mode}
                  onClick={() => {
                    setSidebarMode(mode);
                    setControlOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <span>{label}</span>
                  {sidebarMode === mode && <Check size={16} className="text-primary" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
