import { z } from 'zod';

const field = z
  .string()
  .trim()
  .min(1)
  .max(300)
  .transform((value) => value.replace(/\s+/gu, ' '));
export const registrationInput = z.object({ nama: field, instansi: field, unsur: field }).strict();
export const participantSchema = z.object({
  id: z.uuid(),
  agenda_id: z.uuid(),
  nama: z.string(),
  instansi: z.string(),
  unsur: z.string(),
  created_at: z.string(),
});
export const attachmentParticipantSchema = participantSchema.pick({
  nama: true,
  instansi: true,
  unsur: true,
});
export type RegistrationInput = z.input<typeof registrationInput>;
export type Participant = z.infer<typeof participantSchema>;

export function registrationOpen(
  agenda: {
    jenis: string;
    status: string;
    mulai_at: string | null;
    pendaftaran_dibuka: boolean;
  },
  now = Date.now(),
) {
  return (
    agenda.jenis === 'agenda' &&
    agenda.status === 'published' &&
    agenda.pendaftaran_dibuka &&
    Boolean(agenda.mulai_at) &&
    new Date(agenda.mulai_at!).getTime() > now
  );
}
