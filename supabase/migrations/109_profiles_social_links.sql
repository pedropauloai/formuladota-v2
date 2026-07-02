-- 109: redes sociais do usuário (Pedro 2026-07-02). O Discord já vem do login;
-- aqui o user registra as OUTRAS (twitch/youtube/kick/instagram/twitter). Guardamos
-- a URL completa do perfil por rede num jsonb — flexível e sem adivinhar formato de handle.
alter table public.profiles
  add column if not exists social_links jsonb not null default '{}'::jsonb;

-- Expõe social_links na view pública de identidade (é info pública do perfil).
create or replace view public.public_player_identities
  with (security_invoker = off)
as
  select id, username, avatar_url, social_links
  from public.profiles;

grant select on public.public_player_identities to anon, authenticated;
