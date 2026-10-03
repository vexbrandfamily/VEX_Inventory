'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';

export function useAccountCurrency() {
  const { user } = useAuth();
  const [currencyCode, setCurrencyCode] = useState('USD');
  const supabase = createClient();

  const loadCurrency = useCallback(async () => {
    if (!user?.id && !user?.email) return 'USD';

    let query = supabase
      .from('accounts')
      .select('currency_code')
      .eq('user_id', user?.id ?? '')
      .maybeSingle();
    let { data } = await query;

    if (!data && user?.email) {
      const result = await supabase
        .from('accounts')
        .select('currency_code')
        .eq('email', user.email)
        .maybeSingle();
      data = result.data;
    }

    const nextCurrency = data?.currency_code || 'USD';
    setCurrencyCode(nextCurrency);
    return nextCurrency;
  }, [supabase, user?.email, user?.id]);

  useEffect(() => {
    void loadCurrency();
  }, [loadCurrency]);

  return { currencyCode, reloadCurrency: loadCurrency };
}