-- Requires guest accounts and surat template migrations. No existing agenda opens automatically.
BEGIN;
ALTER TABLE public.public_content ADD COLUMN pendaftaran_dibuka boolean NOT NULL DEFAULT false;
ALTER TABLE public.public_content ADD CONSTRAINT public_content_registration_kind
  CHECK (NOT pendaftaran_dibuka OR jenis = 'agenda');

CREATE FUNCTION public.can_view_event_participants()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND level <> 'guest'
    AND (level IN ('admin','inti','kabid') OR bidang_id = 'branding'));
$$;
REVOKE ALL ON FUNCTION public.can_view_event_participants() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_event_participants() TO authenticated;

CREATE TABLE public.event_registrations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_key uuid NOT NULL UNIQUE,
  agenda_id uuid NOT NULL REFERENCES public.public_content(id),
  nama text NOT NULL CHECK (length(nama) BETWEEN 1 AND 300 AND nama = btrim(nama)),
  instansi text NOT NULL CHECK (length(instansi) BETWEEN 1 AND 300 AND instansi = btrim(instansi)),
  unsur text NOT NULL CHECK (length(unsur) BETWEEN 1 AND 300 AND unsur = btrim(unsur)),
  kode uuid NOT NULL UNIQUE DEFAULT uuid_generate_v4(),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE UNIQUE INDEX event_registrations_identity ON public.event_registrations
  (agenda_id, lower(nama), lower(instansi), lower(unsur));
CREATE INDEX event_registrations_agenda ON public.event_registrations(agenda_id, created_at, id);
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.event_registrations FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, agenda_id, nama, instansi, unsur, created_at) ON public.event_registrations TO authenticated;
CREATE POLICY event_registrations_reader ON public.event_registrations FOR SELECT TO authenticated
  USING (public.can_view_event_participants());

CREATE FUNCTION public.register_portal_event(request_id uuid, event_id uuid, input jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  event public.public_content%ROWTYPE;
  previous public.event_registrations%ROWTYPE;
  full_name text;
  institution text;
  element text;
  receipt uuid;
BEGIN
  IF request_id IS NULL OR event_id IS NULL OR jsonb_typeof(input) IS DISTINCT FROM 'object'
    OR NOT input ?& ARRAY['nama','instansi','unsur']
    OR input - ARRAY['nama','instansi','unsur'] <> '{}'::jsonb
    OR jsonb_typeof(input->'nama') IS DISTINCT FROM 'string'
    OR jsonb_typeof(input->'instansi') IS DISTINCT FROM 'string'
    OR jsonb_typeof(input->'unsur') IS DISTINCT FROM 'string'
    OR length(btrim(input->>'nama')) NOT BETWEEN 1 AND 300
    OR length(btrim(input->>'instansi')) NOT BETWEEN 1 AND 300
    OR length(btrim(input->>'unsur')) NOT BETWEEN 1 AND 300 THEN
    RAISE EXCEPTION 'Invalid input' USING ERRCODE = '22023';
  END IF;
  full_name := btrim(regexp_replace(input->>'nama', '[[:space:]]+', ' ', 'g'));
  institution := btrim(regexp_replace(input->>'instansi', '[[:space:]]+', ' ', 'g'));
  element := btrim(regexp_replace(input->>'unsur', '[[:space:]]+', ' ', 'g'));
  IF full_name = '' OR institution = '' OR element = '' THEN
    RAISE EXCEPTION 'Invalid input' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(request_id::text, 0));
  SELECT * INTO previous FROM public.event_registrations WHERE request_key = request_id;
  IF FOUND THEN
    IF previous.agenda_id IS DISTINCT FROM event_id OR previous.nama IS DISTINCT FROM full_name
      OR previous.instansi IS DISTINCT FROM institution OR previous.unsur IS DISTINCT FROM element THEN
      RAISE EXCEPTION 'Request does not match' USING ERRCODE = '22023';
    END IF;
    RETURN previous.kode;
  END IF;
  -- Lock against simultaneous closure, withdrawal, or changes to the event schedule.
  SELECT * INTO event FROM public.public_content WHERE id = event_id FOR SHARE;
  IF event.id IS NULL OR event.jenis <> 'agenda' OR event.status <> 'published'
    OR NOT event.pendaftaran_dibuka OR event.mulai_at <= clock_timestamp() THEN
    RAISE EXCEPTION 'Registration closed' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.event_registrations(request_key, agenda_id, nama, instansi, unsur)
    VALUES (request_id, event_id, full_name, institution, element) RETURNING kode INTO receipt;
  RETURN receipt;
