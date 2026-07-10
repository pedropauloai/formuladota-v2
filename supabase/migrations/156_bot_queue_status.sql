-- 156_bot_queue_status.sql — fila do bot Steam VISÍVEL pro jogador — Pedro 2026-07-10.
--
-- Contexto: só existe 1 conta Steam no bot-steam (Railway). Ele já serializa (1 lobby
-- por vez, trava em memória `jobAtivo`), mas isso era INVISÍVEL: quem formava a 2ª
-- partida caía num "aguardando sala" mudo. Com o modo liquidez (migration 155) a chance
-- de partidas simultâneas cresce, então o jogador precisa saber que está na fila e
-- quanto falta.
--
-- Esta migration NÃO muda a criação de partida. Só expõe o estado do bot:
--   1) `bots.claimed_at` — quando o bot pegou o lobby atual (pro cálculo do "pior caso").
--   2) RPC `get_lobby_queue_status(lobby)` — posição na fila + quando o bot chega no meu.
-- O worker (bot-server.js) passa a gravar busy/idle/claimed_at + heartbeat na tabela
-- `bots` (que já existia, migration 017, mas estava ociosa no fluxo de polling).

-- 1) Quando o bot pegou o lobby que está processando agora (base do countdown de espera).
alter table public.bots add column if not exists claimed_at timestamptz;

-- 2) Status da fila pra UM lobby que aguarda o bot. Público (a página /partida é pública);
--    info operacional inócua. Pior caso HONESTO: cada lobby pode segurar o bot por até
--    EXPIRA_MIN (10 min, ver bot-server.js) antes de lançar ou expirar.
create or replace function public.get_lobby_queue_status(p_lobby_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $function$
declare
  v_lobby        record;
  v_bot          record;
  v_ahead        int := 0;
  v_busy_other   boolean := false;
  v_position     int;
  v_wait_seconds numeric := 0;
  c_lobby_max    constant int := 600;               -- EXPIRA_MIN=10min por lobby (bot-server.js)
  c_hb_fresh     constant interval := interval '2 minutes'; -- heartbeat velho = bot travado/reiniciou
begin
  select id, status, steam_lobby_id, dota_match_id, created_at
    into v_lobby
  from lobbies
  where id = p_lobby_id;

  -- Só faz sentido enquanto o lobby AGUARDA o bot (status 'open', sem match ainda).
  if v_lobby.id is null or v_lobby.status <> 'open' or v_lobby.dota_match_id is not null then
    return jsonb_build_object('in_queue', false);
  end if;

  -- O bot vivo e ocupado (heartbeat fresco). Só há 1 bot → "algum busy" = bot ocupado.
  select current_lobby_id, claimed_at, last_heartbeat_at
    into v_bot
  from bots
  where status = 'busy'
    and last_heartbeat_at is not null
    and last_heartbeat_at > now() - c_hb_fresh
  order by claimed_at asc nulls last
  limit 1;

  -- O bot já está montando ESTE lobby? (steam_lobby_id já gravado OU é o lobby atual dele)
  if v_lobby.steam_lobby_id is not null
     or (v_bot.current_lobby_id is not null and v_bot.current_lobby_id = p_lobby_id) then
    return jsonb_build_object('in_queue', true, 'creating_now', true,
                              'position', 1, 'ahead', 0, 'est_ready_at', null);
  end if;

  v_busy_other := (v_bot.current_lobby_id is not null and v_bot.current_lobby_id <> p_lobby_id);

  -- Lobbies ainda NÃO tocados na frente do meu (FIFO por created_at), exceto o do bot.
  select count(*)::int into v_ahead
  from lobbies l
  where l.status = 'open'
    and l.steam_lobby_id is null
    and l.dota_match_id is null
    and l.created_at < v_lobby.created_at
    and (v_bot.current_lobby_id is null or l.id <> v_bot.current_lobby_id);

  v_position := v_ahead + (case when v_busy_other then 1 else 0 end) + 1;

  -- Bot livre e ninguém na frente → o meu é o próximo (pega no próximo poll ~5s).
  if v_position <= 1 then
    return jsonb_build_object('in_queue', true, 'creating_now', true,
                              'position', 1, 'ahead', 0, 'est_ready_at', null);
  end if;

  -- Pior caso honesto: (restante do lobby atual do bot) + 10min por lobby à frente.
  if v_busy_other then
    v_wait_seconds := greatest(0, c_lobby_max - extract(epoch from (now() - coalesce(v_bot.claimed_at, now()))));
  end if;
  v_wait_seconds := v_wait_seconds + v_ahead * c_lobby_max;

  return jsonb_build_object(
    'in_queue', true,
    'creating_now', false,
    'position', v_position,
    'ahead', v_ahead + (case when v_busy_other then 1 else 0 end),
    'est_ready_at', now() + (v_wait_seconds || ' seconds')::interval
  );
end;
$function$;

grant execute on function public.get_lobby_queue_status(uuid) to authenticated, anon;
