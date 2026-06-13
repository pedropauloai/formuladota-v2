-- 054 — Leitura PÚBLICA da steam_links (aprovado Pedro 2026-06-12)
--
-- Princípio anti-anonimato: 1 Steam = 1 identidade, nome fixo, PÚBLICO, com
-- reputação atrelada. A RLS antiga (005) só deixava cada um ler o PRÓPRIO
-- vínculo — por isso listas/filas/ranking de TERCEIROS caíam no nick/foto
-- do Discord em vez da identidade Steam canônica.
--
-- persona/avatar/steam_id_64 são dados públicos por design (a Steam os expõe
-- no perfil); o vínculo user↔steam é exatamente o que a plataforma quer
-- tornar público. INSERT/UPDATE/DELETE continuam restritos ao dono/admin.

drop policy if exists "users see own steam_link" on public.steam_links;
drop policy if exists "everyone reads steam links" on public.steam_links;
create policy "everyone reads steam links" on public.steam_links
  for select using (true);
