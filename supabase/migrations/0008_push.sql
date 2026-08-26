-- =====================================================================
-- 0008 — Notifications push (Web Push / PWA)
-- =====================================================================

create table if not exists public.push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,

  -- Abonnement Web Push renvoye par le navigateur
  endpoint      text not null unique,
  p256dh        text not null,
  auth          text not null,

  -- Reglages du rappel, par appareil : le telephone peut sonner a 20h
  -- et le portable a 18h.
  timezone      text not null default 'UTC',
  reminder_hour smallint not null default 20 check (reminder_hour between 0 and 23),
  enabled       boolean not null default true,

  label         text,
  -- Garde-fou anti-doublon : une seule notification par jour et par appareil.
  last_sent_on  date,
  last_error    text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);
create index if not exists push_subscriptions_due_idx
  on public.push_subscriptions (enabled, reminder_hour);

drop trigger if exists push_subscriptions_touch on public.push_subscriptions;
create trigger push_subscriptions_touch before update on public.push_subscriptions
  for each row execute function public.touch_updated_at();

select public.apply_owner_rls('public.push_subscriptions');
