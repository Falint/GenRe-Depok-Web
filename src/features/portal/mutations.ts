import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import { createClient } from '@/lib/supabase/server';
import { isPortalMember } from '@/features/auth/permissions';
import { getProfile } from '@/features/auth/server';
import { PortalError, safeError, type Result } from '@/lib/errors';
import type { Profile } from './schema';

export async function mutate(
  operation: string,
  work: (client: SupabaseClient<Database>, profile: Profile) => Promise<void>,
): Promise<Result> {
  try {
    const profile = await getProfile();
    if (!profile || !isPortalMember(profile.level))
      throw new PortalError('Sesi berakhir. Silakan masuk kembali.');
    await work(await createClient(), profile);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: safeError(error, operation) };
  }
}

export { checkWrite } from '@/lib/errors';
