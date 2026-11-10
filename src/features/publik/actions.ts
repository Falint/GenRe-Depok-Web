'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { canManageContent, requirePermission } from '@/features/auth/permissions';
import { mutate } from '@/features/portal/mutations';
import { parseInput, recordId } from '@/features/portal/validation';
import { PortalError } from '@/lib/errors';
import { publicContentInput, type PublicContentInput } from './schema';

export async function savePublicContent(id: string, version: number, input: PublicContentInput) {
  return mutate('public-content:save', async (client, profile) => {
    requirePermission(canManageContent(profile));
    const values = publicContentInput.safeParse(input);
    if (!values.success)
      throw new PortalError(
        values.error.issues.find((issue) => issue.code === 'custom')?.message ||
          'Data tidak valid. Periksa isian dan panjang teks.',
      );
    const { error } = await client.rpc('save_portal_public_content', {
      target_id: parseInput(recordId, id),
      expected_version: parseInput(z.number().int().min(-1), version),
      input: values.data,
    });
    if (error)
      throw new PortalError(
        error.code === '40001' || error.code === '23505'
          ? 'Data berubah atau sudah tersimpan. Muat ulang sebelum mencoba lagi.'
          : 'Konten gagal disimpan. Periksa isian atau hubungi administrator.',
      );
    revalidatePath('/konten-publik');
    revalidatePath('/publik', 'layout');
  });
}
