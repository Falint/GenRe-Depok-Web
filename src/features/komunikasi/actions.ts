'use server';
import { mutate, checkWrite } from '@/features/portal/mutations';
import {
  canApproveOrConfirm,
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
  return mutate('pengumuman:create', async (client, profile) => {
    requirePermission(canApproveOrConfirm(profile.level));
    const values = parseInput(pengumumanInput, input);
    const { error } = await client
      .from('pengumuman')
      .insert({ ...values, penulis_id: profile.id, penulis_nama: profile.nama_lengkap })
      .select('id')
      .single();
    checkWrite(error);
  });
}

export async function confirmRead(id: string) {
  return mutate('pengumuman:confirm', async (client, profile) => {
    const { error } = await client
      .from('pengumuman_kehadiran')
      .upsert(
        { pengumuman_id: parseInput(recordId, id), user_id: profile.id },
        { onConflict: 'pengumuman_id,user_id', ignoreDuplicates: true },
      );
    checkWrite(error);
  });
}
