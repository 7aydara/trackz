-- =====================================================================
-- 0001 — Socle commun : profils + helper RLS
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- updated_at automatique
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Helper : active la RLS et cree les 4 policies "je ne vois que mes
-- donnees" sur une table possedant une colonne user_id.
-- Reserve au proprietaire de la base (revoque pour anon/authenticated).
-- ---------------------------------------------------------------------
create or replace function public.apply_owner_rls(tbl regclass)
returns void
language plpgsql
as $fn$
declare
  t text := tbl::text;
begin
  execute format('alter table %s enable row level security', t);

  execute format(
    'create policy "owner_select" on %s for select to authenticated using (auth.uid() = user_id)', t);
  execute format(
    'create policy "owner_insert" on %s for insert to authenticated with check (auth.uid() = user_id)', t);
  execute format(
    'create policy "owner_update" on %s for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  execute format(
    'create policy "owner_delete" on %s for delete to authenticated using (auth.uid() = user_id)', t);
end;
$fn$;

revoke all on function public.apply_owner_rls(regclass) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Profils
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  emoji        text not null default '🚀',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Creation automatique du profil a l'inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
