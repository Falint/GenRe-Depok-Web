'use server';
import { mutate, checkWrite } from '@/features/portal/mutations';
import {
  canCreateSurat,
  canApproveSurat,
  isPengurusInti,
  requirePermission,
} from '@/features/auth/permissions';
import { PortalError } from '@/lib/errors';
import {
  reimburseDecision,
  mutasiInput,
  parseInput,
  recordId,
  reimburseInput,
  suratInput,
  type MutasiInput,
  type ReimburseInput,
  type SuratInput,
} from '@/features/portal/validation';
import { exportSurat } from './suratExport';

export async function addSurat(input: SuratInput) {
  return mutate('surat:create', async (client, profile) => {
    requirePermission(canCreateSurat(profile.level));
    const { request_id, ...values } = parseInput(suratInput, input);
    const { error } = await client.rpc('create_portal_surat', { request_id, input: values });
    if (error?.code === '22023')
      throw new PortalError(
        'Pengajuan surat berubah. Periksa daftar surat sebelum membuka form baru.',
      );
    checkWrite(error);
  });
}

export async function approveSurat(input: string) {
  return mutate('surat:approve', async (client, profile) => {
    requirePermission(canApproveSurat(profile.level));
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

export async function retrySuratExport(input: string) {
  return mutate('surat:export', async (client, profile) => {
    requirePermission(canApproveSurat(profile.level));
    const error = await exportSurat(client, parseInput(recordId, input));
    if (error) throw new PortalError(error);
  });
}

export async function addReimburse(input: ReimburseInput) {
  return mutate('reimburse:create', async (client) => {
    const { request_id, ...values } = parseInput(reimburseInput, input);
    const { error } = await client.rpc('create_portal_reimburse', { request_id, input: values });
    checkWrite(error);
  });
}

export async function decideReimburse(input: {
  id: string;
  decision: 'cancel' | 'reject';
  reason: string;
}) {
  return mutate('reimburse:decide', async (client, profile) => {
    const values = parseInput(reimburseDecision, input);
    if (values.decision === 'reject') requirePermission(isPengurusInti(profile.level));
    // Ownership and pending state are checked under the RPC row lock.
    const { error } = await client.rpc('decide_portal_reimburse', {
      target_id: values.id,
      decision: values.decision,
      reason: values.reason,
    });
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
    const { request_id, ...values } = parseInput(mutasiInput, input);
    const { error } = await client.rpc('create_portal_mutasi', { request_id, input: values });
    checkWrite(error);
  });
}
