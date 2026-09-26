-- =====================================================================
-- 0012 — App 6 : Chant
-- =====================================================================

-- Une ligne par exercice termine (ou par echauffement). Le score est la
-- part du temps passe a moins d'un quart de ton de la note visee ; il est
-- nul pour un echauffement, qui ne se note pas.
create table if not exists public.voice_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  session_date date not null default current_date,
  exercise_key text not null,
  root_midi    smallint check (root_midi between 24 and 108),
  score        smallint check (score between 0 and 100),
  duration_sec smallint not null default 0 check (duration_sec >= 0),
  created_at   timestamptz not null default now()
);

create index if not exists voice_sessions_user_date_idx
  on public.voice_sessions (user_id, session_date desc);
select public.apply_owner_rls('public.voice_sessions');

-- Tessiture mesuree : une seule ligne par utilisateur, reecrite a chaque test.
create table if not exists public.voice_profiles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null unique references auth.users(id) on delete cascade,
  low_midi   smallint not null check (low_midi between 24 and 108),
  high_midi  smallint not null check (high_midi between 24 and 108),
  voice_type text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (low_midi < high_midi)
);

drop trigger if exists voice_profiles_touch on public.voice_profiles;
create trigger voice_profiles_touch before update on public.voice_profiles
  for each row execute function public.touch_updated_at();
select public.apply_owner_rls('public.voice_profiles');
