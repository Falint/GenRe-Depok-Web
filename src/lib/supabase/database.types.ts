import type { Row } from '@/features/portal/schema';

// Schema contract derived from supabase_setup.sql, not generated against the live database.
type Table<T, Required extends keyof T> = {
  Row: T;
  Insert: Pick<T, Required> & Partial<T>;
  Update: Partial<T>;
  Relationships: [];
};
export type Database = {
  public: {
    Tables: {
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
      approve_portal_surat: { Args: { target_id: string }; Returns: undefined };
      disburse_portal_reimburse: { Args: { target_id: string }; Returns: undefined };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
