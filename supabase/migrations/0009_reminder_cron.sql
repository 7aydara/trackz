-- =====================================================================
-- 0009 — Planification du rappel quotidien
-- =====================================================================
-- Le cron tourne toutes les heures ; c'est l'Edge Function qui decide,
-- pour chaque appareil, si c'est bien l'heure locale de son proprietaire.
--
-- Le secret partage entre pg_cron et la fonction vit dans Vault : il n'est
-- ni en clair dans la definition du job, ni dans ce depot. Remplace
-- <CRON_SECRET> par la meme valeur que le secret `CRON_SECRET` de
-- l'Edge Function, puis execute ce fichier.
--   Generer une valeur : openssl rand -base64 32 | tr '+/' '-_' | tr -d '='

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;
create extension if not exists supabase_vault with schema vault;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'trackz_cron_secret') then
    perform vault.create_secret(
      '<CRON_SECRET>',
      'trackz_cron_secret',
      'Secret partage entre pg_cron et l''Edge Function send-reminders'
    );
  end if;
end;
$$;

select cron.unschedule('trackz-send-reminders')
where exists (select 1 from cron.job where jobname = 'trackz-send-reminders');

select cron.schedule(
  'trackz-send-reminders',
  '0 * * * *',
  $job$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'trackz_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $job$
);
