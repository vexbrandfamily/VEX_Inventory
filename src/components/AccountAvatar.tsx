'use client';

import React from 'react';

interface AccountAvatarProps {
  name: string;
  logoUrl?: string | null;
  accountType?: 'admin' | 'store' | 'business';
  size?: number;
  className?: string;
}

function getInitials(name: string): string {
  const source = (name || 'U').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

const typeBg = {
  admin: 'bg-primary text-primary-foreground',
  store: 'bg-accent text-accent-foreground',
  business: 'bg-warning text-warning-foreground',
};

export default function AccountAvatar({
  name,
  logoUrl,
  accountType = 'admin',
  size = 28,
  className = '',
}: AccountAvatarProps) {
  const px = `${size}px`;

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        width={size}
        height={size}
        className={`rounded-md object-cover flex-shrink-0 ${className}`}
        style={{ width: px, height: px }}
      />
    );
  }

  if (accountType === 'admin') {
    return (
      <img
        src="/assets/images/app_logo.png"
        alt="VEX"
        width={size}
        height={size}
        className={`rounded-md object-contain flex-shrink-0 ${className}`}
        style={{ width: px, height: px }}
      />
    );
  }

  return (
    <div
      className={`rounded-md flex items-center justify-center font-bold flex-shrink-0 ${typeBg[accountType]} ${className}`}
      style={{ width: px, height: px, fontSize: Math.max(10, size * 0.36) }}
    >
      {getInitials(name)}
    </div>
  );
}
