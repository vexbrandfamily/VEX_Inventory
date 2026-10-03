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

type ManagedAccountResponse = { success: boolean; error?: string };

async function invokeAccountFunction(
  supabase: SupabaseClient,
  body: ManagedAccountInput | { action: 'delete_account'; account_id: string }
) {
  const { data, error } = await supabase.functions.invoke<ManagedAccountResponse>('create-user', {
    body,
  });

  if (error) {
    let message = error.message;
    if (error.context instanceof Response) {
      const body = await error.context.json().catch(() => null);
      if (typeof body?.error === 'string') message = body.error;
    }
    if (/a user with this email address has already been registered/i.test(message)) {
      throw new Error(
        'The deployed create-user function is outdated and is rejecting this email before checking the accounts table. Deploy the latest supabase/functions/create-user/index.ts, then reload the app.'
      );
    }
    throw new Error(message);
  }

  if (!data?.success) throw new Error(data?.error || 'Account operation failed');
}

export async function createManagedAccount(supabase: SupabaseClient, input: ManagedAccountInput) {
  const email = input.email.trim();
  const escapedEmailPattern = email.replace(/[\\%_]/g, '\\$&');
  const { data: existingAccount, error: accountLookupError } = await supabase
    .from('accounts')
    .select('id')
    .ilike('email', escapedEmailPattern)
    .maybeSingle();

  if (accountLookupError) {
    throw new Error(`Could not check existing accounts: ${accountLookupError.message}`);
  }
  if (existingAccount) {
    throw new Error('An account with this email address already exists');
  }

  await invokeAccountFunction(supabase, { ...input, email });
}

export async function deleteManagedAccount(supabase: SupabaseClient, accountId: string) {
  await invokeAccountFunction(supabase, { action: 'delete_account', account_id: accountId });
}
