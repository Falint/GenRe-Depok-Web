-- Apply after coordination and finance migrations. No existing content becomes public.
BEGIN;

CREATE TABLE public.public_content (
  id UUID PRIMARY KEY,
  jenis TEXT NOT NULL CHECK (jenis IN ('berita', 'agenda')),
  judul TEXT NOT NULL CHECK (length(btrim(judul)) BETWEEN 1 AND 300),
  ringkasan TEXT NOT NULL CHECK (length(btrim(ringkasan)) BETWEEN 1 AND 500),
  isi TEXT NOT NULL CHECK (length(btrim(isi)) BETWEEN 1 AND 20000),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  mulai_at TIMESTAMPTZ,
  selesai_at TIMESTAMPTZ,
  lokasi TEXT NOT NULL DEFAULT '' CHECK (length(lokasi) <= 500),
  published_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  version INTEGER NOT NULL DEFAULT 0 CHECK (version >= 0),
  CHECK ((status = 'published') = (published_at IS NOT NULL)),
  CHECK (
    (jenis = 'berita' AND mulai_at IS NULL AND selesai_at IS NULL AND lokasi = '') OR
    (jenis = 'agenda' AND mulai_at IS NOT NULL AND isfinite(mulai_at) AND length(btrim(lokasi)) > 0
      AND (selesai_at IS NULL OR (isfinite(selesai_at) AND selesai_at >= mulai_at)))
  )
);
CREATE INDEX public_content_news ON public.public_content (jenis, published_at DESC, id) WHERE status = 'published';
CREATE INDEX public_content_agenda ON public.public_content (mulai_at, id) WHERE status = 'published' AND jenis = 'agenda';
ALTER TABLE public.public_content ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.public_content FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.public_content TO anon, authenticated;
CREATE POLICY public_content_published ON public.public_content FOR SELECT TO anon, authenticated
  USING (status = 'published');
CREATE POLICY public_content_manager ON public.public_content FOR SELECT TO authenticated
  USING (public.can_manage_content());

CREATE FUNCTION public.save_portal_public_content(target_id UUID, expected_version INTEGER, input JSONB)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor public.profiles%ROWTYPE;
  item public.public_content%ROWTYPE;
  publication TIMESTAMPTZ;
BEGIN
  SELECT * INTO actor FROM public.profiles WHERE id = auth.uid() FOR SHARE;
  IF actor.id IS NULL OR (actor.level = 'inti' OR actor.bidang_id = 'branding') IS NOT TRUE THEN
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
REVOKE ALL ON FUNCTION public.save_portal_public_content(UUID, INTEGER, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_portal_public_content(UUID, INTEGER, JSONB) TO authenticated;
COMMIT;
