import { createClient as createAuthClient } from '@supabase/supabase-js';

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

export async function createManagedAccount(adminClient: any, input: ManagedAccountInput) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Supabase is not configured');
  }

  const isolated = createAuthClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data: signUpData, error: signUpError } = await isolated.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        full_name: input.name,
        account_type: input.account_type,
        avatar_url: input.logo_url || '',
      },
    },
  });

  if (signUpError) throw new Error(signUpError.message);
  const userId = signUpData.user?.id;
  if (!userId) {
    throw new Error(
      'Login was created but needs email confirmation. Confirm the user in Supabase Auth, or disable Confirm email.'
    );
  }

  const { error: profileError } = await adminClient.from('user_profiles').upsert(
    {
      id: userId,
      email: input.email,
      full_name: input.name,
      account_type: input.account_type,
      avatar_url: input.logo_url || '',
      is_active: true,
    },
    { onConflict: 'id' }
  );
  if (profileError) throw new Error(`Profile creation failed: ${profileError.message}`);

  const { error: accountError } = await adminClient.from('accounts').insert({
    user_id: userId,
    name: input.name,
    email: input.email,
    contacts: input.contacts || '',
    account_type: input.account_type,
    country: input.country || '',
    town: input.town.trim(),
    country_code: input.country_code || '',
    currency_code: input.currency_code || 'USD',
    logo_url: input.logo_url || '',
    status: 'active',
  });
  if (accountError) throw new Error(`Account creation failed: ${accountError.message}`);
}
