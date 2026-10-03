'use client';

import React, { useState, useEffect } from 'react';
import SplashScreen from '@/components/SplashScreen';
import OfflineScreen from '@/components/OfflineScreen';

export default function SplashWrapper({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Detect initial online/offline status
    const offline = !navigator.onLine;
    setIsOffline(offline);

    if (!offline) {
      // Only show splash when online
      const hasSeenSplash = sessionStorage.getItem('vex_splash_shown');
      if (!hasSeenSplash) {
        setShowSplash(true);
      }
    }

    setMounted(true);

    // Listen for connectivity changes
    const handleOnline = () => {
      setIsOffline(false);
      // Show splash when coming back online if not shown yet
      const hasSeenSplash = sessionStorage.getItem('vex_splash_shown');
      if (!hasSeenSplash) {
        setShowSplash(true);
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowSplash(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSplashComplete = () => {
    sessionStorage.setItem('vex_splash_shown', 'true');
    setShowSplash(false);
  };

  if (!mounted) return null;

  // Offline: show offline screen, block everything else
  if (isOffline) {
    return <OfflineScreen />;
  }

  // Online: show splash first (if needed), then children
  return (
    <>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      {!showSplash && children}
    </>
  );
}
