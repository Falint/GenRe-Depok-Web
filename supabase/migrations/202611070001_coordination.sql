-- Apply after portal_hardening, first on staging. No destructive rollback is required:
-- Additional data survives app rollback; the stricter content permissions remain active.
BEGIN;

CREATE TABLE public.bidang (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL UNIQUE
);
INSERT INTO public.bidang VALUES ('internal', 'Bidang Internal'), ('eksternal', 'Bidang Eksternal'), ('branding', 'Bidang Branding');
CREATE TABLE public.divisi (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  bidang_id TEXT NOT NULL REFERENCES public.bidang(id),
  UNIQUE (id, bidang_id)
);
INSERT INTO public.divisi VALUES
  ('reguler', 'Program Reguler', 'eksternal'), ('nonreguler', 'Program Non-Reguler', 'eksternal'),
  ('kecamatan', 'Forum GenRe Kecamatan', 'internal'), ('duta', 'Duta GenRe', 'internal'), ('pikr', 'PIK-R', 'internal'),
  ('pr', 'Public Relation', 'branding'), ('sosmed', 'Social Media', 'branding'), ('design', 'Design', 'branding'), ('video', 'Video Editor', 'branding');
ALTER TABLE public.profiles
  ADD COLUMN bidang_id TEXT REFERENCES public.bidang(id),
  ADD COLUMN divisi_id TEXT,
  ADD CONSTRAINT profile_division_belongs_to_field FOREIGN KEY (divisi_id, bidang_id) REFERENCES public.divisi(id, bidang_id),
  ADD CONSTRAINT profile_division_requires_field CHECK (divisi_id IS NULL OR (bidang_id IS NOT NULL AND level IN ('kadiv', 'staff')));
CREATE UNIQUE INDEX one_kadiv_per_division ON public.profiles(divisi_id) WHERE level = 'kadiv' AND divisi_id IS NOT NULL;
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon, authenticated;

-- Only map known accounts with the expected role. Never infer authority from job-title text.
WITH placement(email, level, bidang, divisi) AS (VALUES
  ('kabid.internal@genredepok.or.id', 'kabid', 'internal', NULL),
  ('kabid.eksternal@genredepok.or.id', 'kabid', 'eksternal', NULL),
  ('kabid.branding@genredepok.or.id', 'kabid', 'branding', NULL),
  ('fauzan.reguler@genredepok.or.id', 'kadiv', 'eksternal', 'reguler'),
  ('fathir.nonreg@genredepok.or.id', 'kadiv', 'eksternal', 'nonreguler'),
  ('rizkan.kecamatan@genredepok.or.id', 'kadiv', 'internal', 'kecamatan'),
  ('melani.duta@genredepok.or.id', 'kadiv', 'internal', 'duta'),
  ('ade.pikr@genredepok.or.id', 'kadiv', 'internal', 'pikr'),
  ('diva.pr@genredepok.or.id', 'kadiv', 'branding', 'pr'),
  ('allya.sosmed@genredepok.or.id', 'kadiv', 'branding', 'sosmed'),
  ('annisa.design@genredepok.or.id', 'kadiv', 'branding', 'design'),
  ('kadiv.video@genredepok.or.id', 'kadiv', 'branding', 'video'),
  ('adrian.video@genredepok.or.id', 'staff', 'branding', 'video'),
  ('radit@genredepok.or.id', 'staff', 'eksternal', 'reguler'),
  ('darlo@genredepok.or.id', 'staff', 'eksternal', 'nonreguler'),
  ('frida@genredepok.or.id', 'staff', 'internal', 'kecamatan'),
  ('alya.duta@genredepok.or.id', 'staff', 'internal', 'duta'),
  ('natasya@genredepok.or.id', 'staff', 'internal', 'pikr'),
  ('raihan.pr@genredepok.or.id', 'staff', 'branding', 'pr'),
  ('faza@genredepok.or.id', 'staff', 'branding', 'sosmed'),
  ('faizah@genredepok.or.id', 'staff', 'branding', 'design')
)
UPDATE public.profiles p SET bidang_id = x.bidang, divisi_id = x.divisi
FROM placement x WHERE lower(p.email) = x.email AND p.level = x.level
AND p.bidang_id IS NULL AND p.divisi_id IS NULL;