END;
$$;
REVOKE ALL ON FUNCTION public.register_portal_event(uuid,uuid,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_portal_event(uuid,uuid,jsonb) TO anon, authenticated;

ALTER TABLE public.surat ADD COLUMN lampiran_agenda_id uuid REFERENCES public.public_content(id);
ALTER TABLE public.surat ADD COLUMN lampiran_judul text;
ALTER TABLE public.surat ADD COLUMN lampiran_peserta_ids uuid[] NOT NULL DEFAULT '{}';
ALTER TABLE public.surat ADD COLUMN lampiran_peserta jsonb NOT NULL DEFAULT '[]';
ALTER TABLE public.surat ADD CONSTRAINT surat_attachment_shape CHECK (
  jsonb_typeof(lampiran_peserta) = 'array' AND
  ((lampiran_agenda_id IS NULL AND lampiran_judul IS NULL AND lampiran_peserta_ids = '{}' AND lampiran_peserta = '[]') OR
   (lampiran_agenda_id IS NOT NULL AND lampiran_judul IS NOT NULL AND cardinality(lampiran_peserta_ids) > 0
    AND jsonb_array_length(lampiran_peserta) = cardinality(lampiran_peserta_ids)))
);

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
      (entry.key = 'pendaftaran_dibuka' AND jsonb_typeof(entry.value) <> 'boolean') OR
      entry.key NOT IN ('jenis','judul','ringkasan','isi','status','mulai_at','selesai_at','lokasi','pendaftaran_dibuka')) THEN
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
  IF (input->>'jenis' <> 'agenda' AND coalesce((input->>'pendaftaran_dibuka')::boolean, false)) OR
    (input->>'jenis' <> 'agenda' AND EXISTS (SELECT 1 FROM public.event_registrations WHERE agenda_id = target_id)) THEN
    RAISE EXCEPTION 'Agenda with registrations cannot become news' USING ERRCODE = '22023';
  END IF;
  publication := CASE WHEN input->>'status' = 'published' THEN coalesce(item.published_at, clock_timestamp()) ELSE NULL END;
  IF expected_version = -1 THEN
    INSERT INTO public.public_content(id, jenis, judul, ringkasan, isi, status, mulai_at, selesai_at, lokasi, published_at, pendaftaran_dibuka)
    VALUES (target_id, input->>'jenis', btrim(input->>'judul'), btrim(input->>'ringkasan'), btrim(input->>'isi'),
      input->>'status', (input->>'mulai_at')::timestamptz, (input->>'selesai_at')::timestamptz, btrim(input->>'lokasi'), publication, coalesce((input->>'pendaftaran_dibuka')::boolean, false));
  ELSE
    UPDATE public.public_content SET jenis = input->>'jenis', judul = btrim(input->>'judul'),
      ringkasan = btrim(input->>'ringkasan'), isi = btrim(input->>'isi'), status = input->>'status',
      mulai_at = (input->>'mulai_at')::timestamptz, selesai_at = (input->>'selesai_at')::timestamptz,
      lokasi = btrim(input->>'lokasi'), published_at = publication, pendaftaran_dibuka = CASE WHEN input->>'jenis' = 'agenda' THEN coalesce((input->>'pendaftaran_dibuka')::boolean, item.pendaftaran_dibuka) ELSE false END, updated_at = clock_timestamp(), version = version + 1
    WHERE id = target_id;
  END IF;
END;
$$;

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
  attachment_event uuid;
  participant_ids uuid[] := '{}';
  snapshot jsonb := '[]';
  attachment_title text;
