-- 141_dodge_penalty_flag.sql — cooldown de recusa vira feature flag — Pedro 2026-07-05.
--
-- O cooldown de 5 min por recusar/não aceitar uma partida (match_cooldown_until,
-- migration 067) passa a ser CONTROLADO por feature flag `match_dodge_penalty`.
-- Ativado (enabled=true) por padrão. Gate no PONTO DE ESCRITA: com a flag OFF, o
-- cooldown nunca é gravado → nada pra bloquear (o enforcement existente em
-- queue/actions.ts e enter_party_queue não precisa mudar). Também RESETA os cooldowns
-- atuais (limpa quem estiver penalizado agora).
--
-- decline/expire são caminho de matchmaking: reproduzidas VERBATIM do prod + o único
-- acréscimo = `if dodge_penalty_enabled() then ... end if` em volta do UPDATE do cooldown.

-- 1) Flag (ligada). label descreve; enabled=true = penalidade ativa.
insert into public.feature_flags (key, enabled, label)
values ('match_dodge_penalty', true, 'Cooldown de 5 min ao recusar/não aceitar partida')
on conflict (key) do nothing;

-- 2) Helper (espelha quiz_enabled): true só se a flag existir e estiver ligada.
create or replace function public.dodge_penalty_enabled()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select coalesce((select enabled from feature_flags where key = 'match_dodge_penalty'), false);
$function$;

-- 3) decline_match_proposal — cooldown só quando a flag está ligada.
create or replace function public.decline_match_proposal(p_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_uid uuid := auth.uid(); v_prop record; a jsonb;
begin
  if v_uid is null then return; end if;
  select * into v_prop from match_proposals where id = p_id and status = 'pending' for update;
  if not found then return; end if;
  if not exists (select 1 from jsonb_array_elements(v_prop.assignments) e where (e->>'user_id')::uuid = v_uid) then
    return;
  end if;
  update match_proposals set status='cancelled' where id = p_id;
  for a in select jsonb_array_elements(v_prop.assignments) loop
    if (a->>'user_id')::uuid = v_uid then
      update match_queue set status='cancelled' where proposal_id = p_id and user_id = v_uid;
      if dodge_penalty_enabled() then
        update profiles set match_cooldown_until = now() + interval '5 minutes' where id = v_uid;
      end if;
    else
      update match_queue set proposal_id = null, last_heartbeat = now()
        where proposal_id = p_id and user_id = (a->>'user_id')::uuid;
    end if;
  end loop;
  perform recompute_queue_live_stats();
end; $function$;

-- 4) expire_match_proposals — cooldown de quem NÃO aceitou só quando a flag está ligada.
create or replace function public.expire_match_proposals()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_prop record; a jsonb;
begin
  for v_prop in select * from match_proposals where status='pending' and expires_at < now() for update loop
    update match_proposals set status='cancelled' where id = v_prop.id;
    for a in select jsonb_array_elements(v_prop.assignments) loop
      if (a->>'accepted')::boolean is true then
        update match_queue set proposal_id=null, last_heartbeat=now()
          where proposal_id = v_prop.id and user_id = (a->>'user_id')::uuid;
      else
        update match_queue set status='cancelled'
          where proposal_id = v_prop.id and user_id = (a->>'user_id')::uuid;
        if dodge_penalty_enabled() then
          update profiles set match_cooldown_until = now() + interval '5 minutes'
            where id = (a->>'user_id')::uuid;
        end if;
      end if;
    end loop;
  end loop;
  perform recompute_queue_live_stats();
end; $function$;

-- 5) RESET dos cooldowns atuais (limpa quem está penalizado agora).
update public.profiles set match_cooldown_until = null where match_cooldown_until is not null;