CREATE FUNCTION public.can_manage_content()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (level = 'inti' OR bidang_id = 'branding'));
$$;
ALTER TABLE public.bidang ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.divisi ENABLE ROW LEVEL SECURITY;
CREATE POLICY bidang_read ON public.bidang FOR SELECT TO authenticated USING (true);
CREATE POLICY divisi_read ON public.divisi FOR SELECT TO authenticated USING (true);
REVOKE ALL ON public.bidang, public.divisi FROM anon, authenticated;
GRANT SELECT ON public.bidang, public.divisi TO authenticated;

CREATE TABLE public.panitia_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  judul TEXT NOT NULL CHECK (length(btrim(judul)) BETWEEN 1 AND 300),
  deskripsi TEXT NOT NULL CHECK (length(btrim(deskripsi)) BETWEEN 1 AND 10000),
  pemohon_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  pemohon_nama TEXT NOT NULL,
  divisi_asal_id TEXT NOT NULL REFERENCES public.divisi(id),
  divisi_tujuan_id TEXT NOT NULL REFERENCES public.divisi(id),
  jumlah INTEGER NOT NULL CHECK (jumlah BETWEEN 1 AND 1000),
  deadline_respons TIMESTAMPTZ NOT NULL CHECK (isfinite(deadline_respons)),
  mulai_at TIMESTAMPTZ NOT NULL CHECK (isfinite(mulai_at)),
  selesai_at TIMESTAMPTZ NOT NULL CHECK (isfinite(selesai_at)),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','partially_assigned','assigned','rejected')),
  decision_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  version INTEGER NOT NULL DEFAULT 0,
  CHECK (deadline_respons < mulai_at AND mulai_at < selesai_at),
  CHECK (divisi_asal_id <> divisi_tujuan_id)
);
CREATE TABLE public.panitia_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES public.panitia_requests(id),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  nama TEXT NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (request_id, user_id)
);
CREATE TABLE public.panitia_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES public.panitia_requests(id),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL,
  action TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  added JSONB NOT NULL DEFAULT '[]',
  removed JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX panitia_target ON public.panitia_requests(divisi_tujuan_id);
CREATE INDEX panitia_requester ON public.panitia_requests(pemohon_id);
CREATE INDEX panitia_assigned_user ON public.panitia_assignments(user_id, request_id);
CREATE INDEX panitia_history_request ON public.panitia_history(request_id, created_at);

-- SECURITY DEFINER avoids recursive policies between requests and assignments.
CREATE FUNCTION public.can_read_panitia(target_id UUID, include_member BOOLEAN DEFAULT false)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.panitia_requests r JOIN public.profiles p ON p.id = auth.uid()
    WHERE r.id = target_id AND (
      p.level IN ('inti','kabid') OR (p.level = 'kadiv' AND r.pemohon_id = p.id)
      OR (p.level = 'kadiv' AND p.divisi_id = r.divisi_tujuan_id)
      OR (include_member AND EXISTS (SELECT 1 FROM public.panitia_assignments a WHERE a.request_id = r.id AND a.user_id = p.id))
    )
  );
$$;
ALTER TABLE public.panitia_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.panitia_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.panitia_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY panitia_read ON public.panitia_requests FOR SELECT TO authenticated USING (public.can_read_panitia(id, true));
CREATE POLICY assignment_read ON public.panitia_assignments FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.can_read_panitia(request_id));
CREATE POLICY history_read ON public.panitia_history FOR SELECT TO authenticated USING (public.can_read_panitia(request_id));
REVOKE ALL ON public.panitia_requests, public.panitia_assignments, public.panitia_history FROM anon, authenticated;
GRANT SELECT ON public.panitia_requests, public.panitia_assignments, public.panitia_history TO authenticated;

