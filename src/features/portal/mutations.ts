import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/features/auth/server';
import { PortalError, safeError, type Result } from '@/lib/errors';
import type { Profile } from './schema';

export async function mutate(
  operation: string,
  work: (client: SupabaseClient<Database>, profile: Profile) => Promise<void>,
): Promise<Result> {
  try {
    const profile = await getProfile();
    if (!profile) throw new PortalError('Sesi berakhir. Silakan masuk kembali.');
    await work(await createClient(), profile);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: safeError(error, operation) };
  }
}

export function checkWrite(error: { code?: string } | null) {
  if (error) {
    console.error('[portal:database]', { code: error.code });
    throw new PortalError(
      error.code === '40001'
        ? 'Data berubah. Muat ulang sebelum mencoba lagi.'
        : error.code === '42501'
          ? 'Anda tidak memiliki izin untuk perubahan ini.'
          : 'Perubahan gagal disimpan. Muat ulang sebelum mencoba lagi.',
    );
  }
}
