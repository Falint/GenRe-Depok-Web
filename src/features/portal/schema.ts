import { z } from 'zod';

export const ROLE_LEVELS = ['inti', 'kabid', 'kadiv', 'staff'] as const;
export const roleLevelSchema = z.enum(ROLE_LEVELS);
export const profileSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  nama_lengkap: z.string().min(1),
  jabatan: z.string().min(1),
  bidang_divisi: z.string(),
  kelompok: z.string(),
  level: roleLevelSchema,
  bidang_id: z.string().nullable().optional(),
  divisi_id: z.string().nullable().optional(),
  avatar: z.string().nullable(),
  telepon_wa: z.string().nullable(),
  created_at: z.string().nullable(),
});
const id = {
  id: z.uuid(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable().optional(),
};
const requester = { pemohon_id: z.uuid().nullable(), pemohon_nama: z.string(), divisi: z.string() };
const amount = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const rowSchemas = {
  profiles: profileSchema,
  surat: z.object({
    ...id,
    ...requester,
    nomor_surat: z.string(),
    jenis: z.string(),
    perihal: z.string(),
    tujuan: z.string(),
    keterangan: z.string().nullable(),
    urgensi: z.enum(['Rendah', 'Sedang', 'Tinggi']).nullable(),
    status: z.string().nullable(),
    tanggal: z.string(),
    file_pdf_url: z.string().nullable(),
  }),
  surat_approval: z.object({
    ...id,
    surat_id: z.uuid(),
    step_order: z.number().int(),
    step_label: z.string(),
    actor_name: z.string(),
    status: z.string(),
    acted_at: z.string().nullable(),
  }),
  reimburse: z.object({
    ...id,
    ...requester,
    pagu_anggaran_id: z.uuid().nullable().optional(),
    proker: z.string(),
    nominal: amount.positive(),
    keterangan: z.string().nullable(),
    bank: z.string(),
    rekening: z.string(),
    status: z.string().nullable(),
    tanggal: z.string(),
    foto_struk_url: z.string().nullable(),
    bukti_transfer_url: z.string().nullable(),
  }),
  reimburse_approval: z.object({
    ...id,
    reason: z.string().nullable().optional(),
    reimburse_id: z.uuid(),
    step_order: z.number().int(),
    role_label: z.string(),
    actor_name: z.string(),
    status: z.string(),
    acted_at: z.string().nullable(),
  }),
  kas_mutasi: z.object({
    ...id,
    pagu_anggaran_id: z.uuid().nullable().optional(),
    tgl: z.string(),
    deskripsi: z.string(),
    jenis: z.enum(['Masuk', 'Keluar']),
    nominal: amount.positive(),
    kategori: z.string(),
    sumber_dana: z.string(),
    dicatat_oleh: z.uuid().nullable(),
    dicatat_oleh_nama: z.string(),
    reimburse_id: z.uuid().nullable().optional(),
  }),
  pagu_anggaran: z.object({
    id: z.uuid(),
    bidang: z.string(),
    pagu: amount,
    terpakai: amount,
    tahun_anggaran: z.number().int(),
    updated_at: z.string().nullable(),
  }),
  pengumuman: z.object({
    ...id,
    judul: z.string(),
    kategori: z.enum(['Urgent', 'Umum', 'Kecamatan']),
    target: z.string(),
    isi: z.string(),
    penulis_id: z.uuid().nullable(),
    penulis_nama: z.string(),
    total_target: z.number().int().nullable(),
    mulai_at: z.string().nullable().optional(),
    selesai_at: z.string().nullable().optional(),
    deadline_konfirmasi: z.string().nullable().optional(),
    cancelled_at: z.string().nullable().optional(),
    cancellation_reason: z.string().nullable().optional(),
    version: z.number().int().optional(),
  }),
  pengumuman_kehadiran: z.object({
    id: z.uuid(),
    pengumuman_id: z.uuid(),
    user_id: z.uuid(),
    confirmed_at: z.string().nullable(),
    is_late: z.boolean().optional(),
  }),
  tiket_info: z.object({
    ...id,
    judul: z.string(),
    pemohon_id: z.uuid().nullable(),
    pemohon_nama: z.string(),
    divisi_asal: z.string(),
    target_bidang: z.string(),
    prioritas: z.enum(['Rendah', 'Sedang', 'Tinggi', 'Mendesak']).nullable(),
    deadline: z.string().nullable(),
    deadline_at: z.string().nullable().optional(),
    deskripsi: z.string(),
    respons: z.string().nullable(),
    status: z.enum(['Open', 'In Progress', 'Selesai']).nullable(),
  }),
};
export type Profile = z.infer<typeof profileSchema>;
export type RoleLevel = Profile['level'];
export type Row<T extends keyof typeof rowSchemas> = z.infer<(typeof rowSchemas)[T]>;

export const PORTAL_CONFIG = {
  PAGE_SIZE: 200,
  REALTIME_DEBOUNCE_MS: 500,
  TOAST_DURATION_MS: 3500,
} as const;
export const SURAT_STATUS = {
  PENDING: 'Menunggu Review Kabid',
  COMPLETE: 'Selesai / Terbit (QR ACC)',
} as const;
export const REIMBURSE_STATUS = {
  PENDING: 'Menunggu Approval Bendahara',
  COMPLETE: 'Selesai / Dicairkan',
  CANCELLED: 'Dibatalkan',
  REJECTED: 'Ditolak',
} as const;
export const TICKET_STATUS = { OPEN: 'Open', COMPLETE: 'Selesai' } as const;