CREATE FUNCTION public.create_panitia_request(request_id UUID, input JSONB)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor public.profiles%ROWTYPE; target public.divisi%ROWTYPE; existing public.panitia_requests%ROWTYPE;
BEGIN
  SELECT * INTO actor FROM public.profiles WHERE id = auth.uid() FOR SHARE;
  IF actor.id IS NULL OR actor.level <> 'kadiv' OR actor.divisi_id IS NULL THEN RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501'; END IF;
  SELECT * INTO target FROM public.divisi WHERE id = input->>'divisi_tujuan_id' FOR SHARE;
  IF target.id IS NULL OR target.bidang_id = actor.bidang_id THEN RAISE EXCEPTION 'Pilih divisi dari bidang lain.'; END IF;
  PERFORM 1 FROM public.profiles WHERE level = 'kadiv' AND divisi_id = target.id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Divisi tujuan belum memiliki Kadiv.'; END IF;
  IF (input->>'deadline_respons')::timestamptz <= clock_timestamp() THEN RAISE EXCEPTION 'Deadline harus di masa depan.'; END IF;
  INSERT INTO public.panitia_requests (id,judul,deskripsi,pemohon_id,pemohon_nama,divisi_asal_id,divisi_tujuan_id,jumlah,deadline_respons,mulai_at,selesai_at)
  VALUES (request_id,btrim(input->>'judul'),btrim(input->>'deskripsi'),actor.id,actor.nama_lengkap,actor.divisi_id,target.id,
    (input->>'jumlah')::integer,(input->>'deadline_respons')::timestamptz,(input->>'mulai_at')::timestamptz,(input->>'selesai_at')::timestamptz)
  ON CONFLICT (id) DO NOTHING;
  IF NOT FOUND THEN
    SELECT * INTO existing FROM public.panitia_requests WHERE id = request_id;
    IF existing.pemohon_id IS DISTINCT FROM actor.id OR existing.judul IS DISTINCT FROM btrim(input->>'judul')
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

