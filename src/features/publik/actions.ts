'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import {
  canManageContent,
  canViewParticipants,
  requirePermission,
} from '@/features/auth/permissions';
import { requireProfile } from '@/features/auth/server';
import { createClient } from '@/lib/supabase/server';
import { mutate } from '@/features/portal/mutations';
import { readRows } from '@/features/portal/data';
import { parseInput, recordId } from '@/features/portal/validation';
import { PortalError, safeError, type Result } from '@/lib/errors';
import { publicContentInput, type PublicContentInput } from './schema';
import {
  registrationInput,
  participantSchema,
  type Participant,
  type RegistrationInput,
} from './registrationSchema';

export async function registerForEvent(
  requestId: string,
  eventId: string,
  input: RegistrationInput,
): Promise<Result<string>> {
  try {
    const { data, error } = await (
      await createClient()
    ).rpc('register_portal_event', {
      request_id: parseInput(recordId, requestId),
      event_id: parseInput(recordId, eventId),
      input: parseInput(registrationInput, input),
    });
    if (error)
      throw new PortalError(
        error.code === '23505'
          ? 'Data peserta yang sama sudah terdaftar pada kegiatan ini.'
          : error.code === 'P0001'
            ? 'Pendaftaran sudah ditutup. Muat ulang halaman kegiatan.'
            : error.code === '22023'
              ? 'Data pendaftaran tidak cocok. Pertahankan isian saat mencoba ulang.'
              : 'Pendaftaran belum dapat disimpan. Coba lagi dengan form dan isian yang sama.',
      );
    return { ok: true, data: z.uuid().parse(data) };
  } catch (error) {
    return { ok: false, error: safeError(error, 'event:register') };
  }
}

export async function loadRegistrationEvents(): Promise<Result<{ id: string; judul: string }[]>> {
  try {
    requirePermission(canViewParticipants(await requireProfile()));
    const items = await readRows(
      await createClient(),
      'public_content',
      z.object({ id: z.uuid(), judul: z.string() }),
      'id,judul',
      { jenis: 'agenda' },
    );
    return { ok: true, data: items };
  } catch (error) {
    return { ok: false, error: safeError(error, 'event:list') };
  }
}

export async function loadEventParticipants(eventId: string): Promise<Result<Participant[]>> {
  try {
    requirePermission(canViewParticipants(await requireProfile()));
    const id = parseInput(recordId, eventId);
    const items = await readRows(
      await createClient(),
      'event_registrations',
      participantSchema,
      'id,agenda_id,nama,instansi,unsur,created_at',
      { agenda_id: id },
    );
    return { ok: true, data: items };
  } catch (error) {
    return { ok: false, error: safeError(error, 'event:participants') };
  }
}

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
