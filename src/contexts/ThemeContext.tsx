'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DEFAULT_COLOR_MODE, getColorModeStorageKey, type ColorMode } from '@/lib/themes';

interface ThemeContextValue {
  mode: ColorMode;
  setMode: (mode: ColorMode) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyAppearance(mode: ColorMode) {
  const root = document.documentElement;
  root.classList.toggle('dark', mode === 'dark');
  root.style.colorScheme = mode;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [mode, setModeState] = useState<ColorMode>(DEFAULT_COLOR_MODE);
  const [activeStorageKey, setActiveStorageKey] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;

    const storageKey = getColorModeStorageKey(user?.id ?? null);
    let nextMode = DEFAULT_COLOR_MODE;
    try {
      const storedMode = localStorage.getItem(storageKey);
      if (storedMode === 'dark' || storedMode === 'light') nextMode = storedMode;
    } catch {
      nextMode = DEFAULT_COLOR_MODE;
    }
    setModeState(nextMode);
    setActiveStorageKey(storageKey);
    applyAppearance(nextMode);
  }, [loading, user?.id]);

  useEffect(() => {
    if (loading || activeStorageKey !== getColorModeStorageKey(user?.id ?? null)) return;

    applyAppearance(mode);
    try {
      localStorage.setItem(activeStorageKey, mode);
    } catch {
      /* ignore quota / private mode */
    }
  }, [activeStorageKey, loading, mode, user?.id]);

  const setMode = useCallback((next: ColorMode) => {
    setModeState(next);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      setMode,
      toggleMode,
    }),
    [mode, setMode, toggleMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
