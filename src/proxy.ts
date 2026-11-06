import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseConfig, hasSupabaseConfig } from '@/lib/supabase/config';
import { PORTAL_ROUTES } from '@/features/portal/routes';
import type { Database } from '@/lib/supabase/database.types';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (hasSupabaseConfig()) {
    const { url, key } = getSupabaseConfig();
    const client = createServerClient<Database>(url, key, {
      cookieOptions: { sameSite: 'lax', secure: url.startsWith('https:') },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(values) {
          values.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    // Validate and refresh before Server Components read the cookie; never trust getSession().
    const {
      data: { user },
      error,
    } = await client.auth.getUser();
    const protectedPath = Object.values(PORTAL_ROUTES).some(
      (path) => path === request.nextUrl.pathname,
    );
    if (
      !user &&
      protectedPath &&
      (!error ||
        error.name === 'AuthSessionMissingError' ||
        error.status === 401 ||
        error.status === 403)
    ) {
      const destination = new URL('/login', request.url);
      destination.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
      const redirect = NextResponse.redirect(destination);
      response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
      response = redirect;
    }
  }
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'] };
