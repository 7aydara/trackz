-- =====================================================================
-- 0002 — App 1 : Habit Tracker central
-- =====================================================================

create table if not exists public.habits (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  emoji           text not null default '✨',
  color           text not null default 'violet',
  frequency       text not null default 'daily'
                    check (frequency in ('daily', 'weekly')),
  target_per_week smallint not null default 7 check (target_per_week between 1 and 7),
  sort_order      smallint not null default 0,
  archived        boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists habits_user_idx on public.habits (user_id, archived, sort_order);
create trigger habits_touch before update on public.habits
  for each row execute function public.touch_updated_at();
select public.apply_owner_rls('public.habits');

create table if not exists public.habit_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  habit_id   uuid not null references public.habits(id) on delete cascade,
  log_date   date not null default current_date,
  done       boolean not null default true,
  note       text,
  created_at timestamptz not null default now(),
  unique (habit_id, log_date)
);

create index if not exists habit_logs_user_date_idx on public.habit_logs (user_id, log_date);
select public.apply_owner_rls('public.habit_logs');

-- ---------------------------------------------------------------------
-- Check-in quotidien par domaine (business / ecoles).
-- Permet au tracker central d'agreger un "j'ai avance dessus aujourd'hui"
-- pour les modules qui ne sont pas naturellement des habitudes cochables.
-- ---------------------------------------------------------------------
create table if not exists public.domain_checkins (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  domain     text not null check (domain in ('business', 'schools')),
  log_date   date not null default current_date,
  done       boolean not null default true,
  note       text,
  created_at timestamptz not null default now(),
  unique (user_id, domain, log_date)
);

create index if not exists domain_checkins_user_date_idx
  on public.domain_checkins (user_id, log_date);
select public.apply_owner_rls('public.domain_checkins');
