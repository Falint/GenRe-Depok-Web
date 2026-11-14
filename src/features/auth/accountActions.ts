'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getProfile } from './server';
import { isAdmin, requirePermission } from './permissions';
import { accessInput } from './validation';
import { profileSchema } from '@/features/portal/schema';
import { parseInput } from '@/features/portal/validation';
import { createClient } from '@/lib/supabase/server';
import { checkWrite, mutate } from '@/features/portal/mutations';
import { PortalError, safeError, type Result } from '@/lib/errors';

const accountSchema = profileSchema.extend({ email_confirmed: z.boolean() });
export type ManagedAccount = z.infer<typeof accountSchema>;
export async function listAccounts(
  search: string,
  page: number,
): Promise<Result<ManagedAccount[]>> {
  try {
    const profile = await getProfile();
    requirePermission(!!profile && isAdmin(profile.level));
    const { data, error } = await (
      await createClient()
    ).rpc('list_portal_accounts', {
      search_text: parseInput(z.string().trim().max(200), search),
      page_number: parseInput(z.number().int().min(0).max(100000), page),
    });
    checkWrite(error);
    return { ok: true, data: z.array(accountSchema).parse(data) };
  } catch (error) {
    return { ok: false, error: safeError(error, 'accounts:list') };
  }
}
export async function setAccountAccess(input: z.infer<typeof accessInput>) {
  return mutate('accounts:access', async (client, profile) => {
    requirePermission(isAdmin(profile.level));
    const { id, expected_version, ...values } = parseInput(accessInput, input);
    const { error } = await client.rpc('set_portal_account_access', {
      target_id: id,
      expected_version,
      input: values,
    });
    if (error?.code === '23505')
      throw new PortalError(
        'Divisi sudah memiliki Kadiv. Turunkan atau pindahkan Kadiv lama terlebih dahulu.',
      );
    checkWrite(error);
    revalidatePath('/', 'layout');
  });
}
