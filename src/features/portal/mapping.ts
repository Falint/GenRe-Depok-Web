import type { Row } from './schema';
import { REIMBURSE_STATUS, SURAT_STATUS, TICKET_STATUS } from './schema';
import { PortalError } from '@/lib/errors';

export function formatDate(value: string | null, dateOnly = false) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    ...(!dateOnly && { timeStyle: 'short' }),
    timeZone: 'Asia/Jakarta',
  }).format(parsed);
}
export function mapSurat(row: Row<'surat'>, approvals: Row<'surat_approval'>[]) {
  return {
    ...row,
    status: row.status || SURAT_STATUS.PENDING,
    nomor: row.nomor_surat,
    pemohon: row.pemohon_nama,
    approvalHistory: approvals
      .filter((item) => item.surat_id === row.id)
      .sort((a, b) => a.step_order - b.step_order)
      .map((item) => ({
        step: item.step_label,
        actor: item.actor_name,
        status: item.status,
        time: formatDate(item.acted_at || item.created_at),
      })),
  };
}
export function mapReimburse(row: Row<'reimburse'>, approvals: Row<'reimburse_approval'>[]) {
  return {
    ...row,
    status: row.status || REIMBURSE_STATUS.PENDING,
    pemohon: row.pemohon_nama,
    buktiStruk: row.foto_struk_url,
    approvalChain: approvals
      .filter((item) => item.reimburse_id === row.id)
      .sort((a, b) => a.step_order - b.step_order)
      .map((item) => ({
        role: item.role_label,
        name: item.actor_name,
        status: item.status,
        date: formatDate(item.acted_at || item.created_at),
      })),
  };
}
export function mapPengumuman(
  row: Row<'pengumuman'>,
  attendance: Row<'pengumuman_kehadiran'>[],
  profiles: Pick<Row<'profiles'>, 'id' | 'nama_lengkap' | 'jabatan' | 'kelompok' | 'avatar'>[],
) {
  const roster = profiles.map((profile) => ({
    id: profile.id,
    name: profile.nama_lengkap,
    role: profile.jabatan,
    group: profile.kelompok || '-',
    avatar: profile.avatar || '👤',
  }));
  const byId = new Map(profiles.map((profile) => [profile.id, profile]));
  return {
    ...row,
    tanggal: formatDate(row.created_at),
    penulis: row.penulis_nama,
    totalTarget: row.total_target || roster.length,
    roster,
    readList: attendance
      .filter((item) => item.pengumuman_id === row.id)
      .map((item) => ({
        userId: item.user_id,
        name: byId.get(item.user_id)?.nama_lengkap || 'Pengurus',
        role: byId.get(item.user_id)?.jabatan || '-',
        confirmedAt: formatDate(item.confirmed_at),
      })),
  };
}
export function mapTiket(row: Row<'tiket_info'>) {
  return {
    ...row,
    status: row.status || TICKET_STATUS.OPEN,
    dari: row.pemohon_nama,
    divisiAsal: row.divisi_asal,
    tujuan: row.target_bidang,
  };
}
function checkedSum(values: number[]) {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (!Number.isSafeInteger(total))
    throw new PortalError('Total kas melampaui batas angka aman. Hubungi administrator.');
  return total;
}
export function mapFinance(
  mutations: Row<'kas_mutasi'>[],
  budgets: Row<'pagu_anggaran'>[],
  now = new Date(),
) {
  const monthKey = (date: Date) =>
    new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      timeZone: 'Asia/Jakarta',
    }).format(date);
  const thisMonth = mutations.filter((item) => monthKey(new Date(item.tgl)) === monthKey(now));
  const sum = (items: Row<'kas_mutasi'>[], kind: Row<'kas_mutasi'>['jenis']) =>
    checkedSum(items.filter((item) => item.jenis === kind).map((item) => item.nominal));
  return {
    saldoUtama: checkedSum([sum(mutations, 'Masuk'), -sum(mutations, 'Keluar')]),
    pemasukanBulanIni: sum(thisMonth, 'Masuk'),
    pengeluaranBulanIni: sum(thisMonth, 'Keluar'),
    paguAnggaran: [...budgets]
      .sort((a, b) => a.bidang.localeCompare(b.bidang))
      .map((item) => ({
        ...item,
        persentase: item.pagu ? Math.round((item.terpakai / item.pagu) * 1000) / 10 : 0,
      })),
    transaksiTerbaru: [...mutations]
      .sort((a, b) => b.tgl.localeCompare(a.tgl))
      .map((item) => ({ ...item, tgl: formatDate(item.tgl, true), sumberDana: item.sumber_dana })),
  };
}
export type Surat = ReturnType<typeof mapSurat>;
export type Reimburse = ReturnType<typeof mapReimburse>;
export type Pengumuman = ReturnType<typeof mapPengumuman>;
export type Tiket = ReturnType<typeof mapTiket>;
export type Finance = ReturnType<typeof mapFinance>;
export type PortalData = {
  suratList: Surat[];
  reimburseList: Reimburse[];
  pengumumanList: Pengumuman[];
  tiketList: Tiket[];
  keuangan: Finance;
};
export const EMPTY_PORTAL_DATA: PortalData = {
  suratList: [],
  reimburseList: [],
  pengumumanList: [],
  tiketList: [],
  keuangan: {
    saldoUtama: 0,
    pemasukanBulanIni: 0,
    pengeluaranBulanIni: 0,
    paguAnggaran: [],
    transaksiTerbaru: [],
  },
};
