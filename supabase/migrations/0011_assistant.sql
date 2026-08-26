-- =====================================================================
-- 0011 — Assistant : fils de conversation
-- =====================================================================

create table if not exists public.assistant_threads (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null default 'Nouvelle conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists assistant_threads_user_idx
  on public.assistant_threads (user_id, updated_at desc);

drop trigger if exists assistant_threads_touch on public.assistant_threads;
create trigger assistant_threads_touch before update on public.assistant_threads
  for each row execute function public.touch_updated_at();

select public.apply_owner_rls('public.assistant_threads');

create table if not exists public.assistant_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  thread_id  uuid not null references public.assistant_threads(id) on delete cascade,
  role       text not null check (role in ('user', 'assistant')),

  -- Texte affiche dans la bulle. Vide pour les tours purement techniques.
  text       text not null default '',

  -- Blocs de contenu bruts renvoyes par l'API, rejoues tels quels au tour
  -- suivant : c'est ce qui permet a l'assistant de se souvenir de ce qu'il
  -- a cherche et modifie, pas seulement de ce qu'il a dit.
  blocks     jsonb,

  -- Les resultats d'outils sont des messages "user" cote API mais ne
  -- doivent pas apparaitre dans le fil.
  hidden     boolean not null default false,

  created_at timestamptz not null default now()
);

create index if not exists assistant_messages_thread_idx
  on public.assistant_messages (thread_id, created_at);

select public.apply_owner_rls('public.assistant_messages');
