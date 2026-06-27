"use strict";
/**
 * BOT-SERVER — Bot Steam FormulaDota em modo SERVIÇO (polling do Supabase).
 * ========================================================================
 * Fica logado na Steam e, a cada poucos segundos, consulta o Supabase por
 * partidas formadas (lobbies status='open' SEM steam_lobby_id). Para cada uma:
 *   1) cria o lobby Steam com a SENHA do site (a mesma que aparece na página),
 *   2) CONVIDA os SteamIDs dos jogadores (popup dentro do Dota — sem precisar
 *      ser amigo),
 *   3) quando os jogadores entram, LANÇA a partida e abandona o portão de
 *      loading (o bot não roda o jogo), capturando o match_id,
 *   4) grava steam_lobby_id / dota_match_id de volta no lobby.
 *
 * Diferente do spike.js (interativo, 1 lobby de teste), este roda SOZINHO.
 * Credenciais e chaves: SEMPRE no .env local. Nunca commitar.
 */
require("dotenv").config();
const path = require("path");
const readline = require("readline");
const protobuf = require("protobufjs");
const SteamUser = require("steam-user");
const SteamTotp = require("steam-totp");
const { Dota2User } = require("dota2-user");
const { createClient } = require("@supabase/supabase-js");
const {
  CMsgInviteToLobby,
  CMsgSOCacheSubscribed,
  CMsgSOMultipleObjects,
  CSODOTALobby,
} = require("dota2-user/protobufs");

// ---- Config / env -------------------------------------------------
const USERNAME = process.env.STEAM_BOT_USERNAME;
const PASSWORD = process.env.STEAM_BOT_PASSWORD;
const SHARED_SECRET = process.env.STEAM_BOT_SHARED_SECRET || "";
const REFRESH_TOKEN = process.env.STEAM_REFRESH_TOKEN || "";
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const POLL_MS = Number(process.env.BOT_POLL_MS) || 5000;

