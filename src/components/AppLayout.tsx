'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import MobileBottomNav from '@/components/MobileBottomNav';
import ThemeShell from '@/components/ThemeShell';

interface AppLayoutProps {
  children: React.ReactNode;
  accountType: 'admin' | 'store' | 'business';
  pageTitle: string;
  pageSubtitle?: string;
  onBack?: () => void;
}

export default function AppLayout({ children, accountType, pageTitle, pageSubtitle, onBack }: AppLayoutProps) {
  const isMobileNav = accountType === 'store' || accountType === 'business' || accountType === 'admin';
  const pathname = usePathname();
  const homePath = accountType === 'admin' ? '/' : `/${accountType}-home`;
  const isHomePage = pathname === homePath;

  return (
    <ThemeShell>
      {/* Sidebar: always visible on md+; hidden on mobile for all account types */}
      <div className={isMobileNav ? 'hidden md:flex' : 'flex'}>
        <Sidebar accountType={accountType} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar title={pageTitle} subtitle={pageSubtitle} accountType={accountType} isHomePage={isHomePage} onBack={onBack} />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className={`max-w-screen-2xl mx-auto px-4 lg:px-6 xl:px-8 2xl:px-10 py-5 ${isMobileNav && isHomePage ? 'pb-20 md:pb-5' : ''}`}>
            {children}
          </div>
        </main>
      </div>

      {isMobileNav && isHomePage && (
        <div className="md:hidden">
          <MobileBottomNav accountType={accountType} />
        </div>
      )}
    </ThemeShell>
  );
}