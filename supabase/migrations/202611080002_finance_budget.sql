-- Stage 2: additive migration. Historical NULL links and terpakai are preserved.
BEGIN;
ALTER TABLE public.reimburse ADD COLUMN IF NOT EXISTS pagu_anggaran_id uuid REFERENCES public.pagu_anggaran(id);
ALTER TABLE public.kas_mutasi ADD COLUMN IF NOT EXISTS pagu_anggaran_id uuid REFERENCES public.pagu_anggaran(id);
ALTER TABLE public.reimburse_approval ADD COLUMN IF NOT EXISTS reason text;
ALTER TABLE public.pagu_anggaran DROP CONSTRAINT IF EXISTS pagu_anggaran_bidang_key;
CREATE UNIQUE INDEX IF NOT EXISTS pagu_anggaran_bidang_tahun ON public.pagu_anggaran(bidang, tahun_anggaran);
CREATE INDEX IF NOT EXISTS reimburse_budget ON public.reimburse(pagu_anggaran_id);
CREATE INDEX IF NOT EXISTS kas_budget ON public.kas_mutasi(pagu_anggaran_id);

-- Metadata only. Financial values retain their existing inti-only RLS.
CREATE OR REPLACE FUNCTION public.list_portal_budgets()
RETURNS TABLE(id uuid, bidang text, tahun_anggaran integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT b.id, b.bidang, b.tahun_anggaran FROM public.pagu_anggaran b
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid())
  ORDER BY b.tahun_anggaran DESC, b.bidang;
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
  IF actor.id IS NULL THEN RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501'; END IF;
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
  IF actor.id IS NULL OR actor.level <> 'inti' THEN RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501'; END IF;
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
  IF actor.id IS NULL THEN RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501'; END IF;
  IF decision IS NULL OR decision NOT IN ('cancel','reject') OR reason IS NULL OR length(btrim(reason)) NOT BETWEEN 1 AND 10000
  THEN RAISE EXCEPTION 'Alasan wajib diisi' USING ERRCODE = '22023'; END IF;
  SELECT * INTO claim FROM public.reimburse WHERE id = target_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Claim not found'; END IF;
  IF (decision = 'cancel' AND claim.pemohon_id IS DISTINCT FROM actor.id) OR (decision = 'reject' AND actor.level <> 'inti')
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
  IF actor.id IS NULL OR actor.level <> 'inti' THEN
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

REVOKE ALL ON FUNCTION public.list_portal_budgets(), public.create_portal_reimburse(uuid,jsonb), public.create_portal_mutasi(uuid,jsonb), public.decide_portal_reimburse(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_portal_budgets(), public.create_portal_reimburse(uuid,jsonb), public.create_portal_mutasi(uuid,jsonb), public.decide_portal_reimburse(uuid,text,text) TO authenticated;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'pagu_anggaran') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pagu_anggaran;
  END IF;
END $$;
COMMIT;
