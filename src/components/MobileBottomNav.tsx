'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Package, Layers, ArrowDownToLine, ArrowUpFromLine, ShoppingCart, ShoppingBag, Settings, X, TrendingDown, Boxes, PackageCheck, PackageMinus, BarChart3, LayoutDashboard, Users, CreditCard, BarChart2, MessageSquare } from 'lucide-react';

interface MobileBottomNavProps {
  accountType: 'store' | 'business' | 'admin';
}

/* ─── Store Classifications ─── */
const storeClassifications = [
  { id: 'inventory', label: 'Inventory', icon: Boxes },
  { id: 'movements', label: 'Adjustments', icon: ArrowDownToLine },
  { id: 'home', label: 'Home', icon: Home, href: '/store-home' },
  { id: 'system', label: 'System', icon: Settings },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
];

const storeClassificationItems: Record<string, { label: string; icon: React.ElementType; href: string }[]> = {
  inventory: [
    { label: 'Items', icon: Package, href: '/store-items' },
    { label: 'Receipts', icon: PackageCheck, href: '/store-receipts' },
    { label: 'Issues', icon: PackageMinus, href: '/store-issues' },
    { label: 'Stock Level', icon: Layers, href: '/store-stock' },
  ],
  movements: [
    { label: 'Adjustments In', icon: ArrowDownToLine, href: '/store-adjustments-in' },
    { label: 'Adjustments Out', icon: ArrowUpFromLine, href: '/store-adjustments-out' },
  ],
  system: [
    { label: 'Settings', icon: Settings, href: '/store-settings' },
  ],
  reports: [
    { label: 'Report Analysis', icon: BarChart3, href: '/store-reports' },
  ],
};

/* ─── Business Classifications ─── */
const businessClassifications = [
  { id: 'inventory', label: 'Inventory', icon: Boxes },
  { id: 'sales', label: 'Sales', icon: ShoppingCart },
  { id: 'home', label: 'Home', icon: Home, href: '/business-home' },
  { id: 'movements', label: 'Adjustments', icon: ArrowDownToLine },
  { id: 'system', label: 'System', icon: Settings },
];

const businessClassificationItems: Record<string, { label: string; icon: React.ElementType; href: string }[]> = {
  inventory: [
    { label: 'Products', icon: Package, href: '/business-products' },
    { label: 'Purchases', icon: ShoppingBag, href: '/business-purchases' },
    { label: 'Stock Level', icon: Layers, href: '/business-stock' },
  ],
  sales: [
    { label: 'Point of Sale', icon: ShoppingCart, href: '/business-pos' },
    { label: 'Sales', icon: TrendingDown, href: '/business-sales' },
  ],
  movements: [
    { label: 'Adjustments In', icon: ArrowDownToLine, href: '/business-adjustments-in' },
    { label: 'Adjustments Out', icon: ArrowUpFromLine, href: '/business-adjustments-out' },
  ],
  system: [
    { label: 'Settings', icon: Settings, href: '/business-settings' },
  ],
};

/* ─── Admin Classifications ─── */
const adminClassifications = [
  { id: 'accounts', label: 'Accounts', icon: Users },
  { id: 'management', label: 'Manage', icon: CreditCard },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/' },
  { id: 'sms', label: 'SMS', icon: MessageSquare },
  { id: 'system', label: 'System', icon: Settings },
];

const adminClassificationItems: Record<string, { label: string; icon: React.ElementType; href: string }[]> = {
  accounts: [
    { label: 'Accounts', icon: Users, href: '/admin-accounts' },
  ],
  management: [
    { label: 'Subscriptions', icon: CreditCard, href: '/admin-subscriptions' },
    { label: 'Usage', icon: BarChart2, href: '/admin-usage' },
  ],
  sms: [
    { label: 'SMS', icon: MessageSquare, href: '/admin-sms' },
  ],
  system: [
    { label: 'Settings', icon: Settings, href: '/admin-settings' },
  ],
};

/* ─── Movement sub-items ─── */
const movementsDetail = {
  store: {
    stockIn: {
      label: 'Adjustments In',
      icon: ArrowDownToLine,
      items: [
        { label: 'Adjustments In', icon: ArrowDownToLine, href: '/store-adjustments-in' },
      ],
    },
    stockOut: {
      label: 'Adjustments Out',
      icon: ArrowUpFromLine,
      items: [
        { label: 'Adjustments Out', icon: ArrowUpFromLine, href: '/store-adjustments-out' },
      ],
    },
  },
  business: {
    stockIn: {
      label: 'Adjustments In',
      icon: ArrowDownToLine,
      items: [
        { label: 'Adjustments In', icon: ArrowDownToLine, href: '/business-adjustments-in' },
      ],
    },
    stockOut: {
      label: 'Adjustments Out',
      icon: ArrowUpFromLine,
      items: [
        { label: 'Adjustments Out', icon: ArrowUpFromLine, href: '/business-adjustments-out' },
      ],
    },
  },
};

const classificationColors: Record<string, string> = {
  inventory: 'text-primary',
  sales: 'text-warning',
  movements: 'text-accent',
  system: 'text-muted-foreground',
  reports: 'text-primary',
  accounts: 'text-primary',
  management: 'text-accent',
  sms: 'text-warning',
  dashboard: 'text-primary',
};

const classificationBg: Record<string, string> = {
  inventory: 'bg-primary/10',
  sales: 'bg-warning/10',
  movements: 'bg-accent/10',
  system: 'bg-muted',
  reports: 'bg-primary/10',
  accounts: 'bg-primary/10',
  management: 'bg-accent/10',
  sms: 'bg-warning/10',
  dashboard: 'bg-primary/10',
};

