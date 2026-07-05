-- 147: canais de voz DINÂMICOS por time (Iluminados/Temidos) de cada partida.
-- O bot cria ao formar, guarda o ID aqui; a página da partida linka o canal do time
-- do jogador; o bot apaga ao finalizar. NULL = ainda não criado / já apagado.
alter table public.lobbies
  add column if not exists iluminados_voice_id text,  -- canal de voz do time Radiant
  add column if not exists temidos_voice_id text;     -- canal de voz do time Dire

create index if not exists lobbies_team_voice_pending_idx
  on public.lobbies (status)
  where iluminados_voice_id is null and status = 'in_progress';
