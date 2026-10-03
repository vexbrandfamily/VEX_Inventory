
'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  ACCOUNT_SUSPENDED_MESSAGE,
  ACCOUNT_SUSPENDED_QUERY,
  ensureAdminProfile,
  isAccountSuspended,
  resolveAccountType,
  type AccountType,
} from '@/lib/auth/resolveAccountType';

export type { AccountType };

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  account_type: AccountType;
  is_active?: boolean;
}

interface AuthContextValue {
  user: any;
  session: any;
  profile: UserProfile | null;
  accountType: AccountType | null;
  loading: boolean;
  signUp: (email: string, password: string, metadata?: any) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  getCurrentUser: () => Promise<any>;
  isEmailVerified: () => boolean;
  getUserProfile: () => Promise<UserProfile | null>;
  refreshProfile: () => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const loadProfile = useCallback(async (userId: string, authUser?: any) => {
    const [{ data }, accountType] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('id', userId).maybeSingle(),
      resolveAccountType(supabase, authUser),
    ]);

    const email = authUser?.email ?? data?.email ?? '';
    let accountName = data?.full_name || authUser?.user_metadata?.full_name || email;
    let logoUrl = data?.avatar_url || authUser?.user_metadata?.avatar_url || '';

    if (email) {
      const { data: account } = await supabase
        .from('accounts')
        .select('name, logo_url, account_type')
        .eq('email', email)
        .maybeSingle();
      if (account) {
        accountName = account.name || accountName;
        logoUrl = account.logo_url || logoUrl;
      }
    }

    const nextProfile: UserProfile = {
      id: userId,
      email,
      full_name: accountName || '',
      avatar_url: logoUrl || '',
      account_type: accountType,
      is_active: data?.is_active ?? true,
    };

    if (accountType === 'admin' && data?.account_type !== 'admin') {
      await ensureAdminProfile(supabase, authUser ?? { id: userId, email }, {
        full_name: accountName,
        avatar_url: logoUrl,
      });
    }

    setProfile(nextProfile);
    return nextProfile;
  }, [supabase]);

  const rejectIfSuspended = useCallback(
    async (authUser: any) => {
      const suspended = await isAccountSuspended(supabase, authUser);
      if (!suspended) return false;
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setProfile(null);
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        if (path !== '/login' && path !== '/register') {
          window.location.replace(`/login?error=${ACCOUNT_SUSPENDED_QUERY}`);
        }
      }
      return true;
    },
    [supabase]
  );

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (initialSession?.user?.id && (await rejectIfSuspended(initialSession.user))) {
        setLoading(false);
        return;
      }
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession?.user?.id) {
        await loadProfile(initialSession.user.id, initialSession.user);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void (async () => {
        if (nextSession?.user?.id && (await rejectIfSuspended(nextSession.user))) {
          setLoading(false);
          return;
        }
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        if (nextSession?.user?.id) {
          await loadProfile(nextSession.user.id, nextSession.user);
        } else {
          setProfile(null);
        }
        setLoading(false);
      })();
    });

    return () => subscription.unsubscribe();
  }, [loadProfile, rejectIfSuspended, supabase.auth]);

  const signUp = async (email: string, password: string, metadata: any = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: metadata?.fullName || '',
          avatar_url: metadata?.avatarUrl || '',
          account_type: metadata?.accountType || 'admin',
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
    if (error) throw error;
    return data;
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;

    const suspended = await isAccountSuspended(supabase, data.user);
    if (suspended) {
      await supabase.auth.signOut();
      throw new Error(ACCOUNT_SUSPENDED_MESSAGE);
    }

    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
  };

  const getCurrentUser = async () => {
    const { data: { user: currentUser }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return currentUser;
  };

  const isEmailVerified = () => {
    return user?.email_confirmed_at !== null;
  };

  const getUserProfile = async () => {
    if (!user) return null;
    return loadProfile(user.id, user);
  };

  const refreshProfile = async () => {
    if (!user) return null;
    return loadProfile(user.id, user);
  };

  const accountType = (profile?.account_type ?? null) as AccountType | null;

  const value: AuthContextValue = {
    user,
    session,
    profile,
    accountType,
    loading,
    signUp,
    signIn,
    signOut,
    getCurrentUser,
    isEmailVerified,
    getUserProfile,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
