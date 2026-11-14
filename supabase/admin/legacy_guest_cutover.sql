-- Manual owner operation after backup and admin bootstrap; never run automatically.
BEGIN;
CREATE TEMP TABLE reviewed_legacy_accounts(id uuid PRIMARY KEY) ON COMMIT DROP;
-- Fill this list with reviewed UUIDs of old artificial accounts before executing the whole transaction:
-- INSERT INTO reviewed_legacy_accounts VALUES ('reviewed-uuid-here');
DO $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE level='admin') THEN RAISE EXCEPTION 'Bootstrap admin terlebih dahulu.'; END IF;
  IF NOT EXISTS(SELECT 1 FROM reviewed_legacy_accounts) THEN RAISE EXCEPTION 'Daftar UUID akun lama masih kosong.'; END IF;
  IF EXISTS(SELECT 1 FROM reviewed_legacy_accounts r LEFT JOIN public.profiles p USING(id)
    WHERE p.id IS NULL OR p.level IN ('guest','admin') OR lower(split_part(p.email,'@',2)) <> 'genredepok.or.id')
    THEN RAISE EXCEPTION 'Daftar harus berisi akun buatan lama non-admin, belum diturunkan.'; END IF;
END;
$$;
-- Owner-only snapshot keeps the complete old placement for review and controlled recovery.
CREATE TABLE IF NOT EXISTS public.legacy_account_access_snapshot (
  id uuid PRIMARY KEY REFERENCES public.profiles(id),
  before_profile jsonb NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.legacy_account_access_snapshot ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.legacy_account_access_snapshot FROM PUBLIC, anon, authenticated;
SELECT p.id FROM public.profiles p JOIN reviewed_legacy_accounts r USING(id) ORDER BY p.id FOR UPDATE OF p;
INSERT INTO public.legacy_account_access_snapshot(id,before_profile)
SELECT p.id,to_jsonb(p) FROM public.profiles p JOIN reviewed_legacy_accounts r USING(id);
UPDATE public.profiles p SET level='guest',jabatan='Tamu',bidang_id=NULL,divisi_id=NULL,
  bidang_divisi='-',kelompok='-',access_version=access_version+1
FROM reviewed_legacy_accounts r WHERE p.id=r.id;
INSERT INTO public.account_access_history(actor_id,target_id,before_profile,after_profile)
SELECT NULL,p.id,s.before_profile,to_jsonb(p) FROM public.profiles p
JOIN reviewed_legacy_accounts r USING(id) JOIN public.legacy_account_access_snapshot s USING(id);
COMMIT;
