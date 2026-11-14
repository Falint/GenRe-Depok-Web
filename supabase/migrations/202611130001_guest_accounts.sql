-- Apply after all preceding migrations, with public signup disabled until rollout completes.
-- Existing accounts and operational history are preserved. Legacy demotion is a separate reviewed step.
BEGIN;
ALTER TABLE public.profiles DROP CONSTRAINT profiles_level_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_level_check CHECK (level IN ('guest','admin','inti','kabid','kadiv','staff'));
ALTER TABLE public.profiles ADD COLUMN access_version integer NOT NULL DEFAULT 0 CHECK (access_version >= 0);
ALTER TABLE public.profiles ADD CONSTRAINT guest_admin_placement CHECK (level NOT IN ('guest','admin') OR (bidang_id IS NULL AND divisi_id IS NULL));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF lower(split_part(NEW.email, '@', 2)) IS DISTINCT FROM 'gmail.com' THEN
    RAISE EXCEPTION 'Gunakan alamat @gmail.com.' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.profiles(id,email,nama_lengkap,jabatan,bidang_divisi,kelompok,level)
  VALUES(NEW.id, lower(NEW.email), left(coalesce(nullif(btrim(NEW.raw_user_meta_data->>'nama_lengkap'),''),split_part(NEW.email,'@',1)),200), 'Tamu','-','-','guest');
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.is_portal_member()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND level <> 'guest');
$$;
CREATE FUNCTION public.is_portal_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND level = 'admin');
$$;
REVOKE ALL ON FUNCTION public.is_portal_member(), public.is_portal_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_portal_member(), public.is_portal_admin() TO authenticated;

-- Restrictive policies intersect every existing permissive policy, preserving role-specific rules.
CREATE POLICY portal_members_only ON public.surat AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_portal_member()) WITH CHECK (public.is_portal_member());
CREATE POLICY portal_members_only ON public.surat_approval AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_portal_member()) WITH CHECK (public.is_portal_member());
CREATE POLICY portal_members_only ON public.reimburse AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_portal_member()) WITH CHECK (public.is_portal_member());
CREATE POLICY portal_members_only ON public.reimburse_approval AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_portal_member()) WITH CHECK (public.is_portal_member());
CREATE POLICY portal_members_only ON public.kas_mutasi AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_portal_member()) WITH CHECK (public.is_portal_member());
CREATE POLICY portal_members_only ON public.pagu_anggaran AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_portal_member()) WITH CHECK (public.is_portal_member());
CREATE POLICY portal_members_only ON public.pengumuman AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_portal_member()) WITH CHECK (public.is_portal_member());
CREATE POLICY portal_members_only ON public.pengumuman_kehadiran AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_portal_member()) WITH CHECK (public.is_portal_member());
CREATE POLICY portal_members_only ON public.tiket_info AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_portal_member()) WITH CHECK (public.is_portal_member());
CREATE POLICY portal_members_only ON public.bidang AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_portal_member()) WITH CHECK (public.is_portal_member());
CREATE POLICY portal_members_only ON public.divisi AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_portal_member()) WITH CHECK (public.is_portal_member());
CREATE POLICY portal_members_only ON public.panitia_requests AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_portal_member()) WITH CHECK (public.is_portal_member());
CREATE POLICY portal_members_only ON public.panitia_assignments AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_portal_member()) WITH CHECK (public.is_portal_member());
CREATE POLICY portal_members_only ON public.panitia_history AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_portal_member()) WITH CHECK (public.is_portal_member());
CREATE POLICY portal_members_only ON public.media_resources AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_portal_member()) WITH CHECK (public.is_portal_member());
CREATE POLICY portal_members_only ON public.content_history AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_portal_member()) WITH CHECK (public.is_portal_member());

DROP POLICY profiles_select_authenticated ON public.profiles;
CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated USING (
  id = auth.uid() OR public.is_portal_admin() OR (public.is_portal_member() AND level <> 'guest')
);
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.profiles FROM anon, authenticated;
REVOKE TRUNCATE ON public.surat FROM anon, authenticated;
REVOKE TRUNCATE ON public.surat_approval FROM anon, authenticated;
REVOKE TRUNCATE ON public.reimburse FROM anon, authenticated;
REVOKE TRUNCATE ON public.reimburse_approval FROM anon, authenticated;
REVOKE TRUNCATE ON public.kas_mutasi FROM anon, authenticated;
REVOKE TRUNCATE ON public.pagu_anggaran FROM anon, authenticated;
REVOKE TRUNCATE ON public.pengumuman FROM anon, authenticated;
REVOKE TRUNCATE ON public.pengumuman_kehadiran FROM anon, authenticated;
REVOKE TRUNCATE ON public.tiket_info FROM anon, authenticated;
REVOKE TRUNCATE ON public.bidang FROM anon, authenticated;
REVOKE TRUNCATE ON public.divisi FROM anon, authenticated;
REVOKE TRUNCATE ON public.panitia_requests FROM anon, authenticated;
REVOKE TRUNCATE ON public.panitia_assignments FROM anon, authenticated;
REVOKE TRUNCATE ON public.panitia_history FROM anon, authenticated;
REVOKE TRUNCATE ON public.media_resources FROM anon, authenticated;
REVOKE TRUNCATE ON public.content_history FROM anon, authenticated;
REVOKE TRUNCATE ON public.public_content FROM anon, authenticated;

-- Replace SECURITY DEFINER bodies too: RLS does not constrain their table-owner access.

CREATE OR REPLACE FUNCTION public.is_pengurus_inti()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND level IN ('admin','inti'));
$$;

