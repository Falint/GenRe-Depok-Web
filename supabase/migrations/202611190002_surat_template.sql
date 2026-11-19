-- Tambah rincian kegiatan tanpa mengubah nomor, isi, atau riwayat surat lama.
BEGIN;
ALTER TABLE public.surat ADD COLUMN IF NOT EXISTS tanggal_kegiatan date;
ALTER TABLE public.surat ADD COLUMN IF NOT EXISTS waktu_kegiatan text;
ALTER TABLE public.surat ADD COLUMN IF NOT EXISTS tempat_kegiatan text;
ALTER TABLE public.surat ADD COLUMN IF NOT EXISTS sistem_pelaksanaan text;

CREATE OR REPLACE FUNCTION public.create_portal_surat(request_id uuid, input jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor public.profiles%ROWTYPE;
  previous public.surat%ROWTYPE;
  local_date date := (now() AT TIME ZONE 'Asia/Jakarta')::date;
  annual_number bigint;
  kind_code text;
  approved boolean;
  event_date date;
BEGIN
  SELECT * INTO actor FROM public.profiles WHERE id = auth.uid();
  IF actor.id IS NULL OR actor.level NOT IN ('kabid', 'inti', 'admin') THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;
  IF request_id IS NULL OR jsonb_typeof(input) IS DISTINCT FROM 'object'
    OR NOT input ?& ARRAY['jenis','perihal','tujuan','urgensi','keterangan','tanggal_kegiatan','waktu_kegiatan','tempat_kegiatan','sistem_pelaksanaan']
    OR input - ARRAY['jenis','perihal','tujuan','urgensi','keterangan','tanggal_kegiatan','waktu_kegiatan','tempat_kegiatan','sistem_pelaksanaan'] <> '{}'::jsonb
    OR jsonb_typeof(input->'jenis') IS DISTINCT FROM 'string'
    OR jsonb_typeof(input->'perihal') IS DISTINCT FROM 'string'
    OR jsonb_typeof(input->'tujuan') IS DISTINCT FROM 'string'
    OR jsonb_typeof(input->'urgensi') IS DISTINCT FROM 'string'
    OR jsonb_typeof(input->'keterangan') IS DISTINCT FROM 'string'
    OR input->>'jenis' NOT IN ('Surat Tugas','Surat Undangan','Surat Permohonan','Surat Rekomendasi')
    OR input->>'urgensi' NOT IN ('Rendah','Sedang','Tinggi')
    OR length(btrim(input->>'perihal')) NOT BETWEEN 1 AND 300
    OR length(btrim(input->>'tujuan')) NOT BETWEEN 1 AND 500
    OR length(btrim(input->>'keterangan')) NOT BETWEEN 1 AND 10000
    OR jsonb_typeof(input->'tanggal_kegiatan') IS DISTINCT FROM 'string'
    OR jsonb_typeof(input->'waktu_kegiatan') IS DISTINCT FROM 'string'
    OR jsonb_typeof(input->'tempat_kegiatan') IS DISTINCT FROM 'string'
    OR jsonb_typeof(input->'sistem_pelaksanaan') IS DISTINCT FROM 'string'
    OR length(btrim(input->>'waktu_kegiatan')) > 500
    OR length(btrim(input->>'tempat_kegiatan')) > 500
    OR length(btrim(input->>'sistem_pelaksanaan')) > 500
    OR (input->>'tanggal_kegiatan' <> '' AND input->>'tanggal_kegiatan' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
    OR (input->>'jenis' IN ('Surat Tugas','Surat Undangan') AND
      (input->>'tanggal_kegiatan' = '' OR btrim(input->>'waktu_kegiatan') = '' OR btrim(input->>'tempat_kegiatan') = '')) THEN
    RAISE EXCEPTION 'Invalid input' USING ERRCODE = '22023';
  END IF;
  IF input->>'tanggal_kegiatan' <> '' THEN
    BEGIN
      event_date := (input->>'tanggal_kegiatan')::date;
    EXCEPTION WHEN datetime_field_overflow OR invalid_datetime_format THEN
      RAISE EXCEPTION 'Invalid input' USING ERRCODE = '22023';
    END;
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
      OR previous.keterangan IS DISTINCT FROM btrim(input->>'keterangan')
      OR previous.tanggal_kegiatan IS DISTINCT FROM event_date
      OR coalesce(previous.waktu_kegiatan, '') IS DISTINCT FROM btrim(input->>'waktu_kegiatan')
      OR coalesce(previous.tempat_kegiatan, '') IS DISTINCT FROM btrim(input->>'tempat_kegiatan')
      OR coalesce(previous.sistem_pelaksanaan, '') IS DISTINCT FROM btrim(input->>'sistem_pelaksanaan') THEN
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
    pemohon_id, pemohon_nama, divisi, status, tanggal,
    tanggal_kegiatan, waktu_kegiatan, tempat_kegiatan, sistem_pelaksanaan)
  VALUES (request_id,
    CASE WHEN annual_number < 1000 THEN lpad(annual_number::text, 3, '0') ELSE annual_number::text END
      || '/' || kind_code || '/FG-DPK/' || btrim(to_char(local_date, 'RM')) || '/' || extract(year FROM local_date)::text,
    input->>'jenis', btrim(input->>'perihal'), btrim(input->>'tujuan'), input->>'urgensi', btrim(input->>'keterangan'),
    actor.id, actor.nama_lengkap, actor.kelompok,
    CASE WHEN approved THEN 'Selesai / Disetujui' ELSE 'Menunggu Persetujuan Inti' END,
    to_char(local_date, 'YYYY-MM-DD'), event_date, nullif(btrim(input->>'waktu_kegiatan'), ''),
    nullif(btrim(input->>'tempat_kegiatan'), ''), nullif(btrim(input->>'sistem_pelaksanaan'), ''));
  IF approved THEN
    INSERT INTO public.surat_approval(surat_id, step_order, step_label, actor_name, status, acted_at)
    VALUES (request_id, 99, 'ACC otomatis: ' || actor.jabatan, actor.nama_lengkap, 'Disetujui', now());
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.create_portal_surat(uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_portal_surat(uuid,jsonb) TO authenticated;
COMMIT;
