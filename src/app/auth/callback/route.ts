import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';
import { ACCOUNT_SUSPENDED_QUERY, isAccountSuspended } from '@/lib/auth/resolveAccountType';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && (await isAccountSuspended(supabase, user))) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?error=${ACCOUNT_SUSPENDED_QUERY}`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
