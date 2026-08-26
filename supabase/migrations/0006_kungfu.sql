-- =====================================================================
-- 0006 — App 5 : Kung Fu Shaolin
-- =====================================================================

create table if not exists public.workouts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  session_date date not null default current_date,
  duration_min smallint not null default 30 check (duration_min between 1 and 600),
  focus        text,
  intensity    smallint not null default 3 check (intensity between 1 and 5),
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists workouts_user_date_idx on public.workouts (user_id, session_date desc);
drop trigger if exists workouts_touch on public.workouts;
create trigger workouts_touch before update on public.workouts
  for each row execute function public.touch_updated_at();
select public.apply_owner_rls('public.workouts');

create table if not exists public.workout_exercises (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  workout_id   uuid not null references public.workouts(id) on delete cascade,
  name         text not null,
  category     text not null default 'conditionnement'
                 check (category in ('conditionnement', 'stance', 'taolu', 'souplesse', 'autre')),
  sets         smallint check (sets >= 0),
  reps         smallint check (reps >= 0),
  duration_sec smallint check (duration_sec >= 0),
  sort_order   smallint not null default 0,
  notes        text,
  created_at   timestamptz not null default now()
);

create index if not exists workout_exercises_workout_idx
  on public.workout_exercises (workout_id, sort_order);
create index if not exists workout_exercises_user_name_idx
  on public.workout_exercises (user_id, name);
select public.apply_owner_rls('public.workout_exercises');

create table if not exists public.stance_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  workout_id   uuid references public.workouts(id) on delete set null,
  stance_key   text not null,
  log_date     date not null default current_date,
  hold_seconds smallint not null check (hold_seconds >= 0),
  note         text,
  created_at   timestamptz not null default now()
);

create index if not exists stance_logs_user_idx
  on public.stance_logs (user_id, stance_key, log_date);
select public.apply_owner_rls('public.stance_logs');

create table if not exists public.taolu_progress (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  item_key   text not null,
  name       text not null,
  category   text not null default 'taolu'
               check (category in ('taolu', 'technique', 'stance')),
  level      text not null default 'debutant'
               check (level in ('debutant', 'intermediaire', 'avance')),
  status     text not null default 'a_apprendre'
               check (status in ('a_apprendre', 'en_cours', 'maitrise')),
  sort_order smallint not null default 0,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, item_key)
);

create index if not exists taolu_progress_user_idx
  on public.taolu_progress (user_id, level, sort_order);
drop trigger if exists taolu_progress_touch on public.taolu_progress;
create trigger taolu_progress_touch before update on public.taolu_progress
  for each row execute function public.touch_updated_at();
select public.apply_owner_rls('public.taolu_progress');

-- Espace Chan : notes / citations liees a la discipline
create table if not exists public.philosophy_notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  content    text not null,
  author     text,
  note_date  date not null default current_date,
  pinned     boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists philosophy_notes_user_idx
  on public.philosophy_notes (user_id, pinned desc, note_date desc);
select public.apply_owner_rls('public.philosophy_notes');
