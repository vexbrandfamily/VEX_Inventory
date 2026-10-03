'use client';

import React from 'react';

interface VexWordmarkProps {
  className?: string;
}

export default function VexWordmark({ className = '' }: VexWordmarkProps) {
  return (
    <div className={`mx-auto overflow-hidden ${className}`}>
      <img
        src="/assets/splash/vex-wordmark.png"
        alt="VEX"
        className="h-full w-full object-contain scale-[1.38] select-none"
        style={{ mixBlendMode: 'screen' }}
        draggable={false}
      />
    </div>
  );
}
