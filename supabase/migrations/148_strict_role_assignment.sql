-- 148: ESCOLHA É LEI (Pedro 2026-07-05). Ninguém joga função que não escolheu.
-- Antes: _assign_team_roles era ganancioso e FORÇAVA a função que sobrava (ex.:
-- support_dedicated) em quem não a escolheu. Agora: matching correto (backtracking)
-- que só usa funções ESCOLHIDAS; se não dá pra cobrir as 5, a partida NÃO forma
-- (ver 149 — try_form_match retorna null e os entries ficam na fila).

create or replace function public._match_roles_bt(p_members jsonb, p_roles text[], p_team text)
returns jsonb
language plpgsql
immutable
set search_path to 'public'
as $fn$
declare
  v_first jsonb;
  v_rest  jsonb;
  v_prefs text[];
  r       text;
  v_sub   jsonb;
begin
  if jsonb_array_length(p_members) = 0 then
    return '[]'::jsonb;  -- todos atribuídos → sucesso
  end if;
  v_first := p_members->0;
  v_rest  := p_members - 0;  -- remove o 1º elemento (jsonb - int = remove por índice)
  v_prefs := array(select jsonb_array_elements_text(coalesce(v_first->'roles', '[]'::jsonb)));
  foreach r in array p_roles loop
    if r = any(v_prefs) then  -- só função que o jogador ESCOLHEU
      v_sub := public._match_roles_bt(v_rest, array_remove(p_roles, r), p_team);
      if v_sub is not null then
        return jsonb_build_array(
          jsonb_build_object('user_id', v_first->>'user_id', 'entry_id', v_first->>'entry_id',
                             'team', p_team, 'role', r)
        ) || v_sub;
      end if;
    end if;
  end loop;
  return null;  -- nenhuma função escolhida serve → backtrack/falha
end;
$fn$;

create or replace function public._assign_team_roles(p_members jsonb, p_team text, p_roles text[])
returns jsonb
language plpgsql
immutable
set search_path to 'public'
as $fn$
begin
  return public._match_roles_bt(p_members, p_roles, p_team);
end;
$fn$;
