import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import {
  ACCOUNT_SUSPENDED_QUERY,
  homeForAccountType,
  isAccountSuspended,
  resolveAccountType,
} from '@/lib/auth/resolveAccountType';

function getProjectRef(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return url.match(/https:\/\/([^.]+)\./)?.[1] ?? '';
}

function injectTokenFromHeader(request: NextRequest): void {
  const token = request.headers.get('x-sb-token');
  if (!token) return;
  const hasCookie = request.cookies.getAll().some((c) => c.name.includes('auth-token'));
  if (hasCookie) return;
  request.cookies.set(`sb-${getProjectRef()}-auth-token`, token);
}

function pathRequiresType(pathname: string): 'admin' | 'store' | 'business' | null {
  if (pathname.startsWith('/store-')) return 'store';
  if (pathname.startsWith('/business-')) return 'business';
  if (pathname.startsWith('/admin-') || pathname === '/') return 'admin';
  return null;
}

export async function middleware(request: NextRequest) {
  injectTokenFromHeader(request);
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const isProtected =
    pathname === '/' ||
    pathname.startsWith('/store-') ||
    pathname.startsWith('/business-') ||
    pathname.startsWith('/admin-');

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user) {
    const suspended = await isAccountSuspended(supabase, user);
    if (suspended) {
      await supabase.auth.signOut();
      const alreadyOnLogin = pathname === '/login';
      const hasSuspendedQuery =
        request.nextUrl.searchParams.get('error') === ACCOUNT_SUSPENDED_QUERY;
      if (alreadyOnLogin && hasSuspendedQuery) {
        return supabaseResponse;
      }
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.search = '';
      url.searchParams.set('error', ACCOUNT_SUSPENDED_QUERY);
      const redirectResponse = NextResponse.redirect(url);
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value);
      });
      return redirectResponse;
    }
  }

  const accountType = user ? await resolveAccountType(supabase, user) : 'admin';

  if (user && (pathname === '/login' || pathname === '/register')) {
    const url = request.nextUrl.clone();
    url.pathname = homeForAccountType(accountType);
    return NextResponse.redirect(url);
  }

  if (user) {
    const required = pathRequiresType(pathname);
    if (required && required !== accountType) {
      const url = request.nextUrl.clone();
      url.pathname = homeForAccountType(accountType);
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
