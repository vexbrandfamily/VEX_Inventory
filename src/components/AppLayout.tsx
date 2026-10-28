'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import MobileBottomNav, { getMobileClassificationForPath } from '@/components/MobileBottomNav';
import ThemeShell from '@/components/ThemeShell';
import { useAuth } from '@/contexts/AuthContext';

interface AppLayoutProps {
  children: React.ReactNode;
  accountType: 'admin' | 'store' | 'business';
  pageTitle: string;
  pageSubtitle?: string;
  onBack?: () => void;
  hideMobileNav?: boolean;
}

export default function AppLayout({ children, accountType, pageTitle, pageSubtitle, onBack, hideMobileNav = false }: AppLayoutProps) {
  const isMobileNav = accountType === 'store' || accountType === 'business' || accountType === 'admin';
  const pathname = usePathname();
  const { profile } = useAuth();
  const isPosUser = profile?.is_pos_user ?? false;
  const homePath = accountType === 'admin' ? '/' : `/${accountType}-home`;
  const isHomePage = pathname === homePath;
  const mobileBackClassification = getMobileClassificationForPath(accountType, pathname, isPosUser);

  useEffect(() => {
    if (!isHomePage) return;

    const exitPromptStateKey = '__vexHomeExitPrompt';
    const currentState = window.history.state;
    const currentStateObject =
      currentState && typeof currentState === 'object' ? currentState : {};

    if (currentStateObject[exitPromptStateKey] !== true) {
      window.history.pushState(
        { ...currentStateObject, [exitPromptStateKey]: true },
        '',
        window.location.href,
      );
    }

    let ignoreNextPop = false;
    const handlePopState = (event: PopStateEvent) => {
      if (ignoreNextPop) {
        ignoreNextPop = false;
        return;
      }

      const destinationState =
        event.state && typeof event.state === 'object' ? event.state : {};
      if (destinationState[exitPromptStateKey] === true) return;

      if (window.confirm('Are you sure you want to exit VEX Inventory?')) {
        ignoreNextPop = true;
        window.history.back();
      } else {
        ignoreNextPop = true;
        window.history.forward();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isHomePage]);

  return (
    <ThemeShell>
      {/* Sidebar: always visible on md+; hidden on mobile for all account types */}
      <div className={isMobileNav ? 'hidden md:flex' : 'flex'}>
        <Sidebar accountType={accountType} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar
          title={pageTitle}
          subtitle={pageSubtitle}
          accountType={accountType}
          isHomePage={isHomePage}
          onBack={onBack}
          mobileBackClassification={mobileBackClassification ?? undefined}
        />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className={`max-w-screen-2xl mx-auto px-4 lg:px-6 xl:px-8 2xl:px-10 py-5 ${isMobileNav ? 'pb-20 md:pb-5' : ''}`}>
            {children}
          </div>
        </main>
      </div>

      {isMobileNav && !hideMobileNav && (
        <div className="md:hidden">
          <MobileBottomNav accountType={accountType} isPosUser={isPosUser} />
        </div>
      )}
    </ThemeShell>
  );
}