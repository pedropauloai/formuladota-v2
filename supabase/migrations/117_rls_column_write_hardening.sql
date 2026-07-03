-- 117_rls_column_write_hardening.sql — Auditoria de segurança 2026-07-03.
--
-- Fecha a classe de furo "linha própria ≠ colunas próprias livres": policies self-write
-- com USING (auth.uid() = user_id) NÃO restringem QUAIS colunas o usuário grava. Como o
-- front usa a anon key + JWT do próprio usuário direto no PostgREST, dava pra forjar
-- doutrina, MMR, nível, XP, permissões e reputação com um simples
-- `supabase.from(...).update(...)` no console do navegador.
--
-- Ver memórias: reference_rls_column_write_escalation + reference_definer_rpc_auth.
-- Companion (mesmo PR): doutrina/actions.ts e perfil/actions.ts passam a gravar as
-- colunas protegidas via service role (server-side, já validado), não mais pela sessão
-- do usuário.

-- =====================================================================
-- C1 — profiles: congelar colunas de gate/privilégio/punição contra escrita direta
-- =====================================================================
-- A policy "users update own profile" deixava o usuário reescrever TODA coluna do próprio
-- perfil (só is_admin era travado no WITH CHECK). Em vez de encher a policy com ~20
-- subqueries frágeis, um trigger BEFORE UPDATE rejeita a alteração das colunas protegidas
-- APENAS quando a escrita vem crua do usuário logado.
--
-- Por que `current_user = 'authenticated'` e não `auth.uid()`: colunas como
-- match_permissions_consumed e mmr_atual são escritas LEGITIMAMENTE por funções
-- SECURITY DEFINER que o próprio usuário dispara (consume_match_permission, apply_match_mmr).
-- Dentro de uma função DEFINER (dona = postgres) o current_user vira 'postgres', então
-- essas passam. Só a escrita crua via PostgREST roda como 'authenticated' e é barrada.
-- Service role (admin, cron, sync server-side) roda como 'service_role' e também passa.
-- Mesmo idioma de gate usado em apply_match_mmr.

create or replace function public.enforce_profiles_frozen_columns()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  -- Só barra escrita CRUA de usuário logado (não-admin). DEFINER e service passam.
  if current_user = 'authenticated' and not public.is_admin() then
    if NEW.is_admin                       is distinct from OLD.is_admin
    or NEW.role                           is distinct from OLD.role
    or NEW.is_tester                      is distinct from OLD.is_tester
    or NEW.mmr_inicial                    is distinct from OLD.mmr_inicial
    or NEW.mmr_atual                      is distinct from OLD.mmr_atual
    or NEW.doctrine_accepted_at           is distinct from OLD.doctrine_accepted_at
    or NEW.doctrine_version               is distinct from OLD.doctrine_version
    or NEW.doctrine_quiz_progress         is distinct from OLD.doctrine_quiz_progress
    or NEW.behavior_status                is distinct from OLD.behavior_status
    or NEW.suspended_until                is distinct from OLD.suspended_until
    or NEW.banned_at                      is distinct from OLD.banned_at
    or NEW.banned_reason                  is distinct from OLD.banned_reason
    or NEW.trial_ends_at                  is distinct from OLD.trial_ends_at
    or NEW.calibration_status             is distinct from OLD.calibration_status
    or NEW.calibration_partidas_completas is distinct from OLD.calibration_partidas_completas
    or NEW.match_permissions_consumed     is distinct from OLD.match_permissions_consumed
    or NEW.match_cooldown_until           is distinct from OLD.match_cooldown_until
    or NEW.discord_id                     is distinct from OLD.discord_id
    or NEW.email                          is distinct from OLD.email
    or NEW.steam_id                       is distinct from OLD.steam_id
    then
      raise exception 'Alteração de coluna protegida do perfil não permitida via escrita direta.';
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_enforce_profiles_frozen on public.profiles;
create trigger trg_enforce_profiles_frozen
  before update on public.profiles
  for each row execute function public.enforce_profiles_frozen_columns();

