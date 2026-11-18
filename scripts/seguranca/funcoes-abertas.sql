-- Teste de regressão das funções SECURITY DEFINER do schema public (migration 164). Só leitura.
-- PASSA quando a consulta volta VAZIA; cada linha é uma regressão a corrigir.
-- Rodar: node <scratchpad>/sql.mjs nyvbfdsxjpiwgdroptdi file scripts/seguranca/funcoes-abertas.sql
-- Função nova que o visitante precisa chamar entra em aprovadas_visitante, com o motivo.
with aprovadas_visitante (assinatura, motivo) as (
  values
    ('community_counters()',             'contador de online e banidos na barra do topo de toda página, inclusive as públicas'),
    ('online_players()',                 'lista de quem está online no hover da barra do topo, também em página pública'),
    ('recent_matches(integer, integer)', 'feed de partidas em /partidas e na barra lateral'),
    ('live_matches()',                   'partidas ao vivo em /partidas'),
    ('season_positions(uuid[])',         'número da medalha dos Imortais no shell, em /partidas e no placar público'),
    ('wall_of_shame()',                  'mural de banidos e suspensos na barra lateral e em /ranking (anti-anonimato)'),
    ('get_pros_live_status()',           'faixa de PROs ao vivo na home e em /coaches'),
    ('match_bans(text)',                 'banimentos da partida no placar público /partida/historico'),
    ('get_honor_score(uuid)',            'honra do PRO no perfil público /coaches/[slug]'),
    ('get_queue_searchers()',            'contador "na fila" da barra do topo, também para visitante (quem busca partida é público)'),
    ('get_public_mini_profile(uuid)',    'cartão do jogador ao passar o mouse no ranking e nas partidas, também para visitante'),
    ('is_admin()',                       'helper de RLS nas políticas de leitura pública (loja, coaches, pacotes, novidades); devolve false sem login'),
    ('is_party_member(uuid)',            'helper de RLS das políticas de leitura das tabelas de grupo (TO public); devolve false sem login')
),
internas (assinatura, motivo) as (
  values
    ('confirm_match_proposal(uuid)', 'só accept_match_proposal e try_form_match criam a sala'),
    ('expire_match_proposals()',     'só queue_liveness_tick chama'),
    ('queue_liveness_tick()',        'só o cron queue-liveness chama'),
    ('recompute_queue_live_stats()', 'só as funções de fila e o gatilho de match_queue chamam'),
    ('dodge_penalty_enabled()',      'só decline_match_proposal e expire_match_proposals chamam'),
    ('reset_dormant_behavior()',     'manutenção sem chamador no app'),
    ('release_bot(text)',            'os gatilhos de lobbies liberam o bot'),
    ('is_pro_first_sale(uuid)',      'só o gatilho de split de receita chama'),
    ('can_change_price(uuid)',       'legado do preço por PRO'),
    ('get_max_price_for_pro(uuid)',  'legado do preço por PRO'),
    ('get_sponsored_pros(uuid)',     'sem chamador no código'),
    ('has_active_subscription()',    'sem chamador no código'),
    ('has_subscription_tier(text)',  'sem chamador no código'),
    ('active_subscription_tier()',   'só has_subscription_tier chama'),
    ('can_join_elite(uuid)',         'sem chamador no código'),
    ('consume_match_permission()',   'o consumo de permissão passou para confirm_match_proposal'),
    ('is_coach()',                   'sem chamador no código')
),
definer as (
  select p.oid,
         p.proname || '(' || oidvectortypes(p.proargtypes) || ')' as assinatura,
         p.prorettype = 'trigger'::regtype as gatilho
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef
),
papeis (papel) as (
  values ('anon'), ('authenticated')
)
select 'aberta a visitante fora da lista aprovada' as problema, d.assinatura as alvo
from definer d
where has_function_privilege('anon', d.oid, 'EXECUTE')
  and d.assinatura not in (select assinatura from aprovadas_visitante)
union all
select 'interna ou de gatilho executável por logado', d.assinatura
from definer d
where has_function_privilege('authenticated', d.oid, 'EXECUTE')
  and (d.gatilho or d.assinatura in (select assinatura from internas))
union all
select 'aprovada para visitante sem EXECUTE (a página pública quebra)', a.assinatura
from aprovadas_visitante a
where not exists (
  select 1 from definer d
  where d.assinatura = a.assinatura and has_function_privilege('anon', d.oid, 'EXECUTE')
)
union all
select 'party_members: INSERT liberado', r.papel
from papeis r
where has_table_privilege(r.papel, 'public.party_members', 'INSERT')
union all
select 'party_members: UPDATE em coluna além de roles', r.papel || '.' || a.attname
from papeis r
cross join pg_attribute a
where a.attrelid = 'public.party_members'::regclass
  and a.attnum > 0 and not a.attisdropped
  and a.attname <> 'roles'
  and has_column_privilege(r.papel, 'public.party_members', a.attname, 'UPDATE')
order by 1, 2
