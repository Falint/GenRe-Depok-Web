'use server';
import { z } from 'zod';
import { isPortalMember } from '@/features/auth/permissions';
import { getProfile } from '@/features/auth/server';
import { canManageContent, requirePermission } from '@/features/auth/permissions';
import { createClient } from '@/lib/supabase/server';
import { PortalError, safeError, type Result } from '@/lib/errors';
import { readRows } from '@/features/portal/data';
import { mutate, checkWrite } from '@/features/portal/mutations';
import { parseInput, driveFileUrl, recordId } from '@/features/portal/validation';
import {
  mediaSchema,
  mediaInput,
  contentHistorySchema,
  type MediaResource,
  type MediaInput,
} from './schema';

export async function loadMedia(): Promise<Result<MediaResource[]>> {
  try {
    const profile = await getProfile();
    if (!profile || !isPortalMember(profile.level))
      throw new PortalError('Akses pengurus diperlukan.');
    return { ok: true, data: await readRows(await createClient(), 'media_resources', mediaSchema) };
  } catch (error) {
    return { ok: false, error: safeError(error, 'media:load') };
  }
}
export async function loadContentHistory(
  type: 'pengumuman' | 'media_resources',
  id: string,
): Promise<Result<z.infer<typeof contentHistorySchema>[]>> {
  try {
    const profile = await getProfile();
    requirePermission(!!profile && canManageContent(profile));
    const client = await createClient();
    const entityType = parseInput(z.enum(['pengumuman', 'media_resources']), type);
    const rows = await readRows(client, 'content_history', contentHistorySchema, '*', {
      entity_type: entityType,
      entity_id: parseInput(recordId, id),
    });
    return { ok: true, data: rows };
  } catch (error) {
    return { ok: false, error: safeError(error, 'content:history') };
  }
}
export async function saveMedia(id: string, version: number, input: MediaInput) {
  return mutate('media:save', async (client, profile) => {
    requirePermission(canManageContent(profile));
    const values = parseInput(mediaInput, input);
    const target = parseInput(recordId, id);
    const expected = parseInput(z.number().int().min(-1), version);
    let previous: string | null = null;
    if (expected !== -1) {
      const { data, error } = await client
        .from('media_resources')
        .select('url')
        .eq('id', target)
        .single();
      checkWrite(error);
      previous = data?.url || null;
    }
    if (expected === -1 || values.url !== previous) parseInput(driveFileUrl, values.url);
    checkWrite(
      (
        await client.rpc('save_portal_media', {
          target_id: target,
          expected_version: expected,
          input: values,
        })
      ).error,
    );
  });
}
export async function archiveMedia(id: string, version: number, archive: boolean) {
  return mutate('media:archive', async (client, profile) => {
    requirePermission(canManageContent(profile));
    checkWrite(
      (
        await client.rpc('archive_portal_media', {
          target_id: parseInput(recordId, id),
          expected_version: parseInput(z.number().int().nonnegative(), version),
          archive: parseInput(z.boolean(), archive),
        })
      ).error,
    );
  });
}
