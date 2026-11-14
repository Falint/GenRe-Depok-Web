import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseConfig } from '@/lib/supabase/config';

export async function GET(request: NextRequest) {
  const token_hash = request.nextUrl.searchParams.get('token_hash');
  const type = request.nextUrl.searchParams.get('type');
  let destination = '/verifikasi?error=1';
  if (hasSupabaseConfig() && token_hash && (type === 'email' || type === 'recovery')) {
    const client = await createClient();
    const { error } = await client.auth.verifyOtp({ token_hash, type });
    if (!error) {
      if (type === 'recovery') destination = '/reset-password';
      else {
        await client.auth.signOut({ scope: 'local' });
        destination = '/login?verified=1';
      }
    }
  }
  // Keep the browser origin: the server URL can use an internal hostname behind a proxy.
  const response = new NextResponse(null, { status: 303, headers: { Location: destination } });
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
