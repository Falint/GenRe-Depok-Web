'use server';
import { z } from 'zod';
import { getProfile } from '@/features/auth/server';
import { requirePermission } from '@/features/auth/permissions';
import { createClient } from '@/lib/supabase/server';
import { PortalError, safeError, type Result } from '@/lib/errors';
import { readRows } from '@/features/portal/data';
import { mutate, checkWrite } from '@/features/portal/mutations';
import { parseInput, recordId } from '@/features/portal/validation';
import {
  requestSchema,
  assignmentSchema,
  historySchema,
  divisionSchema,
  memberSchema,
  requestInput,
  type PanitiaInput,
  type PanitiaData,
} from './schema';

export async function loadPanitia(): Promise<Result<PanitiaData>> {
  try {
    if (!(await getProfile())) throw new PortalError('Silakan masuk kembali.');
    const client = await createClient();
    const [requests, assignments, history, divisions, members] = await Promise.all([
      readRows(client, 'panitia_requests', requestSchema),
      readRows(client, 'panitia_assignments', assignmentSchema),
      readRows(client, 'panitia_history', historySchema),
      readRows(client, 'divisi', divisionSchema),
      readRows(client, 'profiles', memberSchema, 'id,nama_lengkap,level,bidang_id,divisi_id'),
    ]);
    return { ok: true, data: { requests, assignments, history, divisions, members } };
  } catch (error) {
    return { ok: false, error: safeError(error, 'panitia:load') };
  }
}
export async function createRequest(id: string, input: PanitiaInput) {
  return mutate('panitia:create', async (client, profile) => {
    requirePermission(profile.level === 'kadiv' && !!profile.divisi_id);
    const values = parseInput(requestInput, input);
    if (Date.parse(values.deadline_respons) <= Date.now())
      throw new PortalError('Deadline respons harus di masa depan.');
    checkWrite(
      (
        await client.rpc('create_panitia_request', {
          request_id: parseInput(recordId, id),
          input: values,
        })
      ).error,
    );
  });
}
const decision = z
  .object({
    id: z.uuid(),
    version: z.number().int().nonnegative(),
    approve: z.boolean(),
    reason: z.string().trim().max(10000),
  })
  .strict()
  .refine((v) => v.approve || !!v.reason);
const assignment = z
  .object({
    id: z.uuid(),
    version: z.number().int().nonnegative(),
    members: z.array(z.uuid()).max(1000),
    reason: z.string().trim().min(1).max(10000),
  })
  .strict()
  .refine((v) => new Set(v.members).size === v.members.length);
async function requireTarget(
  client: Awaited<ReturnType<typeof createClient>>,
  profile: NonNullable<Awaited<ReturnType<typeof getProfile>>>,
  id: string,
) {
  const { data, error } = await client
    .from('panitia_requests')
    .select('divisi_tujuan_id')
    .eq('id', id)
    .single();
  checkWrite(error);
  requirePermission(
    profile.level === 'kadiv' &&
      !!profile.divisi_id &&
      profile.divisi_id === data?.divisi_tujuan_id,
  );
}
export async function decideRequest(input: z.infer<typeof decision>) {
  return mutate('panitia:decide', async (client, profile) => {
    const v = parseInput(decision, input);
    await requireTarget(client, profile, v.id);
    checkWrite(
      (
        await client.rpc('decide_panitia_request', {
          target_id: v.id,
          expected_version: v.version,
          approve: v.approve,
          reason: v.reason,
        })
      ).error,
    );
  });
}
export async function assignMembers(input: z.infer<typeof assignment>) {
  return mutate('panitia:assign', async (client, profile) => {
    const v = parseInput(assignment, input);
    await requireTarget(client, profile, v.id);
    checkWrite(
      (
        await client.rpc('set_panitia_assignments', {
          target_id: v.id,
          expected_version: v.version,
          member_ids: v.members,
          reason: v.reason,
        })
      ).error,
    );
  });
}
