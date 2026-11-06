import { z } from 'zod';
export const mediaSchema = z.object({
  id: z.uuid(),
  legacy_key: z.string().nullable(),
  jenis: z.enum(['modul', 'logo', 'video']),
  judul: z.string(),
  deskripsi: z.string(),
  url: z.string().nullable(),
  kategori: z.string(),
  jenjang: z.string(),
  halaman: z.number().nullable(),
  tahun: z.number().nullable(),
  format: z.string(),
  size: z.string(),
  durasi: z.string(),
  created_by: z.uuid().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
  archived_at: z.string().nullable(),
  version: z.number().int(),
});
export const contentHistorySchema = z.object({
  id: z.uuid(),
  entity_type: z.enum(['pengumuman', 'media_resources']),
  entity_id: z.uuid(),
  actor_id: z.uuid().nullable(),
  actor_name: z.string(),
  action: z.string(),
  before_data: z.record(z.string(), z.unknown()).nullable(),
  after_data: z.record(z.string(), z.unknown()),
  created_at: z.string(),
});
export const mediaInput = z
  .object({
    jenis: z.enum(['modul', 'logo', 'video']),
    judul: z.string().trim().min(1).max(300),
    deskripsi: z.string().trim().min(1).max(10000),
    url: z.string().trim().max(2048).nullable(),
  })
  .strict();
export type MediaResource = z.infer<typeof mediaSchema>;
export type MediaInput = z.infer<typeof mediaInput>;
