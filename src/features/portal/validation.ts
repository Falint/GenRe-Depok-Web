import { z } from 'zod';
import { PortalError } from '@/lib/errors';

export const INPUT_LIMITS = {
  TITLE: 300,
  TEXT: 10000,
  SHORT_TEXT: 500,
  EMAIL: 254,
  PASSWORD: 1024,
  ACCOUNT: 200,
} as const;
const title = z.string().trim().min(1).max(INPUT_LIMITS.TITLE);
const text = z.string().trim().min(1).max(INPUT_LIMITS.TEXT);
const shortText = z.string().trim().min(1).max(INPUT_LIMITS.SHORT_TEXT);
const note = z.string().trim().max(INPUT_LIMITS.TEXT);
const money = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
export const loginSchema = z
  .object({
    email: z.email().max(INPUT_LIMITS.EMAIL),
    password: z.string().min(1).max(INPUT_LIMITS.PASSWORD),
  })
  .strict();
export const suratInput = z
  .object({
    jenis: z.enum(['Surat Tugas', 'Surat Undangan', 'Surat Permohonan', 'Surat Rekomendasi']),
    perihal: title,
    tujuan: shortText,
    urgensi: z.enum(['Rendah', 'Sedang', 'Tinggi']),
    keterangan: note,
  })
  .strict();
export const driveFileUrl = z
  .string()
  .trim()
  .max(2048)
  .pipe(z.url({ protocol: /^https$/, hostname: /^drive\.google\.com$/ }))
  .refine((value) => {
    if (!/^https:\/\//i.test(value) || !URL.canParse(value)) return false;
    const url = new URL(value);
    return (
      !url.username &&
      !url.password &&
      !url.port &&
      (/^\/file\/d\/[A-Za-z0-9_-]+(?:\/(?:view|preview))?\/?$/.test(url.pathname) ||
        (url.pathname === '/open' && /^[A-Za-z0-9_-]+$/.test(url.searchParams.get('id') || '')))
    );
  }, 'Gunakan link file Google Drive, bukan link folder.');
export const reimburseInput = z
  .object({
    proker: title,
    nominal: money,
    keterangan: note,
    bank: shortText,
    rekening: z.string().trim().min(1).max(INPUT_LIMITS.ACCOUNT),
    foto_struk_url: driveFileUrl.or(z.string().trim().length(0)).optional(),
  })
  .strict();
export const tiketInput = z
  .object({
    judul: title,
    tujuan: shortText,
    prioritas: z.enum(['Rendah', 'Sedang', 'Tinggi', 'Mendesak']),
    deadline: z.string().trim().max(INPUT_LIMITS.SHORT_TEXT),
    deadline_at: z.iso.datetime().nullable().optional(),
    deskripsi: text,
  })
  .strict();
export const pengumumanInput = z
  .object({
    judul: title,
    kategori: z.enum(['Urgent', 'Umum', 'Kecamatan']),
    target: shortText,
    isi: text,
    mulai_at: z.iso.datetime().nullable().optional(),
    selesai_at: z.iso.datetime().nullable().optional(),
    deadline_konfirmasi: z.iso.datetime().nullable().optional(),
  })
  .strict();
export const mutasiInput = z
  .object({
    deskripsi: text,
    jenis: z.enum(['Masuk', 'Keluar']),
    nominal: money,
    kategori: shortText,
    sumberDana: shortText,
  })
  .strict();
export const replyInput = z.object({ id: z.uuid(), response: text }).strict();
export const recordId = z.uuid();

export function parseInput<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new PortalError('Data tidak valid. Periksa isian dan panjang teks.');
  return result.data;
}
export function draftNumber(
  kind: z.infer<typeof suratInput>['jenis'],
  uniqueId: string,
  now = new Date(),
) {
  const codes = {
    'Surat Tugas': 'ST',
    'Surat Undangan': 'SU',
    'Surat Permohonan': 'SPm',
    'Surat Rekomendasi': 'SR',
  };
  return `DRAFT-${uniqueId}/${codes[kind]}/FG-DPK/${now.getUTCFullYear()}`;
}
export type SuratInput = z.infer<typeof suratInput>;
export type ReimburseInput = z.infer<typeof reimburseInput>;
export type TiketInput = z.infer<typeof tiketInput>;
export type PengumumanInput = z.infer<typeof pengumumanInput>;
export type MutasiInput = z.infer<typeof mutasiInput>;
