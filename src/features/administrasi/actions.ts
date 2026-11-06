'use server';
import { mutate, checkWrite } from '@/features/portal/mutations';
import {
  canApproveOrConfirm,
  isPengurusInti,
  requirePermission,
} from '@/features/auth/permissions';
import { PortalError } from '@/lib/errors';
import {
  draftNumber,
  mutasiInput,
  parseInput,
  recordId,
  reimburseInput,
  suratInput,
  type MutasiInput,
  type ReimburseInput,
  type SuratInput,
} from '@/features/portal/validation';

export async function addSurat(input: SuratInput) {
  return mutate('surat:create', async (client, profile) => {
    const values = parseInput(suratInput, input);
    const id = crypto.randomUUID();
    const { error } = await client
      .from('surat')
      .insert({
        ...values,
        id,
        nomor_surat: draftNumber(values.jenis, id),
        pemohon_id: profile.id,
        pemohon_nama: profile.nama_lengkap,
        divisi: profile.kelompok,
      })
      .select('id')
      .single();
    checkWrite(error);
  });
}

export async function approveSurat(input: string) {
  return mutate('surat:approve', async (client, profile) => {
    requirePermission(canApproveOrConfirm(profile.level));
    const { error } = await client.rpc('approve_portal_surat', {
      target_id: parseInput(recordId, input),
    });
    if (error?.code === 'PGRST202' || error?.code === '42883')
      throw new PortalError(
        'Approval memerlukan migrasi database transaksi. Hubungi administrator.',
      );
    checkWrite(error);
  });
}

export async function addReimburse(input: ReimburseInput) {
  return mutate('reimburse:create', async (client, profile) => {
    const values = parseInput(reimburseInput, input);
    const { error } = await client
      .from('reimburse')
      .insert({
        ...values,
        pemohon_id: profile.id,
        pemohon_nama: profile.nama_lengkap,
        divisi: profile.kelompok,
      })
      .select('id')
      .single();
    checkWrite(error);
  });
}

export async function approveReimburse(input: string) {
  return mutate('reimburse:disburse', async (client, profile) => {
    requirePermission(isPengurusInti(profile.level));
    const { error } = await client.rpc('disburse_portal_reimburse', {
      target_id: parseInput(recordId, input),
    });
    if (error?.code === 'PGRST202' || error?.code === '42883')
      throw new PortalError(
        'Pencairan memerlukan migrasi database transaksi. Hubungi administrator.',
      );
    checkWrite(error);
  });
}

export async function addMutasi(input: MutasiInput) {
  return mutate('kas:create', async (client, profile) => {
    requirePermission(isPengurusInti(profile.level));
    const { sumberDana, ...values } = parseInput(mutasiInput, input);
    const { error } = await client
      .from('kas_mutasi')
      .insert({
        ...values,
        sumber_dana: sumberDana,
        dicatat_oleh: profile.id,
        dicatat_oleh_nama: profile.nama_lengkap,
      })
      .select('id')
      .single();
    checkWrite(error);
  });
}
