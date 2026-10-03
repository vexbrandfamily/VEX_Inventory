export type AccountType = 'admin' | 'store' | 'business';

type AuthLikeUser = {
  id?: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
} | null | undefined;

/**
 * Store/Business only when Admin created the member in Accounts.
 * Users created in Supabase Authentication are Admin.
 */
export async function resolveAccountType(supabase: any, user: AuthLikeUser): Promise<AccountType> {
  const userId = user?.id;
  if (userId) {
    const { data: account } = await supabase
      .from('accounts')
      .select('account_type')
      .eq('user_id', userId)
      .maybeSingle();

    if (account?.account_type === 'store' || account?.account_type === 'business') {
      return account.account_type;
    }
  }

  const email = user?.email?.trim();
  if (email) {
    const { data: account } = await supabase
      .from('accounts')
      .select('account_type')
      .eq('email', email)
      .in('account_type', ['store', 'business'])
      .maybeSingle();

    if (account?.account_type === 'store' || account?.account_type === 'business') {
      return account.account_type;
    }
  }

  const meta = (user?.user_metadata?.account_type || user?.app_metadata?.account_type) as string | undefined;
  if (meta === 'store' || meta === 'business') {
    return meta;
  }

  return 'admin';
}

export async function isAccountSuspended(supabase: any, user: AuthLikeUser): Promise<boolean> {
  const userId = user?.id;
  if (userId) {
    const { data: account } = await supabase
      .from('accounts')
      .select('status')
      .eq('user_id', userId)
      .maybeSingle();
    if (account?.status === 'suspended') return true;

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_active, account_type')
      .eq('id', userId)
      .maybeSingle();
    if (profile && profile.account_type !== 'admin' && profile.is_active === false) {
      return true;
    }
  }

  const email = user?.email?.trim();
  if (email) {
    const { data: account } = await supabase
      .from('accounts')
      .select('status')
      .eq('email', email)
      .in('account_type', ['store', 'business'])
      .maybeSingle();
    if (account?.status === 'suspended') return true;
  }

  return false;
}

export const ACCOUNT_SUSPENDED_MESSAGE =
  'This account has been suspended. Contact your administrator.';
export const ACCOUNT_SUSPENDED_QUERY = 'suspended';

export function homeForAccountType(accountType: AccountType | string | null | undefined): string {
  if (accountType === 'store') return '/store-home';
  if (accountType === 'business') return '/business-home';
  return '/';
}

/**
 * The create-user Edge Function authorizes callers via user_profiles.account_type.
 * Auth-dashboard admins often have no profile row, which produces
 * "Only admins can create accounts". Persist an admin profile when the
 * signed-in user is a platform admin.
 */
export async function ensureAdminProfile(
  supabase: any,
  user: AuthLikeUser,
  extras?: { full_name?: string; avatar_url?: string }
): Promise<void> {
  const userId = user?.id;
  if (!userId) return;

  const accountType = await resolveAccountType(supabase, user);
  if (accountType !== 'admin') return;

  const { error } = await supabase.from('user_profiles').upsert(
    {
      id: userId,
      email: user?.email ?? '',
      full_name: extras?.full_name || (user?.user_metadata?.full_name as string) || '',
      avatar_url: extras?.avatar_url || (user?.user_metadata?.avatar_url as string) || '',
      account_type: 'admin',
      is_active: true,
    },
    { onConflict: 'id' }
  );

  if (error) {
    console.warn('Could not persist admin profile:', error.message);
  }
}
