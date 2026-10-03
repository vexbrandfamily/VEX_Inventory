import { useRef } from 'react';
import type { UserProfile } from '@/contexts/AuthContext';

interface AuthUser {
  id?: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}

interface AccountIdentity {
  userKey: string | null;
  displayName: string;
  logoUrl: string;
  email: string;
}

export function useStableAccountIdentity(profile: UserProfile | null, user: AuthUser | null): AccountIdentity {
  const identityRef = useRef<AccountIdentity>({
    userKey: null,
    displayName: 'Account',
    logoUrl: '',
    email: '',
  });
  const userKey = user?.id ?? user?.email ?? null;

  if (userKey && identityRef.current.userKey !== userKey) {
    identityRef.current = {
      userKey,
      displayName: (user?.user_metadata?.full_name as string) || user?.email || 'Account',
      logoUrl: (user?.user_metadata?.avatar_url as string) || '',
      email: user?.email || '',
    };
  }

  if (user?.id && profile?.id === user.id) {
    identityRef.current = {
      userKey,
      displayName: profile.full_name || (user.user_metadata?.full_name as string) || user.email || 'Account',
      logoUrl: profile.avatar_url || (user.user_metadata?.avatar_url as string) || '',
      email: user.email || profile.email || '',
    };
  }

  return identityRef.current;
}