CREATE OR REPLACE FUNCTION public.is_pimpinan()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND level IN ('admin', 'inti', 'kabid'));
$$;

CREATE OR REPLACE FUNCTION public.can_manage_content()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (level IN ('admin','inti') OR bidang_id = 'branding'));
$$;

CREATE OR REPLACE FUNCTION public.can_read_panitia(target_id UUID, include_member BOOLEAN DEFAULT false)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.panitia_requests r JOIN public.profiles p ON p.id = auth.uid()
    WHERE r.id = target_id AND p.level <> 'guest' AND (
      p.level IN ('admin','inti','kabid') OR (p.level = 'kadiv' AND r.pemohon_id = p.id)
      OR (p.level = 'kadiv' AND p.divisi_id = r.divisi_tujuan_id)
      OR (include_member AND EXISTS (SELECT 1 FROM public.panitia_assignments a WHERE a.request_id = r.id AND a.user_id = p.id))
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.list_portal_budgets()
RETURNS TABLE(id uuid, bidang text, tahun_anggaran integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT b.id, b.bidang, b.tahun_anggaran FROM public.pagu_anggaran b
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND level <> 'guest')
  ORDER BY b.tahun_anggaran DESC, b.bidang;
$$;

CREATE OR REPLACE FUNCTION public.approve_portal_surat(target_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor public.profiles%ROWTYPE;
  letter public.surat%ROWTYPE;
BEGIN
  SELECT * INTO actor FROM public.profiles WHERE id = auth.uid();
  IF actor.id IS NULL OR actor.level = 'guest' OR actor.level NOT IN ('admin', 'inti', 'kabid') THEN
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

CREATE OR REPLACE FUNCTION public.create_portal_reimburse(request_id uuid, input jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor public.profiles%ROWTYPE;
  previous public.reimburse%ROWTYPE;
  budget_id uuid;
  amount bigint;
  proof text;
BEGIN
  SELECT * INTO actor FROM public.profiles WHERE id = auth.uid();
  IF actor.id IS NULL OR actor.level = 'guest' THEN RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501'; END IF;
  IF request_id IS NULL OR jsonb_typeof(input) IS DISTINCT FROM 'object'
    OR NOT input ?& ARRAY['proker','nominal','keterangan','bank','rekening','pagu_anggaran_id']
    OR input - ARRAY['proker','nominal','keterangan','bank','rekening','pagu_anggaran_id','foto_struk_url'] <> '{}'::jsonb
    OR jsonb_typeof(input->'nominal') IS DISTINCT FROM 'number'
    OR jsonb_typeof(input->'proker') IS DISTINCT FROM 'string'
    OR jsonb_typeof(input->'bank') IS DISTINCT FROM 'string'
    OR jsonb_typeof(input->'rekening') IS DISTINCT FROM 'string'
    OR jsonb_typeof(input->'keterangan') IS DISTINCT FROM 'string'
    OR length(btrim(input->>'proker')) NOT BETWEEN 1 AND 300
    OR length(btrim(input->>'bank')) NOT BETWEEN 1 AND 500
    OR length(btrim(input->>'rekening')) NOT BETWEEN 1 AND 200
    OR length(input->>'keterangan') > 10000
    OR (input->>'nominal')::numeric NOT BETWEEN 1 AND 9007199254740991
    OR (input->>'nominal')::numeric <> trunc((input->>'nominal')::numeric)
  THEN RAISE EXCEPTION 'Invalid input' USING ERRCODE = '22023'; END IF;
  amount := (input->>'nominal')::bigint;
  budget_id := (input->>'pagu_anggaran_id')::uuid;
  proof := nullif(btrim(input->>'foto_struk_url'), '');
  IF budget_id IS NULL OR (proof IS NOT NULL AND (length(proof) > 2048 OR
    proof !~ '^https://drive\.google\.com/(file/d/[A-Za-z0-9_-]+(/(view|preview))?/?([?#].*)?|open\?id=[A-Za-z0-9_-]+(&.*)?)$'))
  THEN RAISE EXCEPTION 'Invalid budget or Google Drive link' USING ERRCODE = '22023'; END IF;
  -- Serialize identical IDs before reading, including requests whose first response was lost.
  PERFORM pg_advisory_xact_lock(hashtextextended(request_id::text, 0));
  SELECT * INTO previous FROM public.reimburse WHERE id = request_id;
  IF FOUND THEN
    IF previous.pemohon_id IS DISTINCT FROM actor.id OR
      ROW(previous.proker, previous.nominal, previous.keterangan, previous.bank, previous.rekening, previous.foto_struk_url, previous.pagu_anggaran_id)
      IS DISTINCT FROM ROW(btrim(input->>'proker'), amount, btrim(input->>'keterangan'), btrim(input->>'bank'), btrim(input->>'rekening'), proof, budget_id)
    THEN RAISE EXCEPTION 'Pengajuan berubah' USING ERRCODE = '22023'; END IF;
    RETURN;
  END IF;
  -- Validate the year only for a new submission; retries keep their original allocation.
  IF NOT EXISTS (SELECT 1 FROM public.pagu_anggaran WHERE id = budget_id
    AND tahun_anggaran = extract(year FROM now() AT TIME ZONE 'Asia/Jakarta'))
  THEN RAISE EXCEPTION 'Pos tahun berjalan tidak tersedia' USING ERRCODE = '22023'; END IF;
  INSERT INTO public.reimburse(id, proker, nominal, keterangan, bank, rekening, foto_struk_url,
    pagu_anggaran_id, pemohon_id, pemohon_nama, divisi, tanggal)
  VALUES(request_id, btrim(input->>'proker'), amount, btrim(input->>'keterangan'), btrim(input->>'bank'),
    btrim(input->>'rekening'), proof, budget_id, actor.id, actor.nama_lengkap, actor.kelompok,
    to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD'));
END;
$$;

CREATE OR REPLACE FUNCTION public.create_portal_mutasi(request_id uuid, input jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor public.profiles%ROWTYPE;
  previous public.kas_mutasi%ROWTYPE;
  budget_id uuid;
  amount bigint;
BEGIN
  SELECT * INTO actor FROM public.profiles WHERE id = auth.uid();
  IF actor.id IS NULL OR actor.level = 'guest' OR actor.level NOT IN ('admin','inti') THEN RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501'; END IF;
  IF request_id IS NULL OR jsonb_typeof(input) IS DISTINCT FROM 'object'
    OR NOT input ?& ARRAY['deskripsi','jenis','nominal','kategori','sumberDana','pagu_anggaran_id']
    OR input - ARRAY['deskripsi','jenis','nominal','kategori','sumberDana','pagu_anggaran_id'] <> '{}'::jsonb
    OR jsonb_typeof(input->'nominal') IS DISTINCT FROM 'number'
    OR jsonb_typeof(input->'deskripsi') IS DISTINCT FROM 'string'
    OR jsonb_typeof(input->'jenis') IS DISTINCT FROM 'string'
    OR jsonb_typeof(input->'kategori') IS DISTINCT FROM 'string'
    OR jsonb_typeof(input->'sumberDana') IS DISTINCT FROM 'string'
    OR length(btrim(input->>'deskripsi')) NOT BETWEEN 1 AND 10000
    OR length(btrim(input->>'kategori')) NOT BETWEEN 1 AND 500
    OR length(btrim(input->>'sumberDana')) NOT BETWEEN 1 AND 500
    OR input->>'jenis' NOT IN ('Masuk','Keluar')
    OR (input->>'nominal')::numeric NOT BETWEEN 1 AND 9007199254740991
    OR (input->>'nominal')::numeric <> trunc((input->>'nominal')::numeric)
  THEN RAISE EXCEPTION 'Invalid input' USING ERRCODE = '22023'; END IF;
  amount := (input->>'nominal')::bigint;
  budget_id := (input->>'pagu_anggaran_id')::uuid;
  IF (input->>'jenis' = 'Keluar' AND budget_id IS NULL) OR (input->>'jenis' = 'Masuk' AND budget_id IS NOT NULL)
  THEN RAISE EXCEPTION 'Invalid budget' USING ERRCODE = '22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(request_id::text, 0));
  SELECT * INTO previous FROM public.kas_mutasi WHERE id = request_id;
  IF FOUND THEN
    IF previous.dicatat_oleh IS DISTINCT FROM actor.id OR previous.reimburse_id IS NOT NULL OR
      ROW(previous.deskripsi, previous.jenis, previous.nominal, previous.kategori, previous.sumber_dana, previous.pagu_anggaran_id)
      IS DISTINCT FROM ROW(btrim(input->>'deskripsi'), input->>'jenis', amount, btrim(input->>'kategori'), btrim(input->>'sumberDana'), budget_id)
    THEN RAISE EXCEPTION 'Pengajuan berubah' USING ERRCODE = '22023'; END IF;
    RETURN;
  END IF;
  IF budget_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.pagu_anggaran WHERE id = budget_id
    AND tahun_anggaran = extract(year FROM now() AT TIME ZONE 'Asia/Jakarta'))
  THEN RAISE EXCEPTION 'Pos tahun berjalan tidak tersedia' USING ERRCODE = '22023'; END IF;
  INSERT INTO public.kas_mutasi(id, deskripsi, jenis, nominal, kategori, sumber_dana, pagu_anggaran_id, dicatat_oleh, dicatat_oleh_nama, tgl)
  VALUES(request_id, btrim(input->>'deskripsi'), input->>'jenis', amount, btrim(input->>'kategori'), btrim(input->>'sumberDana'), budget_id,
    actor.id, actor.nama_lengkap, (now() AT TIME ZONE 'Asia/Jakarta')::date);
END;
$$;

CREATE OR REPLACE FUNCTION public.decide_portal_reimburse(target_id uuid, decision text, reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor public.profiles%ROWTYPE;
  claim public.reimburse%ROWTYPE;
BEGIN
  SELECT * INTO actor FROM public.profiles WHERE id = auth.uid();
  IF actor.id IS NULL OR actor.level = 'guest' THEN RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501'; END IF;
  IF decision IS NULL OR decision NOT IN ('cancel','reject') OR reason IS NULL OR length(btrim(reason)) NOT BETWEEN 1 AND 10000
  THEN RAISE EXCEPTION 'Alasan wajib diisi' USING ERRCODE = '22023'; END IF;
  SELECT * INTO claim FROM public.reimburse WHERE id = target_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Claim not found'; END IF;
  IF (decision = 'cancel' AND claim.pemohon_id IS DISTINCT FROM actor.id) OR (decision = 'reject' AND actor.level NOT IN ('admin','inti'))
  THEN RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501'; END IF;
  IF coalesce(claim.status, 'Menunggu Approval Bendahara') <> 'Menunggu Approval Bendahara'
  THEN RAISE EXCEPTION 'Data berubah' USING ERRCODE = '40001'; END IF;
  UPDATE public.reimburse SET status = CASE WHEN decision = 'cancel' THEN 'Dibatalkan' ELSE 'Ditolak' END WHERE id = target_id;
  INSERT INTO public.reimburse_approval(reimburse_id, step_order, role_label, actor_name, status, acted_at, reason)
  VALUES(target_id, 99, actor.jabatan, actor.nama_lengkap, CASE WHEN decision = 'cancel' THEN 'Dibatalkan' ELSE 'Ditolak' END, now(), btrim(reason));
END;
$$;

CREATE OR REPLACE FUNCTION public.disburse_portal_reimburse(target_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor public.profiles%ROWTYPE;
  claim public.reimburse%ROWTYPE;
BEGIN
  SELECT * INTO actor FROM public.profiles WHERE id = auth.uid();
  IF actor.id IS NULL OR actor.level = 'guest' OR actor.level NOT IN ('admin','inti') THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO claim FROM public.reimburse WHERE id = target_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Claim not found'; END IF;
  IF claim.status = 'Selesai / Dicairkan' THEN
    IF EXISTS (SELECT 1 FROM public.kas_mutasi WHERE reimburse_id = target_id) THEN RETURN; END IF;
    RAISE EXCEPTION 'Legacy disbursement requires reconciliation';
  END IF;
  IF coalesce(claim.status, 'Menunggu Approval Bendahara') <> 'Menunggu Approval Bendahara' THEN RAISE EXCEPTION 'Invalid claim status'; END IF;
  INSERT INTO public.kas_mutasi (tgl, deskripsi, jenis, nominal, kategori, sumber_dana, dicatat_oleh, dicatat_oleh_nama, reimburse_id, pagu_anggaran_id)
  VALUES ((now() AT TIME ZONE 'Asia/Jakarta')::date, 'Pencairan Reimburse: ' || claim.proker,
    'Keluar', claim.nominal, claim.divisi, 'Kas Utama', actor.id, actor.nama_lengkap, target_id, claim.pagu_anggaran_id);
  INSERT INTO public.reimburse_approval (reimburse_id, step_order, role_label, actor_name, status, acted_at)
  VALUES (target_id, 99, actor.jabatan, actor.nama_lengkap, 'Disetujui / Ditransfer', now());
  UPDATE public.reimburse SET status = 'Selesai / Dicairkan' WHERE id = target_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_panitia_request(request_id UUID, input JSONB)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor public.profiles%ROWTYPE; target public.divisi%ROWTYPE; existing public.panitia_requests%ROWTYPE; origin public.divisi%ROWTYPE;
BEGIN
  SELECT * INTO actor FROM public.profiles WHERE id = auth.uid() FOR SHARE;
  IF actor.id IS NULL OR actor.level = 'guest' OR (actor.level <> 'admin' AND (actor.level <> 'kadiv' OR actor.divisi_id IS NULL)) THEN RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501'; END IF;
  SELECT * INTO origin FROM public.divisi WHERE id = CASE WHEN actor.level = 'admin' THEN input->>'divisi_asal_id' ELSE actor.divisi_id END FOR SHARE;
  IF origin.id IS NULL THEN RAISE EXCEPTION 'Divisi asal tidak valid.'; END IF;
  SELECT * INTO target FROM public.divisi WHERE id = input->>'divisi_tujuan_id' FOR SHARE;
  IF target.id IS NULL OR target.bidang_id = origin.bidang_id THEN RAISE EXCEPTION 'Pilih divisi dari bidang lain.'; END IF;
  PERFORM 1 FROM public.profiles WHERE level = 'kadiv' AND divisi_id = target.id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Divisi tujuan belum memiliki Kadiv.'; END IF;
  IF (input->>'deadline_respons')::timestamptz <= clock_timestamp() THEN RAISE EXCEPTION 'Deadline harus di masa depan.'; END IF;
  INSERT INTO public.panitia_requests (id,judul,deskripsi,pemohon_id,pemohon_nama,divisi_asal_id,divisi_tujuan_id,jumlah,deadline_respons,mulai_at,selesai_at)
  VALUES (request_id,btrim(input->>'judul'),btrim(input->>'deskripsi'),actor.id,actor.nama_lengkap,origin.id,target.id,
    (input->>'jumlah')::integer,(input->>'deadline_respons')::timestamptz,(input->>'mulai_at')::timestamptz,(input->>'selesai_at')::timestamptz)
  ON CONFLICT (id) DO NOTHING;
  IF NOT FOUND THEN
    SELECT * INTO existing FROM public.panitia_requests WHERE id = request_id;
    IF existing.pemohon_id IS DISTINCT FROM actor.id OR existing.judul IS DISTINCT FROM btrim(input->>'judul')
      OR existing.divisi_asal_id IS DISTINCT FROM origin.id
      OR existing.deskripsi IS DISTINCT FROM btrim(input->>'deskripsi') OR existing.divisi_tujuan_id IS DISTINCT FROM target.id
      OR existing.jumlah IS DISTINCT FROM (input->>'jumlah')::integer
      OR existing.deadline_respons IS DISTINCT FROM (input->>'deadline_respons')::timestamptz
      OR existing.mulai_at IS DISTINCT FROM (input->>'mulai_at')::timestamptz
      OR existing.selesai_at IS DISTINCT FROM (input->>'selesai_at')::timestamptz THEN
      RAISE EXCEPTION 'Pengajuan berubah. Muat ulang.' USING ERRCODE = '40001';
    END IF;
    RETURN;
  END IF;
  INSERT INTO public.panitia_history(request_id,actor_id,actor_name,action,new_status)
  VALUES(request_id,actor.id,actor.nama_lengkap,'created','pending');
END;
$$;

CREATE OR REPLACE FUNCTION public.decide_panitia_request(target_id UUID, expected_version INTEGER, approve BOOLEAN, reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor public.profiles%ROWTYPE; req public.panitia_requests%ROWTYPE; next_status TEXT;
BEGIN
  SELECT * INTO actor FROM public.profiles WHERE id = auth.uid() FOR SHARE;
  SELECT * INTO req FROM public.panitia_requests WHERE id = target_id FOR UPDATE;
  IF actor.id IS NULL OR actor.level = 'guest' OR (actor.level <> 'admin' AND (actor.level <> 'kadiv' OR actor.divisi_id IS DISTINCT FROM req.divisi_tujuan_id)) OR req.id IS NULL THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;
  IF req.version IS DISTINCT FROM expected_version OR req.status <> 'pending' THEN RAISE EXCEPTION 'Data berubah. Muat ulang.' USING ERRCODE = '40001'; END IF;
  IF clock_timestamp() >= req.mulai_at THEN RAISE EXCEPTION 'Waktu penugasan sudah dimulai.'; END IF;
  IF approve IS NULL OR reason IS NULL OR length(reason) > 10000 OR (NOT approve AND length(btrim(reason)) = 0) THEN RAISE EXCEPTION 'Alasan keputusan tidak valid.'; END IF;
  next_status := CASE WHEN approve THEN 'approved' ELSE 'rejected' END;
  UPDATE public.panitia_requests SET status = next_status, decision_at = clock_timestamp(), updated_at = clock_timestamp(), version = version + 1 WHERE id = target_id;
  INSERT INTO public.panitia_history(request_id,actor_id,actor_name,action,old_status,new_status,reason)
  VALUES(target_id,actor.id,actor.nama_lengkap,next_status,req.status,next_status,btrim(reason));
END;
$$;

CREATE OR REPLACE FUNCTION public.set_panitia_assignments(target_id UUID, expected_version INTEGER, member_ids UUID[], reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor public.profiles%ROWTYPE; req public.panitia_requests%ROWTYPE; next_status TEXT; additions JSONB; removals JSONB; member_count INTEGER;
BEGIN
  SELECT * INTO actor FROM public.profiles WHERE id = auth.uid() FOR SHARE;
  SELECT * INTO req FROM public.panitia_requests WHERE id = target_id FOR UPDATE;
  IF actor.id IS NULL OR actor.level = 'guest' OR (actor.level <> 'admin' AND (actor.level <> 'kadiv' OR actor.divisi_id IS DISTINCT FROM req.divisi_tujuan_id)) OR req.id IS NULL THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;
  IF req.version IS DISTINCT FROM expected_version OR req.status NOT IN ('approved','partially_assigned','assigned') THEN RAISE EXCEPTION 'Data berubah. Muat ulang.' USING ERRCODE = '40001'; END IF;
  IF clock_timestamp() >= req.mulai_at THEN RAISE EXCEPTION 'Waktu penugasan sudah dimulai.'; END IF;
  IF member_ids IS NULL OR reason IS NULL OR length(btrim(reason)) NOT BETWEEN 1 AND 10000 THEN RAISE EXCEPTION 'Alasan perubahan wajib diisi.'; END IF;
  member_count := cardinality(member_ids);
  IF member_count > req.jumlah OR member_count <> (SELECT count(DISTINCT id) FROM unnest(member_ids) id) THEN RAISE EXCEPTION 'Jumlah atau anggota duplikat tidak valid.'; END IF;
  PERFORM 1 FROM public.profiles WHERE id = ANY(member_ids) ORDER BY id FOR SHARE;
  IF member_count <> (SELECT count(*) FROM public.profiles WHERE id = ANY(member_ids) AND level = 'staff' AND divisi_id = req.divisi_tujuan_id) THEN
    RAISE EXCEPTION 'Anggota harus berasal dari divisi tujuan.' USING ERRCODE = '42501';
  END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id,'nama',p.nama_lengkap)), '[]') INTO additions
  FROM public.profiles p WHERE p.id = ANY(member_ids) AND NOT EXISTS (SELECT 1 FROM public.panitia_assignments a WHERE a.request_id = target_id AND a.user_id = p.id);
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',a.user_id,'nama',a.nama)), '[]') INTO removals
  FROM public.panitia_assignments a WHERE a.request_id = target_id AND NOT (a.user_id = ANY(member_ids));
  IF additions = '[]'::jsonb AND removals = '[]'::jsonb THEN RETURN; END IF;
  DELETE FROM public.panitia_assignments WHERE request_id = target_id AND NOT (user_id = ANY(member_ids));
  INSERT INTO public.panitia_assignments(request_id,user_id,nama)
  SELECT target_id,id,nama_lengkap FROM public.profiles WHERE id = ANY(member_ids) ON CONFLICT(request_id,user_id) DO NOTHING;
  next_status := CASE WHEN member_count = 0 THEN 'approved' WHEN member_count < req.jumlah THEN 'partially_assigned' ELSE 'assigned' END;
  UPDATE public.panitia_requests SET status = next_status, updated_at = clock_timestamp(), version = version + 1 WHERE id = target_id;
  INSERT INTO public.panitia_history(request_id,actor_id,actor_name,action,old_status,new_status,reason,added,removed)
  VALUES(target_id,actor.id,actor.nama_lengkap,'assignments',req.status,next_status,btrim(reason),additions,removals);
END;
$$;

CREATE OR REPLACE FUNCTION public.save_portal_pengumuman(target_id UUID, expected_version INTEGER, input JSONB)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor public.profiles%ROWTYPE; item public.pengumuman%ROWTYPE;
BEGIN
  SELECT * INTO actor FROM public.profiles WHERE id = auth.uid() FOR SHARE;
  IF actor.id IS NULL OR actor.level = 'guest' OR (actor.level IN ('admin','inti') OR actor.bidang_id = 'branding') IS NOT TRUE THEN RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501'; END IF;
  IF coalesce(length(btrim(input->>'judul')),0) NOT BETWEEN 1 AND 300 OR coalesce(length(btrim(input->>'isi')),0) NOT BETWEEN 1 AND 10000
    OR coalesce(length(btrim(input->>'target')),0) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Isian pengumuman tidak valid.'; END IF;
  IF expected_version = -1 THEN
    INSERT INTO public.pengumuman(id,judul,kategori,target,isi,penulis_id,penulis_nama,mulai_at,selesai_at,deadline_konfirmasi)
    VALUES(target_id,btrim(input->>'judul'),input->>'kategori',btrim(input->>'target'),btrim(input->>'isi'),actor.id,actor.nama_lengkap,
      (input->>'mulai_at')::timestamptz,(input->>'selesai_at')::timestamptz,(input->>'deadline_konfirmasi')::timestamptz);
  ELSE
    SELECT * INTO item FROM public.pengumuman WHERE id = target_id FOR UPDATE;
    IF item.id IS NULL OR item.version IS DISTINCT FROM expected_version OR item.cancelled_at IS NOT NULL THEN RAISE EXCEPTION 'Data berubah. Muat ulang.' USING ERRCODE = '40001'; END IF;
    UPDATE public.pengumuman SET judul = btrim(input->>'judul'), kategori = input->>'kategori', target = btrim(input->>'target'), isi = btrim(input->>'isi'),
      mulai_at = (input->>'mulai_at')::timestamptz, selesai_at = (input->>'selesai_at')::timestamptz, deadline_konfirmasi = (input->>'deadline_konfirmasi')::timestamptz,
      updated_at = clock_timestamp(), version = version + 1 WHERE id = target_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_portal_pengumuman(target_id UUID, expected_version INTEGER, reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor public.profiles%ROWTYPE; item public.pengumuman%ROWTYPE;
BEGIN
  SELECT * INTO actor FROM public.profiles WHERE id = auth.uid() FOR SHARE;
  IF actor.id IS NULL OR actor.level = 'guest' OR (actor.level IN ('admin','inti') OR actor.bidang_id = 'branding') IS NOT TRUE THEN RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501'; END IF;
  SELECT * INTO item FROM public.pengumuman WHERE id = target_id FOR UPDATE;
  IF item.id IS NULL OR item.version IS DISTINCT FROM expected_version OR item.cancelled_at IS NOT NULL THEN RAISE EXCEPTION 'Data berubah. Muat ulang.' USING ERRCODE = '40001'; END IF;
  IF reason IS NULL OR length(btrim(reason)) NOT BETWEEN 1 AND 10000 THEN RAISE EXCEPTION 'Alasan pembatalan wajib diisi.'; END IF;
  UPDATE public.pengumuman SET cancelled_at = clock_timestamp(), cancellation_reason = btrim(reason), updated_at = clock_timestamp(), version = version + 1 WHERE id = target_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_tiket_deadline(target_id UUID, deadline_value TIMESTAMPTZ)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor public.profiles%ROWTYPE; ticket public.tiket_info%ROWTYPE;
BEGIN
  SELECT * INTO actor FROM public.profiles WHERE id = auth.uid() FOR SHARE;
  SELECT * INTO ticket FROM public.tiket_info WHERE id = target_id FOR UPDATE;
  IF actor.id IS NULL OR actor.level = 'guest' OR ticket.id IS NULL OR (actor.level IN ('admin','inti','kabid') OR ticket.pemohon_id = actor.id) IS NOT TRUE THEN RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501'; END IF;
  UPDATE public.tiket_info SET deadline_at = deadline_value, updated_at = clock_timestamp() WHERE id = target_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_portal_media(target_id UUID, expected_version INTEGER, input JSONB)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor public.profiles%ROWTYPE; item public.media_resources%ROWTYPE; link TEXT;
BEGIN
  SELECT * INTO actor FROM public.profiles WHERE id = auth.uid() FOR SHARE;
  IF actor.id IS NULL OR actor.level = 'guest' OR (actor.level IN ('admin','inti') OR actor.bidang_id = 'branding') IS NOT TRUE THEN RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501'; END IF;
  IF expected_version <> -1 THEN
    SELECT * INTO item FROM public.media_resources WHERE id = target_id FOR UPDATE;
    IF item.id IS NULL OR item.version IS DISTINCT FROM expected_version THEN RAISE EXCEPTION 'Data berubah. Muat ulang.' USING ERRCODE = '40001'; END IF;
  END IF;
  link := nullif(btrim(input->>'url'),'');
  IF expected_version = -1 OR link IS DISTINCT FROM item.url THEN
    IF link IS NULL OR length(link) > 2048 OR NOT (
      link ~ '^https://drive[.]google[.]com/file/d/[A-Za-z0-9_-]+(/(view|preview))?/?([?][^#[:space:]]*)?$'
      OR link ~ '^https://drive[.]google[.]com/open[?]([^#[:space:]]*&)?id=[A-Za-z0-9_-]+(&[^#[:space:]]*)?$'
    ) THEN RAISE EXCEPTION 'Gunakan link file Google Drive.'; END IF;
  END IF;
  IF coalesce(length(btrim(input->>'deskripsi')),0) NOT BETWEEN 1 AND 10000 THEN RAISE EXCEPTION 'Deskripsi wajib diisi.'; END IF;
  IF expected_version = -1 THEN
    INSERT INTO public.media_resources(id,jenis,judul,deskripsi,url,created_by)
    VALUES(target_id,input->>'jenis',btrim(input->>'judul'),btrim(input->>'deskripsi'),link,actor.id);
  ELSE
    UPDATE public.media_resources SET jenis = input->>'jenis', judul = btrim(input->>'judul'), deskripsi = btrim(input->>'deskripsi'), url = link,
      updated_at = clock_timestamp(), version = version + 1 WHERE id = target_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_portal_media(target_id UUID, expected_version INTEGER, archive BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor public.profiles%ROWTYPE; item public.media_resources%ROWTYPE;
BEGIN
  SELECT * INTO actor FROM public.profiles WHERE id = auth.uid() FOR SHARE;
  IF actor.id IS NULL OR actor.level = 'guest' OR (actor.level IN ('admin','inti') OR actor.bidang_id = 'branding') IS NOT TRUE THEN RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501'; END IF;
  SELECT * INTO item FROM public.media_resources WHERE id = target_id FOR UPDATE;
  IF item.id IS NULL OR item.version IS DISTINCT FROM expected_version OR archive IS NULL THEN RAISE EXCEPTION 'Data berubah. Muat ulang.' USING ERRCODE = '40001'; END IF;
  UPDATE public.media_resources SET archived_at = CASE WHEN archive THEN clock_timestamp() ELSE NULL END, updated_at = clock_timestamp(), version = version + 1 WHERE id = target_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_portal_public_content(target_id UUID, expected_version INTEGER, input JSONB)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor public.profiles%ROWTYPE;
  item public.public_content%ROWTYPE;
  publication TIMESTAMPTZ;
BEGIN
  SELECT * INTO actor FROM public.profiles WHERE id = auth.uid() FOR SHARE;
  IF actor.id IS NULL OR actor.level = 'guest' OR (actor.level IN ('admin','inti') OR actor.bidang_id = 'branding') IS NOT TRUE THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;
  IF target_id IS NULL OR expected_version IS NULL OR expected_version < -1
    OR input IS NULL OR jsonb_typeof(input) <> 'object' THEN
    RAISE EXCEPTION 'Input tidak valid';
  END IF;
  IF NOT (input ?& ARRAY['jenis','judul','ringkasan','isi','status','mulai_at','selesai_at','lokasi'])
    OR EXISTS (SELECT 1 FROM jsonb_each(input) AS entry WHERE
      (entry.key IN ('jenis','judul','ringkasan','isi','status','lokasi') AND jsonb_typeof(entry.value) <> 'string') OR
      (entry.key IN ('mulai_at','selesai_at') AND jsonb_typeof(entry.value) NOT IN ('string','null')) OR
      entry.key NOT IN ('jenis','judul','ringkasan','isi','status','mulai_at','selesai_at','lokasi')) THEN
    RAISE EXCEPTION 'Input tidak valid';
  END IF;
  IF expected_version = -1 THEN
    IF EXISTS (SELECT 1 FROM public.public_content WHERE id = target_id) THEN
      RAISE EXCEPTION 'Data berubah. Muat ulang.' USING ERRCODE = '40001';
    END IF;
  ELSE
    SELECT * INTO item FROM public.public_content WHERE id = target_id FOR UPDATE;
    IF item.id IS NULL OR item.version IS DISTINCT FROM expected_version THEN
      RAISE EXCEPTION 'Data berubah. Muat ulang.' USING ERRCODE = '40001';
    END IF;
  END IF;
  publication := CASE WHEN input->>'status' = 'published' THEN coalesce(item.published_at, clock_timestamp()) ELSE NULL END;
  IF expected_version = -1 THEN
    INSERT INTO public.public_content(id, jenis, judul, ringkasan, isi, status, mulai_at, selesai_at, lokasi, published_at)
    VALUES (target_id, input->>'jenis', btrim(input->>'judul'), btrim(input->>'ringkasan'), btrim(input->>'isi'),
      input->>'status', (input->>'mulai_at')::timestamptz, (input->>'selesai_at')::timestamptz, btrim(input->>'lokasi'), publication);
  ELSE
    UPDATE public.public_content SET jenis = input->>'jenis', judul = btrim(input->>'judul'),
      ringkasan = btrim(input->>'ringkasan'), isi = btrim(input->>'isi'), status = input->>'status',
      mulai_at = (input->>'mulai_at')::timestamptz, selesai_at = (input->>'selesai_at')::timestamptz,
      lokasi = btrim(input->>'lokasi'), published_at = publication, updated_at = clock_timestamp(), version = version + 1
    WHERE id = target_id;
  END IF;
END;
$$;

CREATE TABLE public.account_access_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id uuid REFERENCES public.profiles(id),
  target_id uuid NOT NULL REFERENCES public.profiles(id),
  before_profile jsonb NOT NULL,
  after_profile jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.account_access_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_access_history FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.account_access_history TO authenticated;
CREATE POLICY admin_history ON public.account_access_history FOR SELECT TO authenticated USING (public.is_portal_admin());

CREATE FUNCTION public.list_portal_accounts(search_text text, page_number integer)
RETURNS SETOF jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.is_portal_admin() THEN RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501'; END IF;
  IF search_text IS NULL OR length(search_text) > 200 OR page_number IS NULL OR page_number NOT BETWEEN 0 AND 100000 THEN
    RAISE EXCEPTION 'Invalid search' USING ERRCODE = '22023';
  END IF;
  RETURN QUERY SELECT to_jsonb(p) || jsonb_build_object('email_confirmed', u.email_confirmed_at IS NOT NULL AND lower(u.email) = lower(p.email))
  FROM public.profiles p JOIN auth.users u ON u.id = p.id
  WHERE position(lower(btrim(search_text)) in lower(p.nama_lengkap || ' ' || p.email)) > 0
  ORDER BY p.created_at DESC, p.id LIMIT 50 OFFSET (page_number * 50);
END;
$$;

CREATE FUNCTION public.set_portal_account_access(target_id uuid, expected_version integer, input jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor public.profiles%ROWTYPE; previous public.profiles%ROWTYPE; changed public.profiles%ROWTYPE;
  new_level text; new_field text; new_division text; field_name text; division_name text; title text;
BEGIN
  SELECT * INTO actor FROM public.profiles WHERE id = auth.uid() FOR SHARE;
  IF actor.id IS NULL OR actor.level <> 'admin' THEN RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501'; END IF;
  SELECT * INTO previous FROM public.profiles WHERE id = target_id FOR UPDATE;
  IF previous.id IS NULL OR previous.level = 'admin' THEN RAISE EXCEPTION 'Akun admin hanya diubah pemilik.' USING ERRCODE = '42501'; END IF;
  IF previous.access_version IS DISTINCT FROM expected_version THEN RAISE EXCEPTION 'Data berubah. Muat ulang.' USING ERRCODE = '40001'; END IF;
  IF jsonb_typeof(input) IS DISTINCT FROM 'object' OR NOT input ?& ARRAY['level','jabatan','bidang_id','divisi_id']
    OR input - ARRAY['level','jabatan','bidang_id','divisi_id'] <> '{}'::jsonb
    OR jsonb_typeof(input->'level') IS DISTINCT FROM 'string' OR jsonb_typeof(input->'jabatan') IS DISTINCT FROM 'string'
    OR jsonb_typeof(input->'bidang_id') NOT IN ('string','null') OR jsonb_typeof(input->'divisi_id') NOT IN ('string','null') THEN
    RAISE EXCEPTION 'Input tidak valid.' USING ERRCODE = '22023';
  END IF;
  new_level := input->>'level'; new_field := input->>'bidang_id'; new_division := input->>'divisi_id'; title := btrim(input->>'jabatan');
  IF new_level NOT IN ('guest','inti','kabid','kadiv','staff') OR length(title) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'Role atau jabatan tidak valid.' USING ERRCODE = '22023';
  END IF;
  IF new_level <> 'guest' AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = target_id AND u.email_confirmed_at IS NOT NULL
    AND lower(u.email) = lower(previous.email) AND lower(split_part(u.email,'@',2)) = 'gmail.com') THEN
    RAISE EXCEPTION 'Gmail belum terverifikasi.' USING ERRCODE = '22023';
  END IF;
  IF (new_level IN ('guest','inti') AND (new_field IS NOT NULL OR new_division IS NOT NULL))
    OR (new_level = 'kabid' AND (new_field IS NULL OR new_division IS NOT NULL))
    OR (new_level IN ('kadiv','staff') AND (new_field IS NULL OR new_division IS NULL)) THEN
    RAISE EXCEPTION 'Penempatan tidak valid.' USING ERRCODE = '22023';
  END IF;
  SELECT nama INTO field_name FROM public.bidang WHERE id = new_field;
  SELECT nama INTO division_name FROM public.divisi WHERE id = new_division AND bidang_id = new_field;
  IF (new_field IS NOT NULL AND field_name IS NULL) OR (new_division IS NOT NULL AND division_name IS NULL) THEN
    RAISE EXCEPTION 'Bidang/divisi tidak cocok.' USING ERRCODE = '22023';
  END IF;
  UPDATE public.profiles SET level = new_level, jabatan = CASE WHEN new_level = 'guest' THEN 'Tamu' ELSE title END,
    bidang_id = new_field, divisi_id = new_division,
    bidang_divisi = coalesce(division_name,field_name,CASE WHEN new_level = 'inti' THEN 'Pengurus Inti' ELSE '-' END),
    kelompok = coalesce(field_name,CASE WHEN new_level = 'inti' THEN 'Pengurus Inti' ELSE '-' END),
    access_version = access_version + 1
  WHERE id = target_id RETURNING * INTO changed;
  INSERT INTO public.account_access_history(actor_id,target_id,before_profile,after_profile)
  VALUES(actor.id,target_id,to_jsonb(previous),to_jsonb(changed));
END;
$$;
REVOKE ALL ON FUNCTION public.list_portal_accounts(text,integer), public.set_portal_account_access(uuid,integer,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_portal_accounts(text,integer), public.set_portal_account_access(uuid,integer,jsonb) TO authenticated;

-- Auth owns email verification. Keep the display email in sync after a confirmed email change.
CREATE FUNCTION public.sync_portal_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    IF lower(split_part(NEW.email,'@',2)) IS DISTINCT FROM 'gmail.com' THEN
      RAISE EXCEPTION 'Gunakan alamat @gmail.com.' USING ERRCODE = '22023';
    END IF;
    UPDATE public.profiles SET email = lower(NEW.email), access_version = access_version + 1 WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_portal_email() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER sync_portal_email AFTER UPDATE OF email ON auth.users FOR EACH ROW EXECUTE FUNCTION public.sync_portal_email();
-- A public schema gate keeps the application signup closed on an unmigrated database.
CREATE FUNCTION public.portal_signup_ready()
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = '' AS $$ SELECT true; $$;
REVOKE ALL ON FUNCTION public.portal_signup_ready() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_signup_ready() TO anon, authenticated;
COMMIT;
