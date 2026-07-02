-- 098_public_punishment_reads.sql — leitura PÚBLICA das punições (Mural + placar).
-- user_warnings tem RLS restrita (admin/próprio). O Mural e o aviso de "banido nesta
-- partida" precisam ser acessíveis a TODOS (anti-anonimato = accountability pública).
-- Em vez de afrouxar a tabela crua, expomos só os campos públicos das punições
-- APLICADAS via duas funções SECURITY DEFINER.

-- 1) Mural completo: banidos/suspensos + a advertência aplicada mais recente + Steam + partida.
create or replace function public.wall_of_shame()
returns jsonb
language sql
security definer
set search_path to 'public'
stable
as $function$
  select coalesce(jsonb_agg(jsonb_build_object(
    'user_id', p.id,
    'username', p.username,
    'status', p.behavior_status,
    'banned_at', p.banned_at,
    'banned_reason', p.banned_reason,
    'suspended_until', p.suspended_until,
    'principle_violated', w.principle_violated,
    'antipattern_violated', w.antipattern_violated,
    'notes', w.notes,
    'issued_at', w.issued_at,
    'dota_match_id', w.dota_match_id,
    'steam_id_64', sl.steam_id_64
  )), '[]'::jsonb)
  from public.profiles p
  left join lateral (
    select w2.principle_violated, w2.antipattern_violated, w2.notes, w2.issued_at, w2.dota_match_id
    from public.user_warnings w2
    where w2.user_id = p.id and w2.status = 'aplicada'
    order by w2.issued_at desc
    limit 1
  ) w on true
  left join public.steam_links sl on sl.user_id = p.id
  where p.behavior_status in ('suspended', 'banned');
$function$;

-- 2) Banimentos ligados a UMA partida (aviso público no placar do histórico).
create or replace function public.match_bans(p_dota_match_id text)
returns jsonb
language sql
security definer
set search_path to 'public'
stable
as $function$
  select coalesce(jsonb_agg(jsonb_build_object(
    'user_id', w.user_id,
    'username', p.username,
    'antipattern_violated', w.antipattern_violated,
    'principle_violated', w.principle_violated,
    'notes', w.notes
  )), '[]'::jsonb)
  from public.user_warnings w
  join public.profiles p on p.id = w.user_id
  where w.dota_match_id = p_dota_match_id
    and w.severity = 'banimento'
    and w.status = 'aplicada';
$function$;

grant execute on function public.wall_of_shame() to anon, authenticated;
grant execute on function public.match_bans(text) to anon, authenticated;
