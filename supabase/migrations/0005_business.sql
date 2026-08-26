-- =====================================================================
-- 0005 — App 2 : Business freelance
-- =====================================================================

create table if not exists public.clients (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  company    text,
  email      text,
  phone      text,
  status     text not null default 'actif' check (status in ('actif', 'inactif')),
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clients_user_idx on public.clients (user_id, status, name);
drop trigger if exists clients_touch on public.clients;
create trigger clients_touch before update on public.clients
  for each row execute function public.touch_updated_at();
select public.apply_owner_rls('public.clients');

create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  client_id   uuid references public.clients(id) on delete set null,
  title       text not null,
  description text,
  status      text not null default 'en_attente'
                check (status in ('en_attente', 'en_cours', 'livre', 'paye')),
  deadline    date,
  amount      numeric(12, 2) check (amount >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists projects_user_idx on public.projects (user_id, status, deadline);
drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();
select public.apply_owner_rls('public.projects');

create table if not exists public.invoices (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  client_id  uuid references public.clients(id) on delete set null,
  number     text not null,
  amount     numeric(12, 2) not null check (amount >= 0),
  currency   text not null default 'EUR',
  status     text not null default 'envoyee'
               check (status in ('brouillon', 'envoyee', 'payee')),
  issued_on  date not null default current_date,
  due_on     date,
  paid_on    date,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invoices_user_idx on public.invoices (user_id, status, due_on);
drop trigger if exists invoices_touch on public.invoices;
create trigger invoices_touch before update on public.invoices
  for each row execute function public.touch_updated_at();
select public.apply_owner_rls('public.invoices');

-- Le statut "en retard" est derive (envoyee + due_on depassee), il n'est
-- donc pas stocke : il ne peut jamais devenir incoherent avec la date.
