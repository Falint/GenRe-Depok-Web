import { z } from 'zod';
import { roleLevelSchema } from '@/features/portal/schema';

export const divisionSchema = z.object({ id: z.string(), nama: z.string(), bidang_id: z.string() });
export const memberSchema = z.object({
  id: z.uuid(),
  nama_lengkap: z.string(),
  level: roleLevelSchema,
  bidang_id: z.string().nullable(),
  divisi_id: z.string().nullable(),
});
export const requestSchema = z.object({
  id: z.uuid(),
  judul: z.string(),
  deskripsi: z.string(),
  pemohon_id: z.uuid().nullable(),
  pemohon_nama: z.string(),
  divisi_asal_id: z.string(),
  divisi_tujuan_id: z.string(),
  jumlah: z.number().int(),
  deadline_respons: z.string(),
  mulai_at: z.string(),
  selesai_at: z.string(),
  status: z.enum(['pending', 'approved', 'partially_assigned', 'assigned', 'rejected']),
  decision_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  version: z.number().int(),
});
export const assignmentSchema = z.object({
  id: z.uuid(),
  request_id: z.uuid(),
  user_id: z.uuid(),
  nama: z.string(),
  assigned_at: z.string(),
});
const change = z.array(z.object({ id: z.uuid(), nama: z.string() }));
export const historySchema = z.object({
  id: z.uuid(),
  request_id: z.uuid(),
  actor_id: z.uuid().nullable(),
  actor_name: z.string(),
  action: z.string(),
  old_status: requestSchema.shape.status.nullable(),
  new_status: requestSchema.shape.status,
  reason: z.string(),
  added: change,
  removed: change,
  created_at: z.string(),
});
export const requestInput = z
  .object({
    judul: z.string().trim().min(1).max(300),
    deskripsi: z.string().trim().min(1).max(10000),
    divisi_tujuan_id: z.string().min(1).max(100),
    divisi_asal_id: z.string().min(1).max(100).optional(),
    jumlah: z.number().int().min(1).max(1000),
    deadline_respons: z.iso.datetime(),
    mulai_at: z.iso.datetime(),
    selesai_at: z.iso.datetime(),
  })
  .strict()
  .refine(
    (v) =>
      Date.parse(v.deadline_respons) < Date.parse(v.mulai_at) &&
      Date.parse(v.mulai_at) < Date.parse(v.selesai_at),
    'Urutan jadwal tidak valid.',
  );
export type PanitiaRequest = z.infer<typeof requestSchema>;
export type PanitiaInput = z.infer<typeof requestInput>;
export type PanitiaData = {
  requests: PanitiaRequest[];
  assignments: z.infer<typeof assignmentSchema>[];
  history: z.infer<typeof historySchema>[];
  divisions: z.infer<typeof divisionSchema>[];
  members: z.infer<typeof memberSchema>[];
};
export const PANITIA_STATUS: Record<PanitiaRequest['status'], string> = {
  pending: 'Menunggu keputusan',
  approved: 'Disetujui · belum ditugaskan',
  partially_assigned: 'Terisi sebagian',
  assigned: 'Panitia lengkap',
  rejected: 'Ditolak',
};

export function canAssignMember(
  member: { level: string; divisi_id?: string | null },
  divisionId: string | null,
) {
  return !!divisionId && member.level === 'staff' && member.divisi_id === divisionId;
}
