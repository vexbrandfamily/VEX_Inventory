import type { SupabaseClient } from '@supabase/supabase-js';

export type ManagedAccountInput = {
  name: string;
  email: string;
  contacts: string;
  password: string;
  account_type: 'store' | 'business';
  country: string;
  town: string;
  country_code: string;
  currency_code: string;
  logo_url?: string;
};

export async function createManagedAccount(supabase: SupabaseClient, input: ManagedAccountInput) {
  const { data, error } = await supabase.functions.invoke<{ success: boolean; error?: string }>(
    'create-user',
    { body: input }
  );

  if (error) {
    let message = error.message;
    if (error.context instanceof Response) {
      const body = await error.context.json().catch(() => null);
      if (typeof body?.error === 'string') message = body.error;
    }
    throw new Error(message);
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Account creation failed');
  }
}
