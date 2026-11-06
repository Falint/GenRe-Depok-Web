import 'server-only';
import { hasSupabaseConfig } from '@/lib/supabase/config';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { profileSchema } from '@/features/portal/schema';
import { PortalError } from '@/lib/errors';

export const getProfile = cache(async () => {
  if (!hasSupabaseConfig()) return null;
  const client = await createClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error) {
    if (error.name === 'AuthSessionMissingError' || error.status === 401 || error.status === 403)
      return null;
    throw new PortalError('Sesi tidak dapat diverifikasi. Coba lagi.');
  }
  if (!user) return null;
  const { data, error: profileError } = await client
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  if (profileError)
    throw new PortalError('Profil pengurus tidak ditemukan atau tidak dapat diakses.');
  const parsed = profileSchema.safeParse(data);
  if (!parsed.success) throw new PortalError('Profil pengurus tidak valid. Hubungi administrator.');
  return parsed.data;
});

export async function requireProfile() {
  const profile = await getProfile();
  if (!profile) redirect('/login');
  return profile;
}
