-- Surat baru memakai nomor tahunan atomik. Surat historis tidak dinomori ulang.
BEGIN;
CREATE TABLE public.surat_counters (
  tahun integer PRIMARY KEY,
  terakhir bigint NOT NULL CHECK (terakhir > 0)
);
CREATE TABLE public.surat_drive_connection (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  encrypted_token text NOT NULL,
  folder_id text,
  folder_name text,
  connected_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.surat_exports (
  surat_id uuid PRIMARY KEY REFERENCES public.surat(id) ON DELETE CASCADE,
  claim_id uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  file_id text
);
ALTER TABLE public.surat_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surat_drive_connection ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surat_exports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.surat_counters, public.surat_drive_connection, public.surat_exports FROM PUBLIC, anon, authenticated;
ALTER TABLE public.surat ADD COLUMN export_status text NOT NULL DEFAULT 'pending'
  CHECK (export_status IN ('pending', 'uploading', 'ready', 'failed'));
ALTER TABLE public.surat ADD COLUMN export_error text;
-- Batasi jalur tulis agar nomor/status/identitas tidak dapat dikirim langsung oleh browser.
REVOKE INSERT, UPDATE, DELETE ON public.surat FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.create_portal_surat(request_id uuid, input jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor public.profiles%ROWTYPE;
  previous public.surat%ROWTYPE;
  local_date date := (now() AT TIME ZONE 'Asia/Jakarta')::date;
  annual_number bigint;
  kind_code text;
  approved boolean;
BEGIN
  SELECT * INTO actor FROM public.profiles WHERE id = auth.uid();
  IF actor.id IS NULL OR actor.level NOT IN ('kabid', 'inti', 'admin') THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;
  IF request_id IS NULL OR jsonb_typeof(input) IS DISTINCT FROM 'object'
    OR NOT input ?& ARRAY['jenis','perihal','tujuan','urgensi','keterangan']
    OR input - ARRAY['jenis','perihal','tujuan','urgensi','keterangan'] <> '{}'::jsonb
    OR jsonb_typeof(input->'jenis') IS DISTINCT FROM 'string'
    OR jsonb_typeof(input->'perihal') IS DISTINCT FROM 'string'
    OR jsonb_typeof(input->'tujuan') IS DISTINCT FROM 'string'
    OR jsonb_typeof(input->'urgensi') IS DISTINCT FROM 'string'
    OR jsonb_typeof(input->'keterangan') IS DISTINCT FROM 'string'
    OR input->>'jenis' NOT IN ('Surat Tugas','Surat Undangan','Surat Permohonan','Surat Rekomendasi')
    OR input->>'urgensi' NOT IN ('Rendah','Sedang','Tinggi')
    OR length(btrim(input->>'perihal')) NOT BETWEEN 1 AND 300
    OR length(btrim(input->>'tujuan')) NOT BETWEEN 1 AND 500
    OR length(btrim(input->>'keterangan')) > 10000 THEN
    RAISE EXCEPTION 'Invalid input' USING ERRCODE = '22023';
  END IF;
  -- Serialisasi request yang sama, termasuk saat dua retry tiba bersamaan.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(request_id::text, 0));
  SELECT * INTO previous FROM public.surat WHERE id = request_id;
  IF FOUND THEN
    IF previous.pemohon_id IS DISTINCT FROM actor.id
      OR previous.jenis IS DISTINCT FROM input->>'jenis'
      OR previous.perihal IS DISTINCT FROM btrim(input->>'perihal')
      OR previous.tujuan IS DISTINCT FROM btrim(input->>'tujuan')
      OR previous.urgensi IS DISTINCT FROM input->>'urgensi'
      OR previous.keterangan IS DISTINCT FROM btrim(input->>'keterangan') THEN
      RAISE EXCEPTION 'Request does not match' USING ERRCODE = '22023';
    END IF;
    RETURN;
  END IF;
  INSERT INTO public.surat_counters(tahun, terakhir) VALUES (extract(year FROM local_date)::integer, 1)
  ON CONFLICT (tahun) DO UPDATE SET terakhir = public.surat_counters.terakhir + 1
  RETURNING terakhir INTO annual_number;
  kind_code := CASE input->>'jenis' WHEN 'Surat Tugas' THEN 'ST' WHEN 'Surat Undangan' THEN 'SU'
    WHEN 'Surat Permohonan' THEN 'SPm' ELSE 'SR' END;
  approved := actor.level IN ('inti','admin');
  INSERT INTO public.surat(id, nomor_surat, jenis, perihal, tujuan, urgensi, keterangan,
    pemohon_id, pemohon_nama, divisi, status, tanggal)
  VALUES (request_id,
    CASE WHEN annual_number < 1000 THEN lpad(annual_number::text, 3, '0') ELSE annual_number::text END
      || '/' || kind_code || '/FG-DPK/' || btrim(to_char(local_date, 'RM')) || '/' || extract(year FROM local_date)::text,
    input->>'jenis', btrim(input->>'perihal'), btrim(input->>'tujuan'), input->>'urgensi', btrim(input->>'keterangan'),
    actor.id, actor.nama_lengkap, actor.kelompok,
    CASE WHEN approved THEN 'Selesai / Disetujui' ELSE 'Menunggu Persetujuan Inti' END,
    to_char(local_date, 'YYYY-MM-DD'));
  IF approved THEN
    INSERT INTO public.surat_approval(surat_id, step_order, step_label, actor_name, status, acted_at)
    VALUES (request_id, 99, 'ACC otomatis: ' || actor.jabatan, actor.nama_lengkap, 'Disetujui', now());
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_portal_surat(target_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor public.profiles%ROWTYPE; letter public.surat%ROWTYPE;
BEGIN
  SELECT * INTO actor FROM public.profiles WHERE id = auth.uid();
  IF actor.id IS NULL OR actor.level NOT IN ('inti','admin') THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO letter FROM public.surat WHERE id = target_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Letter not found'; END IF;
  IF letter.status IN ('Selesai / Terbit (QR ACC)', 'Selesai / Disetujui') THEN RETURN; END IF;
  IF letter.status IS NULL OR letter.status NOT LIKE 'Menunggu%' THEN RAISE EXCEPTION 'Invalid letter status'; END IF;
  INSERT INTO public.surat_approval(surat_id, step_order, step_label, actor_name, status, acted_at)
  VALUES (target_id, 99, 'ACC: ' || actor.jabatan, actor.nama_lengkap, 'Disetujui', now());
  UPDATE public.surat SET status = 'Selesai / Disetujui' WHERE id = target_id;
END;
$$;

CREATE FUNCTION public.get_portal_drive_connection()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND level IN ('inti','admin')) THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;
  RETURN (SELECT jsonb_build_object('encrypted_token', encrypted_token, 'folder_id', folder_id, 'folder_name', folder_name)
    FROM public.surat_drive_connection WHERE singleton);
END;
$$;
CREATE FUNCTION public.save_portal_drive_connection(token_value text, folder_value text DEFAULT NULL, name_value text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND level = 'admin') THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;
  IF token_value IS NOT NULL THEN
    IF length(token_value) NOT BETWEEN 20 AND 20000 THEN RAISE EXCEPTION 'Invalid token'; END IF;
    INSERT INTO public.surat_drive_connection(singleton, encrypted_token, connected_by)
    VALUES (true, token_value, auth.uid()) ON CONFLICT (singleton) DO UPDATE
      SET encrypted_token = excluded.encrypted_token, folder_id = NULL, folder_name = NULL,
        connected_by = auth.uid(), updated_at = now();
  ELSE
    IF folder_value IS NULL OR folder_value !~ '^[A-Za-z0-9_-]{1,200}$'
      OR name_value IS NULL OR length(name_value) > 500 THEN RAISE EXCEPTION 'Invalid folder'; END IF;
    UPDATE public.surat_drive_connection SET folder_id = folder_value, folder_name = name_value, updated_at = now() WHERE singleton;
    IF NOT FOUND THEN RAISE EXCEPTION 'Connect Google first'; END IF;
  END IF;
END;
$$;

CREATE FUNCTION public.claim_portal_surat_export(target_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE letter public.surat%ROWTYPE; job public.surat_exports%ROWTYPE; claim uuid := gen_random_uuid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND level IN ('inti','admin')) THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO letter FROM public.surat WHERE id = target_id FOR UPDATE;
  IF NOT FOUND OR letter.status IS NULL OR letter.status NOT IN ('Selesai / Terbit (QR ACC)', 'Selesai / Disetujui') THEN
    RAISE EXCEPTION 'Letter not approved';
  END IF;
  IF letter.file_pdf_url IS NOT NULL THEN RETURN NULL; END IF;
  SELECT * INTO job FROM public.surat_exports WHERE surat_id = target_id;
  IF FOUND AND letter.export_status = 'uploading' AND job.expires_at > now() THEN
    RAISE EXCEPTION 'Export in progress' USING ERRCODE = '40001';
  END IF;
  INSERT INTO public.surat_exports(surat_id, claim_id, expires_at) VALUES (target_id, claim, now() + interval '2 minutes')
  ON CONFLICT (surat_id) DO UPDATE SET claim_id = excluded.claim_id, expires_at = excluded.expires_at;
  UPDATE public.surat SET export_status = 'uploading', export_error = NULL WHERE id = target_id;
  RETURN jsonb_build_object('claim_id', claim, 'file_id', job.file_id);
END;
$$;
CREATE FUNCTION public.finish_portal_surat_export(target_id uuid, claim_value uuid, file_value text, outcome text, error_value text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE job public.surat_exports%ROWTYPE;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND level IN ('inti','admin')) THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;
  -- Gardu lock sama dengan claim; respons lama tidak boleh menimpa retry baru.
  PERFORM 1 FROM public.surat WHERE id = target_id FOR UPDATE;
  SELECT * INTO job FROM public.surat_exports WHERE surat_id = target_id;
  IF NOT FOUND OR job.claim_id IS DISTINCT FROM claim_value THEN
    RAISE EXCEPTION 'Stale export' USING ERRCODE = '40001';
  END IF;
  IF EXISTS (SELECT 1 FROM public.surat WHERE id = target_id AND file_pdf_url IS NOT NULL) THEN RETURN; END IF;
  IF outcome NOT IN ('uploading','ready','failed') OR outcome IS NULL
    OR (file_value IS NOT NULL AND file_value !~ '^[A-Za-z0-9_-]{1,200}$')
    OR (job.file_id IS NOT NULL AND file_value IS DISTINCT FROM job.file_id)
    OR (outcome = 'ready' AND file_value IS NULL) THEN RAISE EXCEPTION 'Invalid export'; END IF;
  UPDATE public.surat_exports SET file_id = file_value WHERE surat_id = target_id;
  UPDATE public.surat SET export_status = outcome,
    export_error = CASE WHEN outcome = 'failed' THEN left(coalesce(error_value, 'Upload gagal. Coba lagi.'), 500) ELSE NULL END,
    file_pdf_url = CASE WHEN outcome = 'ready' THEN 'https://drive.google.com/file/d/' || file_value || '/view' ELSE file_pdf_url END
  WHERE id = target_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_portal_surat(uuid,jsonb), public.get_portal_drive_connection(),
  public.save_portal_drive_connection(text,text,text), public.claim_portal_surat_export(uuid),
  public.finish_portal_surat_export(uuid,uuid,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_portal_surat(uuid,jsonb), public.get_portal_drive_connection(),
  public.save_portal_drive_connection(text,text,text), public.claim_portal_surat_export(uuid),
  public.finish_portal_surat_export(uuid,uuid,text,text,text) TO authenticated;
COMMIT;
