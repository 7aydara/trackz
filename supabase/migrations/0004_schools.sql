-- =====================================================================
-- 0004 — App 3 : Dossiers ecoles
-- =====================================================================

create table if not exists public.schools (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  program    text,
  city       text,
  url        text,
  deadline   date,
  status     text not null default 'a_preparer'
               check (status in ('a_preparer', 'envoye', 'en_attente', 'accepte', 'refuse')),
  priority   smallint not null default 2 check (priority between 1 and 3),
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists schools_user_deadline_idx on public.schools (user_id, deadline);
create trigger schools_touch before update on public.schools
  for each row execute function public.touch_updated_at();
select public.apply_owner_rls('public.schools');

create table if not exists public.school_documents (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  school_id  uuid not null references public.schools(id) on delete cascade,
  label      text not null,
  done       boolean not null default false,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists school_documents_school_idx
  on public.school_documents (school_id, sort_order);
select public.apply_owner_rls('public.school_documents');

-- Historique des changements de statut (timeline d'une candidature)
create table if not exists public.school_status (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  school_id  uuid not null references public.schools(id) on delete cascade,
  status     text not null
               check (status in ('a_preparer', 'envoye', 'en_attente', 'accepte', 'refuse')),
  note       text,
  changed_at timestamptz not null default now()
);

create index if not exists school_status_school_idx
  on public.school_status (school_id, changed_at desc);
select public.apply_owner_rls('public.school_status');

-- Journalise automatiquement chaque changement de statut
create or replace function public.log_school_status()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.school_status (user_id, school_id, status)
    values (new.user_id, new.id, new.status);
  end if;
  return new;
end;
$$;

drop trigger if exists schools_status_history on public.schools;
create trigger schools_status_history
  after insert or update of status on public.schools
  for each row execute function public.log_school_status();
