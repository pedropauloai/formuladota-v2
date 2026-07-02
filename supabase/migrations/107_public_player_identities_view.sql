-- 107: view pública com SÓ a identidade (id, username Discord, avatar Discord).
-- Anti-anonimato: o nome Discord é PÚBLICO por design. A RLS de profiles só deixa
-- ler o próprio/admin/coach, então listas de terceiros (ranking, sidebar) caíam no
-- nick Steam pra quem não é admin. Esta view (owner postgres → bypassa a RLS de
-- profiles) expõe APENAS as 3 colunas de identidade, nada sensível.
create or replace view public.public_player_identities
  with (security_invoker = off)
as
  select id, username, avatar_url
  from public.profiles;

grant select on public.public_player_identities to anon, authenticated;