CREATE FUNCTION public.decide_panitia_request(target_id UUID, expected_version INTEGER, approve BOOLEAN, reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor public.profiles%ROWTYPE; req public.panitia_requests%ROWTYPE; next_status TEXT;
BEGIN
  SELECT * INTO actor FROM public.profiles WHERE id = auth.uid() FOR SHARE;
  SELECT * INTO req FROM public.panitia_requests WHERE id = target_id FOR UPDATE;
  IF actor.id IS NULL OR actor.level <> 'kadiv' OR actor.divisi_id IS DISTINCT FROM req.divisi_tujuan_id OR req.id IS NULL THEN
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

CREATE FUNCTION public.set_panitia_assignments(target_id UUID, expected_version INTEGER, member_ids UUID[], reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor public.profiles%ROWTYPE; req public.panitia_requests%ROWTYPE; next_status TEXT; additions JSONB; removals JSONB; member_count INTEGER;
BEGIN
  SELECT * INTO actor FROM public.profiles WHERE id = auth.uid() FOR SHARE;
  SELECT * INTO req FROM public.panitia_requests WHERE id = target_id FOR UPDATE;
  IF actor.id IS NULL OR actor.level <> 'kadiv' OR actor.divisi_id IS DISTINCT FROM req.divisi_tujuan_id OR req.id IS NULL THEN
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

ALTER TABLE public.pengumuman
  ADD COLUMN mulai_at TIMESTAMPTZ,
  ADD COLUMN selesai_at TIMESTAMPTZ,
  ADD COLUMN deadline_konfirmasi TIMESTAMPTZ,
  ADD COLUMN cancelled_at TIMESTAMPTZ,
  ADD COLUMN cancellation_reason TEXT,
  ADD COLUMN updated_at TIMESTAMPTZ,
  ADD COLUMN version INTEGER NOT NULL DEFAULT 0,
  ADD CONSTRAINT announcement_schedule CHECK (
    (mulai_at IS NULL AND selesai_at IS NULL AND deadline_konfirmasi IS NULL)
    OR (mulai_at IS NOT NULL AND selesai_at IS NOT NULL AND deadline_konfirmasi IS NOT NULL
      AND isfinite(mulai_at) AND isfinite(selesai_at) AND isfinite(deadline_konfirmasi)
      AND deadline_konfirmasi < mulai_at AND mulai_at < selesai_at)
  );
ALTER TABLE public.pengumuman_kehadiran ADD COLUMN is_late BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.tiket_info ADD COLUMN deadline_at TIMESTAMPTZ CHECK (isfinite(deadline_at)), ADD COLUMN updated_at TIMESTAMPTZ;

CREATE TABLE public.media_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legacy_key TEXT UNIQUE,
  jenis TEXT NOT NULL CHECK (jenis IN ('modul','logo','video')),
  judul TEXT NOT NULL CHECK (length(btrim(judul)) BETWEEN 1 AND 300),
  deskripsi TEXT NOT NULL CHECK (length(deskripsi) <= 10000),
  url TEXT CHECK (length(url) <= 2048),
  kategori TEXT NOT NULL DEFAULT '',
  jenjang TEXT NOT NULL DEFAULT '',
  halaman INTEGER CHECK (halaman > 0),
  tahun INTEGER CHECK (tahun BETWEEN 1900 AND 9999),
  format TEXT NOT NULL DEFAULT '',
  size TEXT NOT NULL DEFAULT '',
  durasi TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE public.content_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('pengumuman','media_resources')),
  entity_id UUID NOT NULL,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL,
  action TEXT NOT NULL,
  before_data JSONB,
  after_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX content_history_entity ON public.content_history(entity_type,entity_id,created_at);
ALTER TABLE public.media_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY media_read ON public.media_resources FOR SELECT TO authenticated USING (archived_at IS NULL OR public.can_manage_content());
CREATE POLICY content_history_read ON public.content_history FOR SELECT TO authenticated USING (public.can_manage_content());
REVOKE ALL ON public.media_resources, public.content_history FROM anon, authenticated;
GRANT SELECT ON public.media_resources, public.content_history TO authenticated;

CREATE FUNCTION public.audit_portal_content()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor_name TEXT;
BEGIN
  SELECT nama_lengkap INTO actor_name FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.content_history(entity_type,entity_id,actor_id,actor_name,action,before_data,after_data)
  VALUES(TG_TABLE_NAME,NEW.id,auth.uid(),coalesce(actor_name,'Administrator'),lower(TG_OP),
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,to_jsonb(NEW));
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.stamp_announcement_insert()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.created_at := clock_timestamp(); NEW.updated_at := NULL;
  RETURN NEW;
END;
$$;
CREATE TRIGGER announcement_created BEFORE INSERT ON public.pengumuman FOR EACH ROW EXECUTE FUNCTION public.stamp_announcement_insert();
CREATE TRIGGER announcement_audit AFTER INSERT OR UPDATE ON public.pengumuman FOR EACH ROW EXECUTE FUNCTION public.audit_portal_content();
CREATE TRIGGER media_audit AFTER INSERT OR UPDATE ON public.media_resources FOR EACH ROW EXECUTE FUNCTION public.audit_portal_content();

DROP POLICY IF EXISTS pengumuman_insert_pimpinan ON public.pengumuman;
CREATE POLICY pengumuman_insert_content ON public.pengumuman FOR INSERT TO authenticated
WITH CHECK (public.can_manage_content() AND penulis_id = auth.uid() AND penulis_nama = (SELECT nama_lengkap FROM public.profiles WHERE id = auth.uid()) AND cancelled_at IS NULL AND cancellation_reason IS NULL AND version = 0);
REVOKE ALL ON public.pengumuman FROM anon, authenticated;
GRANT SELECT, INSERT ON public.pengumuman TO authenticated;

CREATE FUNCTION public.save_portal_pengumuman(target_id UUID, expected_version INTEGER, input JSONB)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor public.profiles%ROWTYPE; item public.pengumuman%ROWTYPE;
BEGIN
  SELECT * INTO actor FROM public.profiles WHERE id = auth.uid() FOR SHARE;
  IF actor.id IS NULL OR (actor.level = 'inti' OR actor.bidang_id = 'branding') IS NOT TRUE THEN RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501'; END IF;
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
CREATE FUNCTION public.cancel_portal_pengumuman(target_id UUID, expected_version INTEGER, reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor public.profiles%ROWTYPE; item public.pengumuman%ROWTYPE;
BEGIN
  SELECT * INTO actor FROM public.profiles WHERE id = auth.uid() FOR SHARE;
  IF actor.id IS NULL OR (actor.level = 'inti' OR actor.bidang_id = 'branding') IS NOT TRUE THEN RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501'; END IF;
  SELECT * INTO item FROM public.pengumuman WHERE id = target_id FOR UPDATE;
  IF item.id IS NULL OR item.version IS DISTINCT FROM expected_version OR item.cancelled_at IS NOT NULL THEN RAISE EXCEPTION 'Data berubah. Muat ulang.' USING ERRCODE = '40001'; END IF;
  IF reason IS NULL OR length(btrim(reason)) NOT BETWEEN 1 AND 10000 THEN RAISE EXCEPTION 'Alasan pembatalan wajib diisi.'; END IF;
  UPDATE public.pengumuman SET cancelled_at = clock_timestamp(), cancellation_reason = btrim(reason), updated_at = clock_timestamp(), version = version + 1 WHERE id = target_id;
END;
$$;

CREATE FUNCTION public.check_announcement_attendance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE item public.pengumuman%ROWTYPE;
BEGIN
  IF NEW.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501'; END IF;
  SELECT * INTO item FROM public.pengumuman WHERE id = NEW.pengumuman_id FOR SHARE;
  IF item.id IS NULL OR item.cancelled_at IS NOT NULL OR clock_timestamp() >= item.mulai_at THEN RAISE EXCEPTION 'Konfirmasi kegiatan sudah ditutup.'; END IF;
  NEW.confirmed_at := clock_timestamp();
  NEW.is_late := coalesce(NEW.confirmed_at > item.deadline_konfirmasi, false);
  RETURN NEW;
END;
$$;
CREATE TRIGGER attendance_deadline BEFORE INSERT ON public.pengumuman_kehadiran FOR EACH ROW EXECUTE FUNCTION public.check_announcement_attendance();
REVOKE ALL ON public.pengumuman_kehadiran FROM anon, authenticated;
GRANT SELECT, INSERT ON public.pengumuman_kehadiran TO authenticated;

CREATE FUNCTION public.set_tiket_deadline(target_id UUID, deadline_value TIMESTAMPTZ)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor public.profiles%ROWTYPE; ticket public.tiket_info%ROWTYPE;
BEGIN
  SELECT * INTO actor FROM public.profiles WHERE id = auth.uid() FOR SHARE;
  SELECT * INTO ticket FROM public.tiket_info WHERE id = target_id FOR UPDATE;
  IF actor.id IS NULL OR ticket.id IS NULL OR (actor.level IN ('inti','kabid') OR ticket.pemohon_id = actor.id) IS NOT TRUE THEN RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501'; END IF;
  UPDATE public.tiket_info SET deadline_at = deadline_value, updated_at = clock_timestamp() WHERE id = target_id;
END;
$$;
CREATE FUNCTION public.stamp_ticket_update()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$ BEGIN NEW.updated_at := clock_timestamp(); RETURN NEW; END; $$;
ALTER TABLE public.surat ADD COLUMN updated_at TIMESTAMPTZ;
ALTER TABLE public.reimburse ADD COLUMN updated_at TIMESTAMPTZ;
ALTER TABLE public.kas_mutasi ADD COLUMN updated_at TIMESTAMPTZ;
CREATE TRIGGER surat_timestamp BEFORE UPDATE ON public.surat FOR EACH ROW EXECUTE FUNCTION public.stamp_ticket_update();
CREATE TRIGGER reimburse_timestamp BEFORE UPDATE ON public.reimburse FOR EACH ROW EXECUTE FUNCTION public.stamp_ticket_update();
CREATE TRIGGER kas_timestamp BEFORE UPDATE ON public.kas_mutasi FOR EACH ROW EXECUTE FUNCTION public.stamp_ticket_update();
CREATE TRIGGER ticket_timestamp BEFORE UPDATE ON public.tiket_info FOR EACH ROW EXECUTE FUNCTION public.stamp_ticket_update();

CREATE FUNCTION public.save_portal_media(target_id UUID, expected_version INTEGER, input JSONB)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor public.profiles%ROWTYPE; item public.media_resources%ROWTYPE; link TEXT;
BEGIN
  SELECT * INTO actor FROM public.profiles WHERE id = auth.uid() FOR SHARE;
  IF actor.id IS NULL OR (actor.level = 'inti' OR actor.bidang_id = 'branding') IS NOT TRUE THEN RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501'; END IF;
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
CREATE FUNCTION public.archive_portal_media(target_id UUID, expected_version INTEGER, archive BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor public.profiles%ROWTYPE; item public.media_resources%ROWTYPE;
BEGIN
  SELECT * INTO actor FROM public.profiles WHERE id = auth.uid() FOR SHARE;
  IF actor.id IS NULL OR (actor.level = 'inti' OR actor.bidang_id = 'branding') IS NOT TRUE THEN RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501'; END IF;
  SELECT * INTO item FROM public.media_resources WHERE id = target_id FOR UPDATE;
  IF item.id IS NULL OR item.version IS DISTINCT FROM expected_version OR archive IS NULL THEN RAISE EXCEPTION 'Data berubah. Muat ulang.' USING ERRCODE = '40001'; END IF;
  UPDATE public.media_resources SET archived_at = CASE WHEN archive THEN clock_timestamp() ELSE NULL END, updated_at = clock_timestamp(), version = version + 1 WHERE id = target_id;
END;
$$;

-- Do not expose definer functions through PUBLIC's default EXECUTE grant.
REVOKE ALL ON FUNCTION public.can_manage_content(), public.can_read_panitia(UUID,BOOLEAN),
  public.create_panitia_request(UUID,JSONB), public.decide_panitia_request(UUID,INTEGER,BOOLEAN,TEXT), public.set_panitia_assignments(UUID,INTEGER,UUID[],TEXT),
  public.save_portal_pengumuman(UUID,INTEGER,JSONB), public.cancel_portal_pengumuman(UUID,INTEGER,TEXT), public.set_tiket_deadline(UUID,TIMESTAMPTZ),
  public.save_portal_media(UUID,INTEGER,JSONB), public.archive_portal_media(UUID,INTEGER,BOOLEAN),
  public.audit_portal_content(), public.check_announcement_attendance(), public.stamp_ticket_update(), public.stamp_announcement_insert() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_content(), public.can_read_panitia(UUID,BOOLEAN),
  public.create_panitia_request(UUID,JSONB), public.decide_panitia_request(UUID,INTEGER,BOOLEAN,TEXT), public.set_panitia_assignments(UUID,INTEGER,UUID[],TEXT),
  public.save_portal_pengumuman(UUID,INTEGER,JSONB), public.cancel_portal_pengumuman(UUID,INTEGER,TEXT), public.set_tiket_deadline(UUID,TIMESTAMPTZ),
  public.save_portal_media(UUID,INTEGER,JSONB), public.archive_portal_media(UUID,INTEGER,BOOLEAN) TO authenticated;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END;
$$;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bidang, public.divisi, public.panitia_requests, public.panitia_assignments, public.panitia_history, public.media_resources, public.content_history;
COMMIT;
