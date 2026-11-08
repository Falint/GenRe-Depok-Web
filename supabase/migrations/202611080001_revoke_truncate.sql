-- Stage 1: owner applies after development backup. No data changes.
BEGIN;
REVOKE TRUNCATE ON public.profiles, public.surat, public.surat_approval,
  public.reimburse, public.reimburse_approval, public.kas_mutasi,
  public.pagu_anggaran, public.tiket_info FROM PUBLIC, anon, authenticated;
COMMIT;
