-- =====================================================================
-- 0010 — Durcissement (retours du linter Supabase)
-- =====================================================================

-- 1. search_path fige. Sans cela, un role qui controle son search_path
--    peut faire resoudre un nom de table ou d'operateur vers un objet
--    a lui a l'interieur de la fonction.
alter function public.touch_updated_at()          set search_path = public, pg_temp;
alter function public.apply_owner_rls(regclass)   set search_path = public, pg_temp;
alter function public.log_school_status()         set search_path = public, pg_temp;

-- 2. Les fonctions de trigger n'ont aucune raison d'etre exposees en RPC.
--    `handle_new_user` est SECURITY DEFINER : elle etait appelable par
--    anon via /rest/v1/rpc/handle_new_user. Revoquer EXECUTE ne casse pas
--    les triggers (le droit est verifie a la creation, pas au declenchement).
revoke all on function public.handle_new_user()   from public, anon, authenticated;
revoke all on function public.touch_updated_at()  from public, anon, authenticated;
revoke all on function public.log_school_status() from public, anon, authenticated;

-- `seed_kungfu_tree` reste volontairement appelable par un utilisateur
-- connecte : c'est l'app qui l'appelle, et la fonction n'ecrit que sur
-- les lignes de `auth.uid()`.
