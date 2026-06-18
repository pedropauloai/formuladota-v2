-- 056 — Motor de MMR: aplica o resultado de uma partida ao ranking da temporada.
-- (Pedro 2026-06-18) Híbrido: o delta Elo (win/loss, calculado no app a partir da
-- média dos times) é MODULADO por desempenho (percentis OpenDota) e chega aqui
-- PRONTO por jogador. Esta RPC só PERSISTE — de forma transacional e idempotente.
--
-- Fecha o buraco da auditoria: player_season_mmr nunca era escrita pela aplicação
-- (RLS só-leitura), então o ranking ficava eterno vazio. Agora toda partida
-- enriquecida (PT confirmada hoje; bot Steam no futuro) atualiza o ladder.

-- Idempotência: marca quando o MMR desta partida já foi aplicado.
alter table public.matches
  add column if not exists mmr_applied_at timestamptz;

comment on column public.matches.mmr_applied_at is
  'Quando o MMR desta partida foi aplicado ao ranking — evita aplicar 2x.';

-- RPC: aplica um array de resultados [{user_id, new_mmr, won}] à temporada dada.
-- SECURITY DEFINER porque player_season_mmr tem RLS só-leitura.
-- Gate: admin OU o coach dono da partida (quando mais PROs existirem).
create or replace function public.apply_match_mmr(
  p_match_id uuid,
  p_season_id integer,
  p_results jsonb
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_already timestamptz;
  v_row jsonb;
  v_won boolean;
  v_applied integer := 0;
begin
  -- Permissão: admin ou coach dono da partida.
  if not (
    public.is_admin()
    or exists (
      select 1 from public.matches m
      join public.coaches c on c.id = m.coach_id
      where m.id = p_match_id and c.profile_id = auth.uid()
    )
  ) then
    raise exception 'sem permissão pra aplicar MMR nesta partida';
  end if;

  -- Idempotência: trava a linha da partida e checa se já foi aplicada.
  select mmr_applied_at into v_already
  from public.matches where id = p_match_id for update;
  if v_already is not null then
    return 0; -- já aplicado — no-op
  end if;

  for v_row in select * from jsonb_array_elements(p_results)
  loop
    v_won := (v_row->>'won')::boolean;
    insert into public.player_season_mmr
      (user_id, season_id, mmr, vitorias, derrotas, partidas_total, last_match_at)
    values (
      (v_row->>'user_id')::uuid,
      p_season_id,
      (v_row->>'new_mmr')::integer,
      case when v_won then 1 else 0 end,
      case when v_won then 0 else 1 end,
      1,
      now()
    )
    on conflict (user_id, season_id) do update set
      mmr            = excluded.mmr,
      vitorias       = player_season_mmr.vitorias + (case when v_won then 1 else 0 end),
      derrotas       = player_season_mmr.derrotas + (case when v_won then 0 else 1 end),
      partidas_total = player_season_mmr.partidas_total + 1,
      last_match_at  = now();
    v_applied := v_applied + 1;
  end loop;

  update public.matches set mmr_applied_at = now() where id = p_match_id;
  return v_applied;
end;
$$;

grant execute on function public.apply_match_mmr(uuid, integer, jsonb) to authenticated;
