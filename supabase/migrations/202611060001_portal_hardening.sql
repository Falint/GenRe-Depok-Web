-- Review and apply separately after a backup. This file is never run by the app.
-- Additive schema change; existing records are preserved. Legacy completed claims
-- without a linked ledger entry require manual reconciliation, never automatic repayment.
BEGIN;

ALTER TABLE public.kas_mutasi ADD COLUMN IF NOT EXISTS reimburse_id UUID REFERENCES public.reimburse(id);
CREATE UNIQUE INDEX IF NOT EXISTS kas_mutasi_reimburse_once ON public.kas_mutasi(reimburse_id) WHERE reimburse_id IS NOT NULL;

-- Profile roles are administrator-managed. No browser or user-token operation can promote a user.
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon, authenticated;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nama_lengkap, jabatan, bidang_divisi, kelompok, level)
  VALUES (NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nama_lengkap', split_part(NEW.email, '@', 1)),
    'Staff', '-', '-', 'staff');
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_pengurus_inti()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND level = 'inti');
$$;
CREATE OR REPLACE FUNCTION public.is_pimpinan()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND level IN ('inti', 'kabid'));
$$;
REVOKE ALL ON FUNCTION public.is_pengurus_inti(), public.is_pimpinan() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_pengurus_inti(), public.is_pimpinan() TO authenticated;

-- Approval must use the transaction functions; direct updates bypass audit history.
REVOKE UPDATE ON public.surat, public.reimburse FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.surat_approval, public.reimburse_approval FROM anon, authenticated;
REVOKE UPDATE, DELETE ON public.kas_mutasi FROM anon, authenticated;

DROP POLICY IF EXISTS surat_insert_authenticated ON public.surat;
CREATE POLICY surat_insert_authenticated ON public.surat FOR INSERT TO authenticated WITH CHECK (
  pemohon_id = auth.uid() AND pemohon_nama = (SELECT nama_lengkap FROM public.profiles WHERE id = auth.uid())
  AND divisi = (SELECT kelompok FROM public.profiles WHERE id = auth.uid())
  AND status = 'Menunggu Review Kabid'
);
DROP POLICY IF EXISTS reimburse_insert ON public.reimburse;
CREATE POLICY reimburse_insert ON public.reimburse FOR INSERT TO authenticated WITH CHECK (
  pemohon_id = auth.uid() AND pemohon_nama = (SELECT nama_lengkap FROM public.profiles WHERE id = auth.uid())
  AND divisi = (SELECT kelompok FROM public.profiles WHERE id = auth.uid())
  AND status = 'Menunggu Approval Bendahara'
);
DROP POLICY IF EXISTS pengumuman_insert_pimpinan ON public.pengumuman;
CREATE POLICY pengumuman_insert_pimpinan ON public.pengumuman FOR INSERT TO authenticated WITH CHECK (
  public.is_pimpinan() AND penulis_id = auth.uid()
  AND penulis_nama = (SELECT nama_lengkap FROM public.profiles WHERE id = auth.uid())
);
DROP POLICY IF EXISTS tiket_insert ON public.tiket_info;
CREATE POLICY tiket_insert ON public.tiket_info FOR INSERT TO authenticated WITH CHECK (
  pemohon_id = auth.uid() AND pemohon_nama = (SELECT nama_lengkap FROM public.profiles WHERE id = auth.uid())
  AND divisi_asal = (SELECT kelompok FROM public.profiles WHERE id = auth.uid())
  AND status = 'Open' AND respons IS NULL
);
-- Existing RLS permits leadership and the requester to respond. Target membership
-- has no reliable key in this schema; do not infer access from free-text target_bidang.
REVOKE UPDATE ON public.tiket_info FROM anon, authenticated;
GRANT UPDATE (status, respons) ON public.tiket_info TO authenticated;
DROP POLICY IF EXISTS tiket_update ON public.tiket_info;
CREATE POLICY tiket_update ON public.tiket_info FOR UPDATE TO authenticated
  USING (public.is_pimpinan() OR pemohon_id = auth.uid())
  WITH CHECK (public.is_pimpinan() OR pemohon_id = auth.uid());

DROP POLICY IF EXISTS kas_insert_inti ON public.kas_mutasi;
CREATE POLICY kas_insert_inti ON public.kas_mutasi FOR INSERT TO authenticated WITH CHECK (
  public.is_pengurus_inti() AND dicatat_oleh = auth.uid() AND reimburse_id IS NULL
  AND dicatat_oleh_nama = (SELECT nama_lengkap FROM public.profiles WHERE id = auth.uid())
);

CREATE OR REPLACE FUNCTION public.approve_portal_surat(target_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor public.profiles%ROWTYPE;
  letter public.surat%ROWTYPE;
BEGIN
  SELECT * INTO actor FROM public.profiles WHERE id = auth.uid();
  IF actor.id IS NULL OR actor.level NOT IN ('inti', 'kabid') THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO letter FROM public.surat WHERE id = target_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Letter not found'; END IF;
  IF letter.status = 'Selesai / Terbit (QR ACC)' THEN RETURN; END IF;
  IF letter.status IS NOT NULL AND letter.status NOT LIKE 'Menunggu%' THEN RAISE EXCEPTION 'Invalid letter status'; END IF;
  INSERT INTO public.surat_approval (surat_id, step_order, step_label, actor_name, status, acted_at)
  VALUES (target_id, 99, 'ACC: ' || actor.jabatan, actor.nama_lengkap, 'Disetujui', now());
  UPDATE public.surat SET status = 'Selesai / Terbit (QR ACC)' WHERE id = target_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.disburse_portal_reimburse(target_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor public.profiles%ROWTYPE;
  claim public.reimburse%ROWTYPE;
BEGIN
  SELECT * INTO actor FROM public.profiles WHERE id = auth.uid();
  IF actor.id IS NULL OR actor.level <> 'inti' THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO claim FROM public.reimburse WHERE id = target_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Claim not found'; END IF;
  IF claim.status = 'Selesai / Dicairkan' THEN
    IF EXISTS (SELECT 1 FROM public.kas_mutasi WHERE reimburse_id = target_id) THEN RETURN; END IF;
    RAISE EXCEPTION 'Legacy disbursement requires reconciliation';
  END IF;
  IF claim.status IS NOT NULL AND claim.status NOT LIKE 'Menunggu%' THEN RAISE EXCEPTION 'Invalid claim status'; END IF;
  INSERT INTO public.kas_mutasi (tgl, deskripsi, jenis, nominal, kategori, sumber_dana, dicatat_oleh, dicatat_oleh_nama, reimburse_id)
  VALUES ((now() AT TIME ZONE 'Asia/Jakarta')::date, 'Pencairan Reimburse: ' || claim.proker,
    'Keluar', claim.nominal, claim.divisi, 'Kas Utama', actor.id, actor.nama_lengkap, target_id);
  INSERT INTO public.reimburse_approval (reimburse_id, step_order, role_label, actor_name, status, acted_at)
  VALUES (target_id, 99, actor.jabatan, actor.nama_lengkap, 'Disetujui / Ditransfer', now());
  UPDATE public.reimburse SET status = 'Selesai / Dicairkan' WHERE id = target_id;
END;
$$;
REVOKE ALL ON FUNCTION public.approve_portal_surat(UUID), public.disburse_portal_reimburse(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_portal_surat(UUID), public.disburse_portal_reimburse(UUID) TO authenticated;

COMMIT;
