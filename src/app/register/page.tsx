'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import SplashSceneBackground from '@/components/SplashSceneBackground';
import { LogIn } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      <SplashSceneBackground />
      <div className="relative z-10 w-full max-w-md">
        <div className="flex justify-center mb-8">
          <AppLogo size={176} className="rounded-2xl shadow-2xl shadow-black/40" />
        </div>
        <div className="bg-card/95 backdrop-blur-md border border-white/15 rounded-2xl p-6 shadow-2xl shadow-black/40 text-center space-y-4">
          <h2 className="text-base font-700 text-foreground">Accounts are admin-managed</h2>
          <p className="text-xs text-muted-foreground">
            Store and business accounts can only be created by an administrator in the Accounts section.
            Sign in with the credentials assigned to you.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-600 text-sm py-2.5 px-4 rounded-lg hover:bg-primary/90 transition-colors"
          >
            <LogIn size={15} />
            Go to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
