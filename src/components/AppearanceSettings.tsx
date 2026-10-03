'use client';

import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export default function AppearanceSettings() {
  const { mode, setMode } = useTheme();

  return (
    <div className="space-y-5">
      <div className="bg-card/90 backdrop-blur-sm border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            {mode === 'dark' ? <Moon size={18} className="text-primary" /> : <Sun size={18} className="text-primary" />}
          </div>
          <div>
            <h3 className="font-700 text-foreground">Dark / Light Mode</h3>
            <p className="text-xs text-muted-foreground">Switch the interface between a light workspace and a dark one</p>
          </div>
        </div>
        <div className="flex gap-1 bg-muted p-1 rounded-xl w-full sm:w-fit">
          <button
            type="button"
            onClick={() => setMode('light')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === 'light' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sun size={14} />
            Light
          </button>
          <button
            type="button"
            onClick={() => setMode('dark')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === 'dark' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Moon size={14} />
            Dark
          </button>
        </div>
      </div>
    </div>
  );
}