// Login: refresh token (headless/Railway) OU usuário+senha (local com Steam Guard).
if (!REFRESH_TOKEN && (!USERNAME || !PASSWORD)) {
  console.error("[BOT][ERRO] Defina STEAM_REFRESH_TOKEN (headless/Railway) OU STEAM_BOT_USERNAME+PASSWORD (local).");
  process.exit(1);
}
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("[BOT][ERRO] Preencha SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// ---- IDs de mensagem do GC (iguais ao spike) ----------------------
const MSG_CREATE_LOBBY = 7038;
const MSG_SET_DETAILS = 7046;
const MSG_INVITE_LOBBY = 4512;
const MSG_LAUNCH_LOBBY = 7041;
const MSG_ABANDON = 7035;
const MSG_LEAVE_LOBBY = 7040;
const MSG_KICK_FROM_TEAM = 8047; // move um membro pro pool (usado p/ tirar o bot do slot de jogador)

const SO_CACHE_SUBSCRIBED = 24;
const SO_UPDATE_MULTIPLE = 26;
const LOBBY_SO_TYPE = 2004;

const GAME_MODE_MAP = { all_pick: 22, captains_mode: 2, random_draft: 3, single_draft: 4 };
const LEAGUE_ID = Number(process.env.DOTA_LEAGUE_ID) || 18406; // ticket da liga FormulaDota
const RE_STEAMID64 = /^7656\d{13}$/;

const client = new SteamUser();
const dota2 = new Dota2User(client);
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

let LobbyCreate, LobbySetDetails, LobbyLeave, LobbyLaunch, Abandon, LobbyKickFromTeam;

// Job atual (1 lobby por vez nesta V1 — bot único). Enquanto != null, o polling pausa.
let jobAtivo = null; // { dbLobbyId, expectedPlayers, launched, steamLobbyId, matchId }
let processando = false;

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---- Olhos do bot: lê o SO cache do lobby (id, match_id, membros) --
client.on("receivedFromGC", (appid, msgType, payload) => {
  if (appid !== Dota2User.STEAM_APPID) return;
  try {
    if (msgType === SO_CACHE_SUBSCRIBED) {
      for (const o of CMsgSOCacheSubscribed.decode(payload).objects || []) {
        if (o.typeId === LOBBY_SO_TYPE) for (const d of o.objectData || []) capturaLobby(CSODOTALobby.decode(d));
      }
    } else if (msgType === SO_UPDATE_MULTIPLE) {
      const upd = CMsgSOMultipleObjects.decode(payload);
      for (const o of [...(upd.objectsAdded || []), ...(upd.objectsModified || [])]) {
        if (o.typeId === LOBBY_SO_TYPE) capturaLobby(CSODOTALobby.decode(o.objectData));
      }
    }
  } catch (e) {
    /* nem todo SO é o lobby; ignora */
  }
});

function capturaLobby(lobby) {
  if (!lobby || !jobAtivo) return;
  if (lobby.lobbyId) jobAtivo.steamLobbyId = String(lobby.lobbyId);
  if (lobby.matchId && String(lobby.matchId) !== "0") jobAtivo.matchId = String(lobby.matchId);

  if (jobAtivo.launched) return;
  const botId = client.steamID ? client.steamID.toString() : "";
  // conta só quem já entrou num TIME (Iluminados=0 / Temidos=1); no pool não conta.
  const players = (lobby.allMembers || []).filter(
    (m) => String(m.id) !== botId && (m.team === 0 || m.team === 1)
  );
  if (jobAtivo.expectedPlayers >= 1 && players.length >= jobAtivo.expectedPlayers) {
    jobAtivo.launched = true;
    console.log(`[BOT] ${players.length}/${jobAtivo.expectedPlayers} jogadores entraram — lançando em 5s...`);
    const job = jobAtivo;
    setTimeout(() => lancarEFechar(job), 5000);
  }
}

// ---- Carrega protos e loga -----------------------------------------
protobuf.load(path.join(__dirname, "lobby.proto"), (err, root) => {
  if (err) {
    console.error("[BOT][ERRO] Falha ao carregar lobby.proto:", err.message);
    process.exit(1);
  }
  LobbyCreate = root.lookupType("CMsgPracticeLobbyCreate");
  LobbySetDetails = root.lookupType("CMsgPracticeLobbySetDetails");
  LobbyLeave = root.lookupType("CMsgPracticeLobbyLeave");
  LobbyLaunch = root.lookupType("CMsgPracticeLobbyLaunch");
  Abandon = root.lookupType("CMsgAbandonCurrentGame");
  LobbyKickFromTeam = root.lookupType("CMsgPracticeLobbyKickFromTeam");
  console.log(`[BOT] Supabase: ${SUPABASE_URL}`);
  if (REFRESH_TOKEN) {
    console.log("[BOT] Logando com refresh token (headless)...");
    client.logOn({ refreshToken: REFRESH_TOKEN });
  } else {
    console.log("[BOT] Logando com usuário/senha...");
    client.logOn({ accountName: USERNAME, password: PASSWORD });
  }
});

client.on("steamGuard", (domain, callback) => {
  if (SHARED_SECRET) {
    console.log("[BOT] Steam Guard automático (shared_secret).");
    return callback(SteamTotp.generateAuthCode(SHARED_SECRET));
  }
  if (!process.stdin.isTTY) {
    console.error(
      "[BOT][ERRO] Steam pediu código do Steam Guard, mas não há teclado (Railway) nem " +
        "STEAM_REFRESH_TOKEN/STEAM_BOT_SHARED_SECRET. Gere o token local (npm run token) e " +
        "configure STEAM_REFRESH_TOKEN no Railway."
    );
    return process.exit(1);
  }
  const onde = domain ? `e-mail (${domain})` : "app do Steam no celular";
  rl.question(`[BOT] Código do Steam Guard do ${onde}: `, (code) => callback(code.trim()));
});

client.on("error", (err) => {
  console.error(`[BOT][ERRO] Steam: ${err.message} (eresult=${err.eresult})`);
  process.exit(1);
});

client.on("loggedOn", () => {
  console.log(`[BOT] Logado! SteamID ${client.steamID}. Abrindo o Dota e conectando no GC...`);
  client.gamesPlayed(Dota2User.STEAM_APPID);
});

dota2.on("connectedToGC", () => {
  console.log("[BOT] GC do Dota CONECTADO. Saindo de lobby anterior e iniciando o polling...");
  try {
    dota2.sendRawBuffer(MSG_LEAVE_LOBBY, Buffer.from(LobbyLeave.encode(LobbyLeave.create({})).finish()));
  } catch (e) {}
  setInterval(loop, POLL_MS);
  console.log(`[BOT] Aguardando partidas (consultando o Supabase a cada ${POLL_MS / 1000}s)...`);
});

dota2.on("disconnectedFromGC", (reason) => {
  console.log(`[BOT] GC desconectou (motivo ${reason}). Tentando reconectar...`);
});

// ---- Loop de polling: pega 1 partida pendente por vez --------------
async function loop() {
  if (processando || jobAtivo) return; // 1 lobby por vez (bot único)
  processando = true;
  try {
    const { data: lobbies, error } = await supabase
      .from("lobbies")
      .select("id, password, game_mode, status, steam_lobby_id, created_at")
      .eq("status", "open")
      .is("steam_lobby_id", null)
      .order("created_at", { ascending: true })
      .limit(1);
    if (error) {
      console.error("[BOT] erro ao consultar lobbies:", error.message);
      return;
    }
    if (lobbies && lobbies.length > 0) await processarLobby(lobbies[0]);
  } catch (e) {
    console.error("[BOT] erro no loop:", e.message);
  } finally {
    processando = false;
  }
}

async function processarLobby(lobby) {
  // Trava o polling pra este job já no começo (evita pegar outro lobby no meio).
  jobAtivo = { dbLobbyId: lobby.id, expectedPlayers: 0, launched: false, steamLobbyId: null, matchId: null };
  console.log(`\n[BOT] === Nova partida ${lobby.id} === senha=${lobby.password} modo=${lobby.game_mode}`);

  // Busca os jogadores e seus SteamIDs.
  // Fonte da verdade do vínculo Steam = tabela `steam_links` (coluna steam_id_64),
  // gravada pelo callback /auth/steam/callback. A coluna profiles.steam_id é LEGADA
  // e nunca é preenchida — ler dela deixava steamIds vazio e o bot não convidava ninguém.
  const { data: lps } = await supabase.from("lobby_players").select("user_id").eq("lobby_id", lobby.id);
  const userIds = (lps || []).map((p) => p.user_id);
  let steamIds = [];
  if (userIds.length) {
    const { data: links } = await supabase
      .from("steam_links")
      .select("user_id, steam_id_64")
      .in("user_id", userIds);
    steamIds = (links || [])
      .map((l) => l.steam_id_64)
      .filter((s) => typeof s === "string" && RE_STEAMID64.test(s));
  }
  jobAtivo.expectedPlayers = steamIds.length;
  console.log(`[BOT] Jogadores na partida: ${userIds.length} | SteamIDs válidos p/ convite: ${steamIds.length}`);

  // Sai de qualquer lobby anterior e cria o novo (com a senha do site).
  try {
    dota2.sendRawBuffer(MSG_LEAVE_LOBBY, Buffer.from(LobbyLeave.encode(LobbyLeave.create({})).finish()));
  } catch (e) {}
  await wait(800);

  const cfg = {
    gameName: `FORMULADOTA ${String(lobby.id).slice(0, 8)}`,
    gameMode: GAME_MODE_MAP[lobby.game_mode] || 22,
    doPlayerDraft: false, // Player Draft via GC não sobe a partida; draft fica no site (decisão Pedro)
    serverRegion: 10, // Brasil
    visibility: 0, // público
    allchat: true,
    allowSpectating: true,
    allowCheats: false,
    fillWithBots: false,
    leagueid: LEAGUE_ID, // ticket da liga -> habilita DotaTV/realtime + resultado por match_id
    dotaTvDelay: 1, // 120s
    passKey: lobby.password,
  };

  try {
    dota2.sendRawBuffer(
      MSG_CREATE_LOBBY,
      Buffer.from(LobbyCreate.encode(LobbyCreate.create({ passKey: lobby.password, lobbyDetails: cfg })).finish())
    );
    console.log("[BOT] lobby Steam: create enviado.");
  } catch (e) {
    console.error("[BOT] erro no create:", e.message);
    await falhar(lobby.id, "create falhou: " + e.message);
    return;
  }
  await wait(2200);
  try {
    dota2.sendRawBuffer(MSG_SET_DETAILS, Buffer.from(LobbySetDetails.encode(LobbySetDetails.create(cfg)).finish()));
  } catch (e) {}
  await wait(1200);

  // Tira o BOT de qualquer slot de jogador -> manda pro pool (jogadores de fora), pra não
  // ocupar vaga de quem vai jogar. Ele abandona o jogo no launch de qualquer forma.
  try {
    const botAccountId = client.steamID ? Number(BigInt(client.steamID.toString()) & 0xffffffffn) : 0;
    if (botAccountId) {
      dota2.sendRawBuffer(
        MSG_KICK_FROM_TEAM,
        Buffer.from(LobbyKickFromTeam.encode(LobbyKickFromTeam.create({ accountId: botAccountId })).finish())
      );
      console.log("[BOT] bot movido pro pool (jogadores de fora) — não ocupa slot.");
    }
  } catch (e) {}
  await wait(500);

  // Convida cada jogador (popup no cliente Dota).
  for (const sid of steamIds) {
    try {
      dota2.sendRawBuffer(
        MSG_INVITE_LOBBY,
        Buffer.from(CMsgInviteToLobby.encode(CMsgInviteToLobby.fromPartial({ steamId: sid })).finish())
      );
      console.log(`[BOT] convite enviado -> ${sid}`);
    } catch (e) {
      console.log(`[BOT] erro no convite ${sid}:`, e.message);
    }
    await wait(300);
  }

  // Grava steam_lobby_id de volta (marca como "criado" pra não reprocessar).
  await wait(1500);
  await supabase
    .from("lobbies")
    .update({ steam_lobby_id: jobAtivo.steamLobbyId || "created", bot_account_name: USERNAME })
    .eq("id", lobby.id);

  console.log(
    `[BOT] ✅ Lobby pronto (steam_lobby_id=${jobAtivo.steamLobbyId || "?"}). ` +
      `Convites: ${steamIds.length}. Aguardando os jogadores entrarem pra lançar...`
  );
}

async function lancarEFechar(job) {
  console.log("[BOT] Lançando a partida...");
  try {
    dota2.sendRawBuffer(MSG_LAUNCH_LOBBY, Buffer.from(LobbyLaunch.encode(LobbyLaunch.create({})).finish()));
  } catch (e) {
    console.log("[BOT] erro no launch:", e.message);
  }
  await wait(4000); // espera o match_id aparecer no SO
  const matchId = job.matchId || null;
  try {
    dota2.sendRawBuffer(MSG_ABANDON, Buffer.from(Abandon.encode(Abandon.create({})).finish()));
    console.log("[BOT] bot abandonou o portão de loading (a partida sobe sem ele).");
  } catch (e) {}
  try {
    dota2.sendRawBuffer(MSG_LEAVE_LOBBY, Buffer.from(LobbyLeave.encode(LobbyLeave.create({})).finish()));
  } catch (e) {}

  try {
    await supabase
      .from("lobbies")
      .update({ status: "in_progress", dota_match_id: matchId })
      .eq("id", job.dbLobbyId);
  } catch (e) {
    console.error("[BOT] erro ao gravar match_id:", e.message);
  }
  console.log(`[BOT] ✅ Partida ${job.dbLobbyId} LANÇADA. match_id=${matchId}. Liberando pro próximo.`);
  jobAtivo = null; // libera o polling pro próximo job
}

async function falhar(dbLobbyId, motivo) {
  try {
    await supabase.from("lobbies").update({ status: "bot_unavailable", bot_error: motivo }).eq("id", dbLobbyId);
  } catch (e) {}
  jobAtivo = null;
}

process.on("SIGINT", () => {
  console.log("\n[BOT] Encerrando...");
  try {
    dota2.sendRawBuffer(MSG_LEAVE_LOBBY, Buffer.from(LobbyLeave.encode(LobbyLeave.create({})).finish()));
  } catch (e) {}
  try {
    client.gamesPlayed([]);
    client.logOff();
  } catch (e) {}
  rl.close();
  process.exit(0);
});
