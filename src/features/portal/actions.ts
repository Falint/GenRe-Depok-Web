'use server';
import { getProfile } from '@/features/auth/server';
import { PortalError, safeError, type Result } from '@/lib/errors';
import type { PortalData } from './mapping';
import { loadPortalData } from './data';

export async function refreshPortal(): Promise<Result<PortalData>> {
  try {
    const profile = await getProfile();
    if (!profile) throw new PortalError('Sesi berakhir. Silakan masuk kembali.');
    return { ok: true, data: await loadPortalData(profile) };
  } catch (error) {
    return { ok: false, error: safeError(error, 'refresh') };
  }
}
