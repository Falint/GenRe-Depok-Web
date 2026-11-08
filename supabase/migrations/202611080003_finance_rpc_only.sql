-- Stage 3: apply only after the new application uses creation RPCs.
BEGIN;
REVOKE INSERT ON public.reimburse, public.kas_mutasi FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS reimburse_insert ON public.reimburse;
DROP POLICY IF EXISTS kas_insert_inti ON public.kas_mutasi;
COMMIT;
