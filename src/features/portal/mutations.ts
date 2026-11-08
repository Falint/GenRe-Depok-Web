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
        : error.code === '22023'
          ? 'Pengajuan tidak cocok atau pos tahun berjalan tidak tersedia. Periksa isian; gunakan form yang sama saat mengulang request gagal.'
          : error.code === 'PGRST202' || error.code === '42883'
            ? 'Fitur memerlukan pembaruan database. Hubungi administrator.'
            : error.code === '42501'
              ? 'Anda tidak memiliki izin untuk perubahan ini.'
              : 'Perubahan gagal disimpan. Coba lagi; untuk pengajuan, pertahankan form dan isian yang sama.',
    );
  }
}
