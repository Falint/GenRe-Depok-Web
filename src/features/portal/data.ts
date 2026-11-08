import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/database.types';
import { PortalError } from '@/lib/errors';
import { PORTAL_CONFIG, rowSchemas, type Profile } from './schema';
import { mapFinance, mapPengumuman, mapReimburse, mapSurat, mapTiket } from './mapping';

export async function readRows<T>(
  client: SupabaseClient<Database>,
  table: keyof Database['public']['Tables'],
  schema: z.ZodType<T>,
  columns = '*',
  filters: Record<string, string> = {},
): Promise<T[]> {
  const rows: T[] = [];
  for (;;) {
    let query = client.from(table).select(columns, { count: 'exact' });
    for (const [column, value] of Object.entries(filters)) query = query.eq(column, value);
    const { data, count, error } = await query
      .order('id')
      .range(rows.length, rows.length + PORTAL_CONFIG.PAGE_SIZE - 1);
    if (error) throw new PortalError('Data portal tidak dapat dimuat. Coba lagi.');
    const parsed = z.array(schema).safeParse(data);
    if (!parsed.success)
      throw new PortalError('Format data portal tidak sesuai skema. Hubungi administrator.');
    rows.push(...parsed.data);
    if (count !== null && rows.length >= count) return rows;
    if (!parsed.data.length)
      throw new PortalError('Data portal belum dapat dimuat lengkap. Coba lagi.');
  }
}

export async function loadPortalData(profile: Profile) {
  const client = await createClient();
  const [
    surat,
    suratApproval,
    reimburse,
    reimburseApproval,
    announcements,
    attendance,
    profiles,
    tickets,
    mutations,
    budgets,
    budgetResult,
  ] = await Promise.all([
    readRows(client, 'surat', rowSchemas.surat),
    readRows(client, 'surat_approval', rowSchemas.surat_approval),
    readRows(client, 'reimburse', rowSchemas.reimburse),
    readRows(client, 'reimburse_approval', rowSchemas.reimburse_approval),
    readRows(client, 'pengumuman', rowSchemas.pengumuman),
    readRows(client, 'pengumuman_kehadiran', rowSchemas.pengumuman_kehadiran),
    readRows(
      client,
      'profiles',
      rowSchemas.profiles.pick({
        id: true,
        nama_lengkap: true,
        jabatan: true,
        kelompok: true,
        avatar: true,
      }),
      'id,nama_lengkap,jabatan,kelompok,avatar',
    ),
    readRows(client, 'tiket_info', rowSchemas.tiket_info),
    profile.level === 'inti' ? readRows(client, 'kas_mutasi', rowSchemas.kas_mutasi) : [],
    profile.level === 'inti' ? readRows(client, 'pagu_anggaran', rowSchemas.pagu_anggaran) : [],
    client.rpc('list_portal_budgets'),
  ]);
  if (budgetResult.error)
    throw new PortalError('Pilihan anggaran gagal dimuat. Muat ulang atau hubungi administrator.');
  const budgetOptions = z
    .array(rowSchemas.pagu_anggaran.pick({ id: true, bidang: true, tahun_anggaran: true }))
    .parse(budgetResult.data);
  const newestFirst = <T extends { created_at: string | null }>(rows: T[]) =>
    [...rows].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  return {
    suratList: newestFirst(surat).map((row) => mapSurat(row, suratApproval)),
    reimburseList: newestFirst(reimburse).map((row) => mapReimburse(row, reimburseApproval)),
    pengumumanList: newestFirst(announcements).map((row) =>
      mapPengumuman(row, attendance, profiles),
    ),
    tiketList: newestFirst(tickets).map(mapTiket),
    budgetOptions,
    keuangan: mapFinance(mutations, budgets, new Date(), reimburse),
  };
}
