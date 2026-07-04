-- 139_identity_view_handle.sql — handle na view de identidade pública — Pedro 2026-07-04.
--
-- A view public_player_identities é a fonte pública de identidade (contorna a RLS
-- de profiles). Adiciona `handle` pra resolver /perfil/<handle> → user_id e gerar
-- links bonitos sem furar a RLS. Coluna nova vai no FIM (regra do CREATE OR REPLACE).

create or replace view public.public_player_identities as
  select id, username, avatar_url, social_links, handle
  from public.profiles;
