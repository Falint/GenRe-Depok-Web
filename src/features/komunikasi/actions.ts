'use server';
import { z } from 'zod';
import { attendanceOpen } from '@/features/portal/datetime';
import { mutate, checkWrite } from '@/features/portal/mutations';
import {
  canManageContent,
  canRespondToTicket,
  requirePermission,
} from '@/features/auth/permissions';
import { TICKET_STATUS } from '@/features/portal/schema';
import { PortalError } from '@/lib/errors';
import {
  parseInput,
  pengumumanInput,
  recordId,
  replyInput,
  tiketInput,
  type PengumumanInput,
  type TiketInput,
} from '@/features/portal/validation';

export async function addTiket(input: TiketInput) {
  return mutate('tiket:create', async (client, profile) => {
    const { tujuan, deadline, ...values } = parseInput(tiketInput, input);
    const { error } = await client
      .from('tiket_info')
      .insert({
        ...values,
        deadline: deadline || null,
        target_bidang: tujuan,
        pemohon_id: profile.id,
        pemohon_nama: profile.nama_lengkap,
        divisi_asal: profile.kelompok,
      })
      .select('id')
      .single();
    checkWrite(error);
  });
}

export async function respondTiket(id: string, response: string) {
  return mutate('tiket:respond', async (client, profile) => {
    const input = parseInput(replyInput, { id, response });
    const { data: ticket, error: readError } = await client
      .from('tiket_info')
      .select('pemohon_id')
      .eq('id', input.id)
      .single();
    checkWrite(readError);
    if (!ticket) throw new PortalError('Tiket tidak ditemukan.');
    requirePermission(canRespondToTicket(profile, ticket.pemohon_id));
    const { error } = await client
      .from('tiket_info')
      .update({ status: TICKET_STATUS.COMPLETE, respons: input.response })
      .eq('id', input.id)
      .select('id')
      .single();
    checkWrite(error);
  });
}

export async function addPengumuman(input: PengumumanInput) {
  return savePengumuman(crypto.randomUUID(), -1, input);
}
export async function savePengumuman(id: string, version: number, input: PengumumanInput) {
  return mutate('pengumuman:save', async (client, profile) => {
    requirePermission(canManageContent(profile));
    const values = parseInput(pengumumanInput, input);
    const dates = [values.deadline_konfirmasi, values.mulai_at, values.selesai_at];
    if (
      dates.some(Boolean) &&
      !(
        dates.every(Boolean) &&
        Date.parse(dates[0]!) < Date.parse(dates[1]!) &&
        Date.parse(dates[1]!) < Date.parse(dates[2]!)
      )
    )
      throw new PortalError('Isi seluruh jadwal: deadline sebelum mulai, selesai sesudah mulai.');
    checkWrite(
      (
        await client.rpc('save_portal_pengumuman', {
          target_id: parseInput(recordId, id),
          expected_version: parseInput(z.number().int().min(-1), version),
          input: values,
        })
      ).error,
    );
  });
}
export async function cancelPengumuman(id: string, version: number, reason: string) {
  return mutate('pengumuman:cancel', async (client, profile) => {
    requirePermission(canManageContent(profile));
    checkWrite(
      (
        await client.rpc('cancel_portal_pengumuman', {
          target_id: parseInput(recordId, id),
          expected_version: parseInput(z.number().int().nonnegative(), version),
          reason: parseInput(z.string().trim().min(1).max(10000), reason),
        })
      ).error,
    );
  });
}
export async function setTicketDeadline(id: string, deadline: string | null) {
  return mutate('tiket:deadline', async (client, profile) => {
    const target = parseInput(recordId, id);
    const { data, error } = await client
      .from('tiket_info')
      .select('pemohon_id')
      .eq('id', target)
      .single();
    checkWrite(error);
    requirePermission(!!data && canRespondToTicket(profile, data.pemohon_id));
    checkWrite(
      (
        await client.rpc('set_tiket_deadline', {
          target_id: target,
          deadline_value: parseInput(z.iso.datetime().nullable(), deadline),
        })
      ).error,
    );
  });
}

export async function confirmRead(id: string) {
  return mutate('pengumuman:confirm', async (client, profile) => {
    const { data, error: readError } = await client
      .from('pengumuman')
      .select('*')
      .eq('id', parseInput(recordId, id))
      .single();
    checkWrite(readError);
    if (!data || !attendanceOpen(data)) throw new PortalError('Konfirmasi kegiatan sudah ditutup.');
    const { error } = await client
      .from('pengumuman_kehadiran')
      .upsert(
        { pengumuman_id: parseInput(recordId, id), user_id: profile.id },
        { onConflict: 'pengumuman_id,user_id', ignoreDuplicates: true },
      );
    checkWrite(error);
  });
}