-- =====================================================================
-- C2 — user_levels: remover UPDATE self (permitia `set current_level = 30`)
-- =====================================================================
-- XP/nível só sobem via award_xp (SECURITY DEFINER, execute já revogado na m083).
-- A criação de linha (ensure-row em tab-progresso) é INSERT, coberta por
-- user_levels_insert_self — que permanece.
drop policy if exists user_levels_update_self on public.user_levels;

-- =====================================================================
-- C3 — user_badges: remover INSERT self (forjava badge + farm de XP via trigger)
-- =====================================================================
-- Cada insert disparava trg_award_xp_badge -> award_xp(+100). Badges legítimos só via
-- triggers DEFINER de critério (award_*). Nenhum insert client-side legítimo existe.
-- Fecha também o bypass do hardening da m083 (o REVOKE de award_xp era contornado por
-- este caminho, porque o trigger é DEFINER e disparado por um INSERT controlado pelo user).
drop policy if exists user_badges_self_insert on public.user_badges;

-- =====================================================================
-- A1 — user_stats_extended: remover escrita self (forjava career.rankTier -> anti-smurf)
-- =====================================================================
-- Leitura pública permanece (stats_ext_select_all). A escrita passa a ser exclusiva do
-- service role: o sync server-side (perfil/actions.ts) busca da OpenDota/Stratz e grava;
-- admin grava via service. O usuário não escreve career arbitrário.
drop policy if exists stats_ext_self_upsert on public.user_stats_extended;

-- =====================================================================
-- A2 — RPCs de faturamento: validar o caller (IDOR)
-- =====================================================================
-- get_pro_revenue_summary / get_sponsored_pros: DEFINER com execute a authenticated e
-- p_*_user_id arbitrário -> qualquer logado lia faturamento/rede de mentoria de terceiros,
-- furando a RLS de revenue_splits/pro_promotions. Adiciona gate self-or-admin (padrão m083).
--
-- NOTA deliberada: get_honor_score NÃO é travado. Honra é reputação PÚBLICA (exibida na
-- página pública do coach e em views de PRO/aluno, cross-user) e retorna só um inteiro
-- agregado, sem PII nem detalhe do ledger. Travá-lo quebraria telas legítimas.

create or replace function public.get_pro_revenue_summary(
  p_pro_user_id uuid,
  p_since timestamp with time zone default null
)
returns table(
  total_revenue numeric,
  pro_earnings numeric,
  sponsor_given numeric,
  total_sales integer,
  is_first_sale_done boolean
)
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not (public.is_admin() or auth.uid() = p_pro_user_id) then
    raise exception 'sem permissão para consultar faturamento deste PRO';
  end if;

  return query
    select
      coalesce(sum(rs.total_brl), 0)::decimal(10,2),
      coalesce(sum(rs.pro_share_brl), 0)::decimal(10,2),
      coalesce(sum(rs.sponsor_share_brl), 0)::decimal(10,2),
      count(*)::int,
      exists (select 1 from public.revenue_splits x where x.pro_user_id = p_pro_user_id)
    from public.revenue_splits rs
    where rs.pro_user_id = p_pro_user_id
      and (p_since is null or rs.created_at >= p_since);
end;
$$;

create or replace function public.get_sponsored_pros(p_sponsor_user_id uuid)
returns table(
  user_id uuid,
  promoted_at timestamp with time zone,
  status text
)
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not (public.is_admin() or auth.uid() = p_sponsor_user_id) then
    raise exception 'sem permissão para consultar a rede deste patrocinador';
  end if;

  return query
    select pp.user_id, pp.promoted_at, pp.status
    from public.pro_promotions pp
    where pp.sponsor_user_id = p_sponsor_user_id
    order by pp.promoted_at desc;
end;
$$;
