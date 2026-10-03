'use client';

import React from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import StoreTopIssuedItems from './StoreTopIssuedItems';

export default function StoreReportsPage() {
  const { profile } = useAuth();
  const accountName = profile?.full_name || 'Store Account';

  return (
    <AppLayout accountType="store" pageTitle="Report & Analysis" pageSubtitle={accountName}>
      <StoreTopIssuedItems />
    </AppLayout>
  );
}