export default function MobileBottomNav({ accountType }: MobileBottomNavProps) {
  const [activeClassification, setActiveClassification] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  const classifications =
    accountType === 'store'
      ? storeClassifications
      : accountType === 'business'
      ? businessClassifications
      : adminClassifications;

  const classificationItems =
    accountType === 'store'
      ? storeClassificationItems
      : accountType === 'business'
      ? businessClassificationItems
      : adminClassificationItems;

  const movDetail = accountType !== 'admin' ? movementsDetail[accountType as 'store' | 'business'] : null;

  const handleClassificationClick = (id: string, href?: string) => {
    if (href) {
      setActiveClassification(null);
      router.push(href);
      return;
    }
    // If classification has only one module, navigate directly
    const items = classificationItems[id] ?? [];
    if (items.length === 1) {
      setActiveClassification(null);
      router.push(items[0].href);
      return;
    }
    setActiveClassification(id === activeClassification ? null : id);
  };

  const isClassificationActive = (id: string, href?: string) => {
    if (href) {
      const path = href.split('?')[0];
      return pathname === path || pathname.startsWith(path);
    }
    const items = classificationItems[id] ?? [];
    return items.some((item) => pathname.startsWith(item.href.split('?')[0]));
  };

  return (
    <>
      {/* Classification Detail Panel */}
      {activeClassification && (
        <div
          className="fixed inset-x-0 top-0 z-40 flex flex-col bg-card/95 backdrop-blur-xl border-t border-border shadow-2xl overflow-hidden"
          style={{ bottom: '64px' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2">
              {(() => {
                const cls = classifications.find((c) => c.id === activeClassification);
                const CIcon = cls?.icon;
                return (
                  <>
                    {CIcon && (
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${classificationBg[activeClassification] ?? 'bg-muted'}`}>
                        <CIcon size={18} className={classificationColors[activeClassification] ?? 'text-foreground'} />
                      </div>
                    )}
                    <span className="font-700 text-foreground text-base capitalize">
                      {cls?.label}
                    </span>
                  </>
                );
              })()}
            </div>
            <button
              onClick={() => setActiveClassification(null)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content — scrollable, fills remaining space from top */}
          <div className="flex-1 overflow-y-auto px-4 pt-6 pb-4 flex flex-col items-center justify-start">
            {/* Movements special layout */}
            {activeClassification === 'movements' && movDetail ? (
              <div className="w-full space-y-6">
                {/* Stock In section */}
                <div>
                  <div className="flex flex-col items-center gap-3 w-full">
                    {movDetail.stockIn.items.map((item) => {
                      const ItemIcon = item.icon;
                      const active = pathname.startsWith(item.href.split('?')[0]);
                      return (
                        <Link
                          key={item.label}
                          href={item.href}
                          onClick={() => setActiveClassification(null)}
                          className={`flex flex-col items-center gap-3 p-5 rounded-xl border transition-all w-48 ${
                            active
                              ? 'bg-success/10 border-success/30 text-success' :'bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
                        >
                          <ItemIcon size={32} />
                          <span className="text-sm font-600 text-center leading-tight">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
                {/* Stock Out section */}
                <div>
                  <div className="flex flex-col items-center gap-3 w-full">
                    {movDetail.stockOut.items.map((item) => {
                      const ItemIcon = item.icon;
                      const active = pathname.startsWith(item.href.split('?')[0]);
                      return (
                        <Link
                          key={item.label}
                          href={item.href}
                          onClick={() => setActiveClassification(null)}
                          className={`flex flex-col items-center gap-3 p-5 rounded-xl border transition-all w-48 ${
                            active
                              ? 'bg-danger/10 border-danger/30 text-danger' :'bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
                        >
                          <ItemIcon size={32} />
                          <span className="text-sm font-600 text-center leading-tight">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* Regular classification items — centered, vertically arranged */
              <div className="flex flex-col items-center gap-4 w-full">
                {(classificationItems[activeClassification] ?? []).map((item) => {
                  const ItemIcon = item.icon;
                  const path = item.href.split('?')[0];
                  const active = pathname === path || pathname.startsWith(path);
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setActiveClassification(null)}
                      className={`flex flex-col items-center gap-3 p-5 rounded-xl border transition-all w-48 ${
                        active
                          ? `${classificationBg[activeClassification] ?? 'bg-muted'} border-transparent ${classificationColors[activeClassification] ?? 'text-foreground'}`
                          : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <ItemIcon size={32} />
                      <span className="text-sm font-600 text-center leading-tight">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}

          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-t border-border h-16 flex items-stretch">
        {classifications.map((cls) => {
          const CIcon = cls.icon;
          const isHomeOrDash = cls.id === 'home' || cls.id === 'dashboard';
          const isActive = activeClassification === cls.id || isClassificationActive(cls.id, (cls as any).href);
          const isOpen = activeClassification === cls.id;

          return (
            <button
              key={cls.id}
              onClick={() => handleClassificationClick(cls.id, (cls as any).href)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 px-1 transition-all relative ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {isHomeOrDash ? (
                <div className={`w-12 h-12 flex flex-col items-center justify-center rounded-full shadow-md transition-all -mt-4 border-2 ${
                  isActive ? 'bg-primary border-primary text-primary-foreground' : 'bg-card border-border text-muted-foreground'
                }`}>
                  <CIcon size={22} />
                </div>
              ) : (
                <div className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${isOpen ? 'bg-primary/10' : ''}`}>
                  <CIcon size={20} />
                </div>
              )}
              <span className={`font-600 leading-none ${isHomeOrDash ? 'text-[9px] mt-1' : 'text-[10px]'}`}>{cls.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
