import type { z } from 'zod';
import type {
  requestSchema,
  assignmentSchema,
  historySchema,
  divisionSchema,
} from '@/features/panitia/schema';
import type { mediaSchema, contentHistorySchema } from '@/features/media/schema';
import type { Row } from '@/features/portal/schema';

// Schema contract derived from supabase_setup.sql and supabase/migrations, not generated against the live database.
type Table<T, Required extends keyof T> = {
  Row: T;
  Insert: Pick<T, Required> & Partial<T>;
  Update: Partial<T>;
  Relationships: [];
};
export type Database = {
  public: {
    Tables: {
      bidang: Table<{ id: string; nama: string }, 'id' | 'nama'>;
      divisi: Table<z.infer<typeof divisionSchema>, 'id' | 'nama' | 'bidang_id'>;
      panitia_requests: Table<z.infer<typeof requestSchema>, 'judul'>;
      panitia_assignments: Table<
        z.infer<typeof assignmentSchema>,
        'request_id' | 'user_id' | 'nama'
      >;
      panitia_history: Table<z.infer<typeof historySchema>, 'request_id'>;
      media_resources: Table<z.infer<typeof mediaSchema>, 'jenis' | 'judul' | 'deskripsi'>;
      content_history: Table<z.infer<typeof contentHistorySchema>, 'entity_type' | 'entity_id'>;
      profiles: Table<
        Row<'profiles'>,
        'id' | 'email' | 'nama_lengkap' | 'jabatan' | 'bidang_divisi' | 'kelompok' | 'level'
      >;
      surat: Table<
        Row<'surat'>,
        'nomor_surat' | 'jenis' | 'perihal' | 'pemohon_nama' | 'divisi' | 'tujuan'
      >;
      surat_approval: Table<Row<'surat_approval'>, 'surat_id' | 'step_label' | 'actor_name'>;
      reimburse: Table<
        Row<'reimburse'>,
        'proker' | 'pemohon_nama' | 'divisi' | 'nominal' | 'bank' | 'rekening'
      >;
      reimburse_approval: Table<
        Row<'reimburse_approval'>,
        'reimburse_id' | 'role_label' | 'actor_name'
      >;
      kas_mutasi: Table<
        Row<'kas_mutasi'>,
        'deskripsi' | 'jenis' | 'nominal' | 'kategori' | 'sumber_dana' | 'dicatat_oleh_nama'
      >;
      pagu_anggaran: Table<Row<'pagu_anggaran'>, 'bidang'>;
      pengumuman: Table<
        Row<'pengumuman'>,
        'judul' | 'kategori' | 'target' | 'isi' | 'penulis_nama'
      >;
      pengumuman_kehadiran: Table<Row<'pengumuman_kehadiran'>, 'pengumuman_id' | 'user_id'>;
      tiket_info: Table<
        Row<'tiket_info'>,
        'judul' | 'pemohon_nama' | 'divisi_asal' | 'target_bidang' | 'deskripsi'
      >;
    };
    Views: { [_ in never]: never };
    Functions: {
      create_panitia_request: {
        Args: { request_id: string; input: Record<string, unknown> };
        Returns: undefined;
      };
      decide_panitia_request: {
        Args: { target_id: string; expected_version: number; approve: boolean; reason: string };
        Returns: undefined;
      };
      set_panitia_assignments: {
        Args: { target_id: string; expected_version: number; member_ids: string[]; reason: string };
        Returns: undefined;
      };
      save_portal_pengumuman: {
        Args: { target_id: string; expected_version: number; input: Record<string, unknown> };
        Returns: undefined;
      };
      cancel_portal_pengumuman: {
        Args: { target_id: string; expected_version: number; reason: string };
        Returns: undefined;
      };
      set_tiket_deadline: {
        Args: { target_id: string; deadline_value: string | null };
        Returns: undefined;
      };
      save_portal_media: {
        Args: { target_id: string; expected_version: number; input: Record<string, unknown> };
        Returns: undefined;
      };
      archive_portal_media: {
        Args: { target_id: string; expected_version: number; archive: boolean };
        Returns: undefined;
      };
      approve_portal_surat: { Args: { target_id: string }; Returns: undefined };
      disburse_portal_reimburse: { Args: { target_id: string }; Returns: undefined };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
