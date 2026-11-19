import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getProfile } from '@/features/auth/server';
import { createClient } from '@/lib/supabase/server';
import { decryptDriveSecret, encryptDriveSecret } from '@/features/administrasi/driveCrypto';
import { DRIVE_SCOPE, googleConfig, googleToken } from '@/features/administrasi/drive';
import { checkWrite } from '@/features/portal/mutations';

export async function GET(request: Request) {
  const store = await cookies();
  const saved = store.get('portal-drive-oauth')?.value;
  store.delete({ name: 'portal-drive-oauth', path: '/auth/google-drive/callback' });
  const config = googleConfig();
  const destination = new URL('/administrasi', config.origin);
  try {
    const profile = await getProfile();
    const url = new URL(request.url);
    if (profile?.level !== 'admin' || !saved || url.searchParams.has('error'))
      throw new Error('Rejected');
    const state = z
      .object({ state: z.string(), verifier: z.string(), userId: z.uuid(), expires: z.number() })
      .parse(JSON.parse(decryptDriveSecret(saved)));
    const code = url.searchParams.get('code');
    if (
      !code ||
      state.expires < Date.now() ||
      state.userId !== profile.id ||
      url.searchParams.get('state') !== state.state
    )
      throw new Error('Invalid OAuth state');
    const token = await googleToken({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.callback,
      code_verifier: state.verifier,
    });
    if (!token.refresh_token || (token.scope && !token.scope.split(' ').includes(DRIVE_SCOPE)))
      throw new Error('Missing offline permission');
    const { error } = await (
      await createClient()
    ).rpc('save_portal_drive_connection', { token_value: encryptDriveSecret(token.refresh_token) });
    checkWrite(error);
    destination.searchParams.set('drive', 'connected');
  } catch {
    destination.searchParams.set('drive', 'error');
  }
  return NextResponse.redirect(destination);
}
