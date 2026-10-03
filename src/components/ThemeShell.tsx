'use client';

import React from 'react';

export default function ThemeShell({ children }: { children: React.ReactNode }) {
  return <div className="flex h-screen overflow-hidden bg-background">{children}</div>;
}
