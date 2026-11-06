-- =========================================================================
-- SQL MIGRATION & SEED: PORTAL FORUM GENRE KOTA DEPOK (LENGKAP)
-- Jalankan seluruhnya di Supabase SQL Editor (satu kali)
-- =========================================================================

-- 1. EXTENSION
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 2. TABEL PROFIL PENGURUS (TERHUBUNG KE AUTH.USERS)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    nama_lengkap TEXT NOT NULL,
    jabatan TEXT NOT NULL,
    bidang_divisi TEXT NOT NULL,
    -- 'group' di mockData: Pengurus Inti, Kepala Bidang, Bidang Eksternal, Bidang Internal, Bidang Branding
    kelompok TEXT NOT NULL,
    level TEXT NOT NULL CHECK (level IN ('inti', 'kabid', 'kadiv', 'staff')),
    avatar TEXT DEFAULT '👤',
    telepon_wa TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: auto-buat profil saat user sign up (opsional, bisa diisi manual)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nama_lengkap, jabatan, bidang_divisi, kelompok, level)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nama_lengkap', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'jabatan', 'Staff'),
    COALESCE(NEW.raw_user_meta_data->>'bidang_divisi', '-'),
    COALESCE(NEW.raw_user_meta_data->>'kelompok', '-'),
    COALESCE(NEW.raw_user_meta_data->>'level', 'staff')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================================
