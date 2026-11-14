-- Manual owner operation. Replace NULL with the UUID of a verified Gmail account registered via /daftar.
-- Never choose an account by display name or signup metadata.
BEGIN;
DO $$
DECLARE target uuid := NULL; previous public.profiles%ROWTYPE; changed public.profiles%ROWTYPE;
BEGIN
  IF target IS NULL THEN RAISE EXCEPTION 'Isi UUID akun admin terverifikasi terlebih dahulu.'; END IF;
  SELECT * INTO previous FROM public.profiles WHERE id=target FOR UPDATE;
  IF previous.id IS NULL OR previous.level <> 'guest' OR NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id=target AND email_confirmed_at IS NOT NULL
      AND lower(email)=lower(previous.email) AND lower(split_part(email,'@',2))='gmail.com'
  ) THEN RAISE EXCEPTION 'Target wajib akun guest dengan Gmail terverifikasi.'; END IF;
  UPDATE public.profiles SET level='admin',jabatan='Administrator',bidang_id=NULL,divisi_id=NULL,
    bidang_divisi='-',kelompok='-',access_version=access_version+1 WHERE id=target RETURNING * INTO changed;
  INSERT INTO public.account_access_history(actor_id,target_id,before_profile,after_profile)
  VALUES(NULL,target,to_jsonb(previous),to_jsonb(changed));
END;
$$;
COMMIT;