BEGIN
  SELECT * INTO actor FROM public.profiles WHERE id = auth.uid();
  IF actor.id IS NULL OR actor.level NOT IN ('kabid', 'inti', 'admin') THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;
  IF request_id IS NULL OR jsonb_typeof(input) IS DISTINCT FROM 'object'
    OR NOT input ?& ARRAY['jenis','perihal','tujuan','urgensi','keterangan','tanggal_kegiatan','waktu_kegiatan','tempat_kegiatan','sistem_pelaksanaan']
    OR input - ARRAY['jenis','perihal','tujuan','urgensi','keterangan','tanggal_kegiatan','waktu_kegiatan','tempat_kegiatan','sistem_pelaksanaan','lampiran_agenda_id','lampiran_peserta_ids'] <> '{}'::jsonb
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
  IF (input ? 'lampiran_agenda_id' AND jsonb_typeof(input->'lampiran_agenda_id') NOT IN ('string','null'))
    OR (input ? 'lampiran_peserta_ids' AND jsonb_typeof(input->'lampiran_peserta_ids') <> 'array') THEN
    RAISE EXCEPTION 'Invalid attachment' USING ERRCODE = '22023';
  END IF;
  BEGIN
    attachment_event := (input->>'lampiran_agenda_id')::uuid;
    SELECT coalesce(array_agg(value::uuid ORDER BY value::uuid), '{}'::uuid[]) INTO participant_ids
      FROM jsonb_array_elements_text(coalesce(input->'lampiran_peserta_ids', '[]')) AS entries(value);
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Invalid attachment' USING ERRCODE = '22023';
  END;
  IF (attachment_event IS NOT NULL) <> (cardinality(participant_ids) > 0)
    OR EXISTS (SELECT 1 FROM unnest(participant_ids) value GROUP BY value HAVING count(*) > 1)
    OR array_position(participant_ids, NULL) IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid attachment' USING ERRCODE = '22023';
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
      OR coalesce(previous.sistem_pelaksanaan, '') IS DISTINCT FROM btrim(input->>'sistem_pelaksanaan')
      OR previous.lampiran_agenda_id IS DISTINCT FROM attachment_event
      OR previous.lampiran_peserta_ids IS DISTINCT FROM participant_ids THEN
      RAISE EXCEPTION 'Request does not match' USING ERRCODE = '22023';
    END IF;
    RETURN;
  END IF;
  IF attachment_event IS NOT NULL THEN
    SELECT judul INTO attachment_title FROM public.public_content
      WHERE id = attachment_event AND jenis = 'agenda' FOR SHARE;
    IF attachment_title IS NULL THEN
      RAISE EXCEPTION 'Invalid attachment event' USING ERRCODE = '22023';
    END IF;
    SELECT coalesce(jsonb_agg(jsonb_build_object('nama', nama, 'instansi', instansi, 'unsur', unsur)
      ORDER BY created_at, id), '[]'::jsonb) INTO snapshot
      FROM public.event_registrations WHERE agenda_id = attachment_event AND id = ANY(participant_ids);
    IF jsonb_array_length(snapshot) <> cardinality(participant_ids) THEN
      RAISE EXCEPTION 'Invalid attachment participants' USING ERRCODE = '22023';
    END IF;
  END IF;
  INSERT INTO public.surat_counters(tahun, terakhir) VALUES (extract(year FROM local_date)::integer, 1)
  ON CONFLICT (tahun) DO UPDATE SET terakhir = public.surat_counters.terakhir + 1
  RETURNING terakhir INTO annual_number;
  kind_code := CASE input->>'jenis' WHEN 'Surat Tugas' THEN 'ST' WHEN 'Surat Undangan' THEN 'SU'
    WHEN 'Surat Permohonan' THEN 'SPm' ELSE 'SR' END;
  approved := actor.level IN ('inti','admin');
  INSERT INTO public.surat(id, nomor_surat, jenis, perihal, tujuan, urgensi, keterangan,
    pemohon_id, pemohon_nama, divisi, status, tanggal,
    tanggal_kegiatan, waktu_kegiatan, tempat_kegiatan, sistem_pelaksanaan,
    lampiran_agenda_id, lampiran_judul, lampiran_peserta_ids, lampiran_peserta)
  VALUES (request_id,
    CASE WHEN annual_number < 1000 THEN lpad(annual_number::text, 3, '0') ELSE annual_number::text END
      || '/' || kind_code || '/FG-DPK/' || btrim(to_char(local_date, 'RM')) || '/' || extract(year FROM local_date)::text,
    input->>'jenis', btrim(input->>'perihal'), btrim(input->>'tujuan'), input->>'urgensi', btrim(input->>'keterangan'),
    actor.id, actor.nama_lengkap, actor.kelompok,
    CASE WHEN approved THEN 'Selesai / Disetujui' ELSE 'Menunggu Persetujuan Inti' END,
    to_char(local_date, 'YYYY-MM-DD'), event_date, nullif(btrim(input->>'waktu_kegiatan'), ''),
    nullif(btrim(input->>'tempat_kegiatan'), ''), nullif(btrim(input->>'sistem_pelaksanaan'), ''),
    attachment_event, attachment_title, participant_ids, snapshot);
  IF approved THEN
    INSERT INTO public.surat_approval(surat_id, step_order, step_label, actor_name, status, acted_at)
    VALUES (request_id, 99, 'ACC otomatis: ' || actor.jabatan, actor.nama_lengkap, 'Disetujui', now());
  END IF;
END;
$$;
COMMIT;
