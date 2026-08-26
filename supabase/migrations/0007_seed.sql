-- =====================================================================
-- 0007 — Contenu par defaut (skill tree Kung Fu)
-- =====================================================================

-- Initialise l'arbre de progression Shaolin pour l'utilisateur courant.
-- Idempotent : ne recree pas ce qui existe deja (unique (user_id, item_key)).
create or replace function public.seed_kungfu_tree()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  inserted integer;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  with defaults(item_key, name, category, level, sort_order) as (
    values
      -- Debutant : les fondations
      ('ma_bu',            'Ma Bu — posture du cavalier',        'stance',    'debutant',      10),
      ('gong_bu',          'Gong Bu — posture de l''arc',        'stance',    'debutant',      20),
      ('xu_bu',            'Xu Bu — posture vide',               'stance',    'debutant',      30),
      ('pu_bu',            'Pu Bu — posture rampante',           'stance',    'debutant',      40),
      ('xie_bu',           'Xie Bu — posture croisee',           'stance',    'debutant',      50),
      ('chong_quan',       'Chong Quan — poing direct',          'technique', 'debutant',      60),
      ('ma_bu_chong_quan', 'Ma Bu Chong Quan — poing en cavalier','technique','debutant',      70),
      ('tan_tui_1_4',      'Tan Tui — routines 1 a 4',           'taolu',     'debutant',      80),
      ('wu_bu_quan',       'Wu Bu Quan — enchainement 5 postures','taolu',    'debutant',      90),
      -- Intermediaire
      ('tan_tui_5_10',     'Tan Tui — routines 5 a 10',          'taolu',     'intermediaire', 10),
      ('lian_huan_quan',   'Lian Huan Quan — poings enchaines',  'taolu',     'intermediaire', 20),
      ('xiao_hong_quan',   'Xiao Hong Quan — petite boxe rouge', 'taolu',     'intermediaire', 30),
      ('tan_tui_kicks',    'Coups de pied : Tan Tui / Ce Chuai', 'technique', 'intermediaire', 40),
      ('sao_tang_tui',     'Sao Tang Tui — balayage bas',        'technique', 'intermediaire', 50),
      ('teng_kong_fei_jiao','Teng Kong Fei Jiao — coup saute',   'technique', 'intermediaire', 60),
      -- Avance
      ('da_hong_quan',     'Da Hong Quan — grande boxe rouge',   'taolu',     'avance',        10),
      ('luohan_quan',      'Luohan Quan — boxe des Arhats',      'taolu',     'avance',        20),
      ('gun_shu',          'Gun Shu — baton',                    'taolu',     'avance',        30),
      ('dao_shu',          'Dao Shu — sabre',                    'taolu',     'avance',        40),
      ('qin_na',           'Qin Na — saisies et cles',           'technique', 'avance',        50)
  )
  insert into public.taolu_progress (user_id, item_key, name, category, level, sort_order)
  select uid, d.item_key, d.name, d.category, d.level, d.sort_order
  from defaults d
  on conflict (user_id, item_key) do nothing;

  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

revoke all on function public.seed_kungfu_tree() from public, anon;
grant execute on function public.seed_kungfu_tree() to authenticated;
