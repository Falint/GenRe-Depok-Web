import { z } from 'zod';

const fields = {
  jenis: z.enum(['berita', 'agenda']),
  judul: z.string().trim().min(1).max(300),
  ringkasan: z.string().trim().min(1).max(500),
  isi: z.string().trim().min(1).max(20000),
  status: z.enum(['draft', 'published']),
  mulai_at: z.iso.datetime({ offset: true }).nullable(),
  selesai_at: z.iso.datetime({ offset: true }).nullable(),
  lokasi: z.string().trim().max(500),
};

export const publicContentInput = z
  .object(fields)
  .strict()
  .superRefine((value, ctx) => {
    if (value.jenis === 'agenda' && (!value.mulai_at || !value.lokasi))
      ctx.addIssue({ code: 'custom', message: 'Agenda wajib memiliki waktu mulai dan lokasi.' });
    if (value.jenis === 'berita' && (value.mulai_at || value.selesai_at || value.lokasi))
      ctx.addIssue({ code: 'custom', message: 'Waktu dan lokasi hanya untuk agenda.' });
    if (
      value.selesai_at &&
      value.mulai_at &&
      Date.parse(value.selesai_at) < Date.parse(value.mulai_at)
    )
      ctx.addIssue({ code: 'custom', message: 'Waktu selesai tidak boleh sebelum waktu mulai.' });
  });

export const publicContentSchema = z.object({
  ...fields,
  id: z.uuid(),
  published_at: z.string().nullable(),
  updated_at: z.string(),
  version: z.number().int().nonnegative(),
});
export type PublicContent = z.infer<typeof publicContentSchema>;
export type PublicContentInput = z.infer<typeof publicContentInput>;
export type ContentKind = PublicContent['jenis'];

export function contentPage(value: unknown) {
  return typeof value === 'string' && /^[1-9]\d{0,5}$/.test(value) ? Number(value) : 1;
}
