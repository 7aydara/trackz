-- =====================================================================
-- 0003 — App 4 : Suivi des cours
-- =====================================================================

create table if not exists public.subjects (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  emoji      text not null default '📘',
  color      text not null default 'sky',
  teacher    text,
  goal_minutes smallint not null default 30 check (goal_minutes between 5 and 600),
  sort_order smallint not null default 0,
  archived   boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subjects_user_idx on public.subjects (user_id, archived, sort_order);
drop trigger if exists subjects_touch on public.subjects;
create trigger subjects_touch before update on public.subjects
  for each row execute function public.touch_updated_at();
select public.apply_owner_rls('public.subjects');

create table if not exists public.subject_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  log_date   date not null default current_date,
  done       boolean not null default true,
  minutes    smallint check (minutes >= 0),
  note       text,
  created_at timestamptz not null default now(),
  unique (subject_id, log_date)
);

create index if not exists subject_logs_user_date_idx on public.subject_logs (user_id, log_date);
select public.apply_owner_rls('public.subject_logs');
