-- 047 — Fix: policy de UPDATE ausente em lobby_players (aprovado Pedro 2026-06-11)
--
-- Bug desde a migration 011 (Phase 5): lobby_players tinha policy de
-- select/insert/delete mas NENHUMA de update. Com RLS ativo, UPDATE sem
-- policy afeta 0 linhas EM SILÊNCIO (sem erro) — por isso "trocar de
-- time/slot" e "sair do slot (virar espectador)" nunca funcionaram: o
-- joinTeam fazia o update, recebia sucesso vazio e reportava sucesso falso.
--
-- O gate de ENTRADA no lobby (nível 6 OU permissão — migration 046) continua
-- sendo enforced no INSERT. Mover-se DENTRO de um lobby em que você já está
-- só exige ser o dono do próprio registro.

drop policy if exists "users update own lobby slot" on public.lobby_players;
create policy "users update own lobby slot" on public.lobby_players
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