-- 3. TABEL SURAT-MENYURAT DINAS
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.surat (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nomor_surat TEXT NOT NULL,
    jenis TEXT NOT NULL,
    perihal TEXT NOT NULL,
    pemohon_id UUID REFERENCES public.profiles(id),
    pemohon_nama TEXT NOT NULL,
    divisi TEXT NOT NULL,
    tujuan TEXT NOT NULL,
    keterangan TEXT,
    urgensi TEXT DEFAULT 'Sedang' CHECK (urgensi IN ('Rendah', 'Sedang', 'Tinggi')),
    status TEXT DEFAULT 'Menunggu Review Kabid',
    tanggal TEXT NOT NULL DEFAULT to_char(NOW(), 'DD Month YYYY'),
    file_pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3b. RIWAYAT APPROVAL SURAT (relasi 1:N)
CREATE TABLE IF NOT EXISTS public.surat_approval (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    surat_id UUID NOT NULL REFERENCES public.surat(id) ON DELETE CASCADE,
    step_order INT NOT NULL DEFAULT 0,
    step_label TEXT NOT NULL,        -- 'Pengajuan oleh Divisi', 'Verifikasi Kabid', dll
    actor_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending',  -- 'Diajukan', 'Disetujui', 'Pending', 'Ditolak'
    acted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 4. TABEL REIMBURSEMENT
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.reimburse (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proker TEXT NOT NULL,
    pemohon_id UUID REFERENCES public.profiles(id),
    pemohon_nama TEXT NOT NULL,
    divisi TEXT NOT NULL,
    nominal BIGINT NOT NULL CHECK (nominal > 0),
    keterangan TEXT,
    bank TEXT NOT NULL,
    rekening TEXT NOT NULL,
    status TEXT DEFAULT 'Menunggu Approval Bendahara',
    tanggal TEXT NOT NULL DEFAULT to_char(NOW(), 'DD Month YYYY'),
    foto_struk_url TEXT,
    bukti_transfer_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4b. RANTAI APPROVAL REIMBURSE (relasi 1:N)
CREATE TABLE IF NOT EXISTS public.reimburse_approval (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reimburse_id UUID NOT NULL REFERENCES public.reimburse(id) ON DELETE CASCADE,
    step_order INT NOT NULL DEFAULT 0,
    role_label TEXT NOT NULL,        -- 'Kadiv / Inisiator', 'Kabid Eksternal', dll
    actor_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    acted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 5. BUKU KAS BESAR (MUTASI MASUK & KELUAR)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.kas_mutasi (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tgl DATE NOT NULL DEFAULT CURRENT_DATE,
    deskripsi TEXT NOT NULL,
    jenis TEXT NOT NULL CHECK (jenis IN ('Masuk', 'Keluar')),
    nominal BIGINT NOT NULL CHECK (nominal > 0),
    kategori TEXT NOT NULL,
    sumber_dana TEXT NOT NULL,
    dicatat_oleh UUID REFERENCES public.profiles(id),
    dicatat_oleh_nama TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 6. PAGU ANGGARAN PER BIDANG
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.pagu_anggaran (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bidang TEXT NOT NULL UNIQUE,
    pagu BIGINT NOT NULL DEFAULT 0,
    terpakai BIGINT NOT NULL DEFAULT 0,
    tahun_anggaran INT NOT NULL DEFAULT 2026,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 7. PAPAN PENGUMUMAN
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.pengumuman (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    judul TEXT NOT NULL,
    kategori TEXT NOT NULL CHECK (kategori IN ('Urgent', 'Umum', 'Kecamatan')),
    target TEXT NOT NULL,
    isi TEXT NOT NULL,
    penulis_id UUID REFERENCES public.profiles(id),
    penulis_nama TEXT NOT NULL,
    total_target INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7b. KEHADIRAN / READ-RECEIPT PENGUMUMAN
CREATE TABLE IF NOT EXISTS public.pengumuman_kehadiran (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pengumuman_id UUID NOT NULL REFERENCES public.pengumuman(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    confirmed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(pengumuman_id, user_id)
);

-- =========================================================================
-- 8. TIKET REQUEST INFORMASI ANTARBIDANG
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.tiket_info (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    judul TEXT NOT NULL,
    pemohon_id UUID REFERENCES public.profiles(id),
    pemohon_nama TEXT NOT NULL,
    divisi_asal TEXT NOT NULL,
    target_bidang TEXT NOT NULL,
    prioritas TEXT DEFAULT 'Sedang' CHECK (prioritas IN ('Rendah', 'Sedang', 'Tinggi', 'Mendesak')),
    deadline TEXT,
    deskripsi TEXT NOT NULL,
    respons TEXT,
    status TEXT DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Selesai')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- AKTIFKAN REALTIME
-- =========================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.surat;
ALTER PUBLICATION supabase_realtime ADD TABLE public.surat_approval;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reimburse;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reimburse_approval;
ALTER PUBLICATION supabase_realtime ADD TABLE public.kas_mutasi;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pengumuman;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pengumuman_kehadiran;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tiket_info;

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) — SEMUA TABEL
-- =========================================================================

-- Helper function: cek apakah user termasuk pengurus inti
CREATE OR REPLACE FUNCTION public.is_pengurus_inti()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND level = 'inti'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: cek apakah user termasuk pimpinan (inti + kabid)
CREATE OR REPLACE FUNCTION public.is_pimpinan()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND level IN ('inti', 'kabid')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ---- PROFILES ----
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- ---- SURAT ----
ALTER TABLE public.surat ENABLE ROW LEVEL SECURITY;
-- Semua authenticated bisa baca surat (transparansi)
CREATE POLICY "surat_select_authenticated"
  ON public.surat FOR SELECT TO authenticated USING (true);
-- Semua authenticated bisa membuat surat (mengajukan draf)
CREATE POLICY "surat_insert_authenticated"
  ON public.surat FOR INSERT TO authenticated WITH CHECK (true);
-- Hanya pimpinan (inti+kabid) bisa update status surat (approve/reject)
CREATE POLICY "surat_update_pimpinan"
  ON public.surat FOR UPDATE TO authenticated
  USING (public.is_pimpinan() OR pemohon_id = auth.uid());

-- ---- SURAT APPROVAL ----
ALTER TABLE public.surat_approval ENABLE ROW LEVEL SECURITY;
CREATE POLICY "surat_approval_select"
  ON public.surat_approval FOR SELECT TO authenticated USING (true);
CREATE POLICY "surat_approval_insert_pimpinan"
  ON public.surat_approval FOR INSERT TO authenticated WITH CHECK (public.is_pimpinan());
CREATE POLICY "surat_approval_update_pimpinan"
  ON public.surat_approval FOR UPDATE TO authenticated USING (public.is_pimpinan());

-- ---- REIMBURSE ----
ALTER TABLE public.reimburse ENABLE ROW LEVEL SECURITY;
-- Semua bisa baca reimburse milik sendiri; inti bisa baca semua
CREATE POLICY "reimburse_select"
  ON public.reimburse FOR SELECT TO authenticated
  USING (pemohon_id = auth.uid() OR public.is_pengurus_inti());
-- Semua bisa mengajukan reimburse
CREATE POLICY "reimburse_insert"
  ON public.reimburse FOR INSERT TO authenticated WITH CHECK (true);
-- Hanya inti bisa update (approve/cairkan)
CREATE POLICY "reimburse_update_inti"
  ON public.reimburse FOR UPDATE TO authenticated USING (public.is_pengurus_inti());

-- ---- REIMBURSE APPROVAL ----
ALTER TABLE public.reimburse_approval ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reimburse_approval_select"
  ON public.reimburse_approval FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reimburse r
      WHERE r.id = reimburse_id AND (r.pemohon_id = auth.uid() OR public.is_pengurus_inti())
    )
  );
CREATE POLICY "reimburse_approval_insert"
  ON public.reimburse_approval FOR INSERT TO authenticated WITH CHECK (public.is_pimpinan());
CREATE POLICY "reimburse_approval_update"
  ON public.reimburse_approval FOR UPDATE TO authenticated USING (public.is_pimpinan());

-- ---- KAS MUTASI ----
ALTER TABLE public.kas_mutasi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kas_select_inti"
  ON public.kas_mutasi FOR SELECT TO authenticated
  USING (public.is_pengurus_inti());
CREATE POLICY "kas_insert_inti"
  ON public.kas_mutasi FOR INSERT TO authenticated
  WITH CHECK (public.is_pengurus_inti());

-- ---- PAGU ANGGARAN ----
ALTER TABLE public.pagu_anggaran ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pagu_select_inti"
  ON public.pagu_anggaran FOR SELECT TO authenticated
  USING (public.is_pengurus_inti());
CREATE POLICY "pagu_update_inti"
  ON public.pagu_anggaran FOR UPDATE TO authenticated
  USING (public.is_pengurus_inti());

-- ---- PENGUMUMAN ----
ALTER TABLE public.pengumuman ENABLE ROW LEVEL SECURITY;
-- Semua bisa baca pengumuman
CREATE POLICY "pengumuman_select"
  ON public.pengumuman FOR SELECT TO authenticated USING (true);
-- Hanya pimpinan bisa posting pengumuman
CREATE POLICY "pengumuman_insert_pimpinan"
  ON public.pengumuman FOR INSERT TO authenticated
  WITH CHECK (public.is_pimpinan());

-- ---- PENGUMUMAN KEHADIRAN ----
ALTER TABLE public.pengumuman_kehadiran ENABLE ROW LEVEL SECURITY;
-- Semua bisa baca kehadiran (untuk rekap)
CREATE POLICY "kehadiran_select"
  ON public.pengumuman_kehadiran FOR SELECT TO authenticated USING (true);
-- User hanya bisa konfirmasi kehadiran untuk dirinya sendiri
CREATE POLICY "kehadiran_insert_own"
  ON public.pengumuman_kehadiran FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ---- TIKET INFO ----
ALTER TABLE public.tiket_info ENABLE ROW LEVEL SECURITY;
-- Semua bisa baca tiket (transparansi koordinasi)
CREATE POLICY "tiket_select"
  ON public.tiket_info FOR SELECT TO authenticated USING (true);
-- Semua bisa buat tiket
CREATE POLICY "tiket_insert"
  ON public.tiket_info FOR INSERT TO authenticated WITH CHECK (true);
-- Pimpinan & target bidang bisa update (respons/status)
CREATE POLICY "tiket_update"
  ON public.tiket_info FOR UPDATE TO authenticated
  USING (public.is_pimpinan() OR pemohon_id = auth.uid());

-- =========================================================================
-- SEED DATA: PAGU ANGGARAN
-- =========================================================================
INSERT INTO public.pagu_anggaran (bidang, pagu, terpakai, tahun_anggaran) VALUES
  ('Bidang Eksternal (Program)', 15000000, 7200000, 2026),
  ('Bidang Internal (Center/Kec/Duta/PIK-R)', 12000000, 4800000, 2026),
  ('Bidang Branding (Humas/Media/Desain)', 8000000, 3100000, 2026),
  ('Operasional Inti & Kesekretariatan', 5000000, 1850000, 2026)
ON CONFLICT (bidang) DO NOTHING;

-- =========================================================================
-- SEED: DAFTAR 26 AKUN PENGURUS (sesuai mockData ROLES)
--
-- Jalankan fungsi ini SETELAH tabel siap.
-- Setiap user dibuat di auth.users lalu trigger on_auth_user_created
-- otomatis membuat row di profiles.
--
-- PENTING: Fungsi ini menggunakan supabase_admin API.
-- Di Supabase, gunakan Dashboard > Authentication > Users > Invite User
-- ATAU jalankan via Edge Function / API call berikut untuk setiap akun:
--
-- curl -X POST 'https://<PROJECT>.supabase.co/auth/v1/admin/users' \
--   -H "apikey: <SERVICE_ROLE_KEY>" \
--   -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
--   -H "Content-Type: application/json" \
--   -d '{
--     "email": "ketua@genredepok.or.id",
--     "password": "<SET_SECURE_INITIAL_PASSWORD>",
--     "email_confirm": true,
--     "user_metadata": {
--       "nama_lengkap": "Muhammad Ighasta Mughis",
--       "jabatan": "Ketua Umum",
--       "bidang_divisi": "Pengurus Inti",
--       "kelompok": "Pengurus Inti",
--       "level": "inti"
--     }
--   }'
-- =========================================================================

/*
DAFTAR LENGKAP 26 AKUN (sesuai ROLES di mockData.js):
Password awal ditetapkan lewat SEED_INITIAL_PASSWORD di luar Git.

No | role_id                  | Nama                           | Jabatan                         | Email                              | Level
---|--------------------------|--------------------------------|---------------------------------|------------------------------------|------
1  | ketua                    | Muhammad Ighasta Mughis        | Ketua Umum                      | ketua@genredepok.or.id             | inti
2  | wakil                    | Muhamad Arfan                  | Wakil Ketua Umum                | wakil@genredepok.or.id             | inti
3  | sekretaris               | Raihan Satria Elezar           | Sekretaris Umum                 | sekretaris@genredepok.or.id        | inti
4  | bendahara_1              | Nazwa Zahira                   | Bendahara Controller            | bendahara1@genredepok.or.id        | inti
5  | bendahara_2              | Tiara Maulidia                 | Bendahara Treasure & BUMF       | bendahara2@genredepok.or.id        | inti
6  | kabid_internal           | Roidah A'isyi Shofwah          | Kepala Bidang Internal           | kabid.internal@genredepok.or.id    | kabid
7  | kabid_eksternal          | Agnia Khumaira                 | Kepala Bidang Eksternal          | kabid.eksternal@genredepok.or.id   | kabid
8  | kabid_branding           | Teuku Andika Jalaluddin Rumi   | Kepala Bidang Branding           | kabid.branding@genredepok.or.id    | kabid
9  | kadiv_program_reguler    | Muhammad Fauzan Al-Anshori     | Kadiv Program Reguler            | fauzan.reguler@genredepok.or.id    | kadiv
10 | kadiv_program_nonreguler | Fathir Muhammad Ramadhan       | Kadiv Program Non-Reguler        | fathir.nonreg@genredepok.or.id     | kadiv
11 | kadiv_forum_kecamatan    | Muhamad Rizkan H.              | Kadiv Forum GenRe Kecamatan      | rizkan.kecamatan@genredepok.or.id  | kadiv
12 | kadiv_duta               | Melani Sofyan Putri            | Kadiv Duta GenRe                 | melani.duta@genredepok.or.id       | kadiv
13 | kadiv_pikr               | Ade Rifki Perdian              | Kadiv PIK-R                      | ade.pikr@genredepok.or.id          | kadiv
14 | kadiv_pr                 | Muhammad Diva                  | Kadiv Public Relation            | diva.pr@genredepok.or.id           | kadiv
15 | kadiv_sosmed             | Allya Nurul Febyana            | Kadiv Social Media               | allya.sosmed@genredepok.or.id      | kadiv
16 | kadiv_design             | Annisa Revy Alifiah            | Kadiv Design                     | annisa.design@genredepok.or.id     | kadiv
17 | kadiv_video              | Plt. Kepala Divisi             | Kadiv Video Editor               | kadiv.video@genredepok.or.id       | kadiv
18 | staff_video_adrian       | Adrian Saputra Kaban           | Staff Divisi Video Editor        | adrian.video@genredepok.or.id      | staff
19 | staff_reguler_radit      | Radit                          | Staff Divisi Program Reguler     | radit@genredepok.or.id             | staff
20 | staff_nonreg_darlo       | Darlo                          | Staff Divisi Program Non-Reguler | darlo@genredepok.or.id             | staff
21 | staff_kec_frida          | Frida Fatma Salsabila          | Staff Divisi Forum GenRe Kec     | frida@genredepok.or.id             | staff
22 | staff_duta_alya          | Alya Citra Lestari             | Staff Divisi Duta GenRe          | alya.duta@genredepok.or.id         | staff
23 | staff_pikr_natasya       | Natasya Wulandari Priyanto     | Staff Divisi PIK-R               | natasya@genredepok.or.id           | staff
24 | staff_pr_raihan          | Raihan Sukmajaya               | Staff Divisi Public Relation     | raihan.pr@genredepok.or.id         | staff
25 | staff_sosmed_faza        | Muhammad Faza                  | Staff Divisi Social Media        | faza@genredepok.or.id              | staff
26 | staff_design_siti        | Siti Nur Faizah                | Staff Divisi Design              | faizah@genredepok.or.id            | staff
*/

-- =========================================================================
-- SEED SCRIPT: Batch create users via Supabase Auth Admin API
-- Simpan sebagai file terpisah (seed_users.sh) dan jalankan:
--
--   export SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
--   export SERVICE_ROLE_KEY="your-service-role-key"
--   bash seed_users.sh
-- =========================================================================
