import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  // Do not crash the entire deployment if Vercel environment variables
  // have not yet been added to this environment. The protected pages also
  // perform their own auth check.
  if (!url || !anonKey) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  try {
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const path = request.nextUrl.pathname;
    const protectedPath =
      path.startsWith('/dashboard') ||
      path.startsWith('/vendors') ||
      path.startsWith('/bills');

    if (!user && protectedPath) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    if (user && (path === '/login' || path === '/signup')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  } catch (error) {
    // Never turn a transient Supabase/configuration error into a Vercel
    // MIDDLEWARE_INVOCATION_FAILED response. Protected pages still verify auth.
    console.error('Supabase middleware error:', error);
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/vendors/:path*', '/bills/:path*', '/login', '/signup'],
};
