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
const MSG_KICK_FROM_LOBBY = 7081; // EXPULSA o jogador da sala (usado p/ descartar a partida)
const MSG_JOIN_CHAT = 7009; // entra num canal de chat (o do lobby, pra postar as frases)
const MSG_JOIN_CHAT_RESP = 7010; // resposta com o channel_id do canal
const MSG_CHAT = 7273; // envia mensagem no canal de chat
const CHANNEL_LOBBY = 3; // DOTAChannelType_Lobby

const SO_CACHE_SUBSCRIBED = 24;
const SO_UPDATE_MULTIPLE = 26;
const LOBBY_SO_TYPE = 2004;

const GAME_MODE_MAP = { all_pick: 22, captains_mode: 2, random_draft: 3, single_draft: 4 };
const LEAGUE_ID = Number(process.env.DOTA_LEAGUE_ID) || 18406; // ticket da liga FormulaDota
const RE_STEAMID64 = /^7656\d{13}$/;

// Cronômetro de espera dos convidados entrarem no lobby Steam (mesma regra do spike).
const EXPIRA_MIN = 10; // minutos até descartar se não completar
const TICK_MS = 60000; // 1 min (baixe pra testar rápido)

// Lembretes da doutrina pro chat do lobby (voz Mestre+Guardião: curto, imperativo, sem emoji).
// Copiado do spike.js — fiel a PHILOSOPHY.md / PRODUCT_CORE.md. NÃO inventar doutrina nova.
const FRASES_DOUTRINA = [
  "Princípio 1: a culpa nunca é do outro.",
  "Princípio 5: ou você ganha, ou você aprende.",
  "Ganhar não é suficiente. Ser bom é contínuo, não pontual.",
  "Cada derrota é um degrau.",
  "Derrota é informação. Vitória sem aprendizado é só sorte.",
  "O companheiro que eleva o time vale mais que o vencedor solo.",
  "Aqui você não é anônimo. Sua conduta fica registrada.",
  "Skill te trouxe. Conduta te mantém.",
  "Assuma suas decisões antes de questionar as dos outros.",
  "Jogue com responsabilidade, foco e sem desculpas.",
];
let fraseIdx = 0;
function proximaFraseDoutrina() {
  const f = FRASES_DOUTRINA[fraseIdx % FRASES_DOUTRINA.length];
  fraseIdx += 1;
  return f;
}

const client = new SteamUser();
const dota2 = new Dota2User(client);
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

let LobbyCreate, LobbySetDetails, LobbyLeave, LobbyLaunch, Abandon, LobbyKickFromTeam;
let LobbyKick, ChatJoin, ChatJoinResp, ChatMsg;

// Job atual (1 lobby por vez nesta V1 — bot único). Enquanto != null, o polling pausa.
let jobAtivo = null; // { dbLobbyId, expectedPlayers, launched, steamLobbyId, matchId, invited[], membros[], cronometro, minutosRestantes, anunciados:Set }
let processando = false;
let gcIniciado = false; // o loop/limpeza já rodaram? (evita duplicar em reconexão do GC)
let chatChannelId = null; // id do canal de chat do lobby atual (pra postar as frases)
let chatJoinPedido = false; // já pedi pra entrar no chat deste lobby?

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---- Olhos do bot: lê o SO cache do lobby (id, match_id, membros) --
client.on("receivedFromGC", (appid, msgType, payload) => {
  if (appid !== Dota2User.STEAM_APPID) return;
  try {
    // Resposta de entrada no chat do lobby → captura o channel_id pra postar as frases.
    if (msgType === MSG_JOIN_CHAT_RESP) {
      const resp = ChatJoinResp.decode(payload);
      if (resp.channelName && resp.channelName.indexOf("Lobby") === 0 && resp.channelId) {
        chatChannelId = resp.channelId;
        console.log("[BOT] entrei no chat do lobby — postando as frases ali.");
        enviarChatLobby(proximaFraseDoutrina()); // 1ª frase ao criar a sala
      }
      return;
    }
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

  const botId = client.steamID ? client.steamID.toString() : "";

  // Entra no chat do lobby (uma vez) pra poder postar as frases da doutrina.
  if (lobby.lobbyId && !chatJoinPedido && ChatJoin) {
    chatJoinPedido = true;
    try {
      dota2.sendRawBuffer(
        MSG_JOIN_CHAT,
        Buffer.from(
          ChatJoin.encode(
            ChatJoin.create({ channelName: "Lobby_" + lobby.lobbyId, channelType: CHANNEL_LOBBY })
          ).finish()
        )
      );
      console.log(`[BOT] entrando no chat do lobby (Lobby_${lobby.lobbyId})...`);
    } catch (e) {}
  }

  // Membros atuais (sem o bot) — usado pro reconvite e pro descarte (kick de todos).
  jobAtivo.membros = (lobby.allMembers || []).filter((m) => String(m.id) !== botId);

  // Anuncia no chat cada jogador NOVO (cita o nome) e dispara a contagem no 1º que entra.
  for (const m of jobAtivo.membros) {
    const sid = String(m.id);
    if (jobAtivo.anunciados.has(sid)) continue;
    jobAtivo.anunciados.add(sid);
    const faltam = Math.max(0, jobAtivo.expectedPlayers - jobAtivo.membros.length);
    anunciarEntrada(sid, faltam);
    if (!jobAtivo.cronometro) iniciarCronometro(jobAtivo);
  }

  if (jobAtivo.launched) return;
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

// Manda uma mensagem no chat do lobby (se já entrou no canal).
function enviarChatLobby(text) {
  if (!chatChannelId || !ChatMsg) return;
  try {
    dota2.sendRawBuffer(
      MSG_CHAT,
      Buffer.from(ChatMsg.encode(ChatMsg.create({ channelId: chatChannelId, text })).finish())
    );
  } catch (e) {}
}

// Anuncia no chat que um jogador entrou (cita o nome via getPersonas) + 1 frase da doutrina.
function anunciarEntrada(steamId, faltam) {
  client.getPersonas([steamId], (err, personas) => {
    const u = personas && personas[steamId];
    const nome = u && u.player_name ? u.player_name : "Jogador";
    const faltaTxt = faltam > 0 ? `Faltam ${faltam} para completar.` : "Sala completa.";
    enviarChatLobby(`${nome} entrou. ${faltaTxt}`);
    enviarChatLobby(proximaFraseDoutrina());
    console.log(`[BOT][CHAT] ${nome} entrou — faltam ${faltam}.`);
  });
}

// Cronômetro de espera: a cada minuto, posta o tempo restante no chat + 1 frase e RECONVIDA
// quem ainda não entrou. Ao zerar (EXPIRA_MIN), descarta a sala (expulsa todos + sai + cancela).
function iniciarCronometro(job) {
  if (job.cronometro) clearInterval(job.cronometro);
  job.minutosRestantes = EXPIRA_MIN;
  console.log(`[BOT] ⏰ 1º jogador entrou — contagem iniciada. Expira em ${EXPIRA_MIN} min.`);
  enviarChatLobby(`Sala aberta. Expira em ${EXPIRA_MIN} minutos se não completar.`);
  job.cronometro = setInterval(async () => {
    if (jobAtivo !== job) {
      clearInterval(job.cronometro);
      return;
    }
    job.minutosRestantes -= 1;
    if (job.minutosRestantes <= 0) {
      clearInterval(job.cronometro);
      job.cronometro = null;
      console.log("[BOT] ⏰ tempo esgotado sem completar — DESCARTANDO a sala (timeout).");
      enviarChatLobby("Tempo esgotado. Sala descartada.");
      await descartarLobbySteam(job);
      try {
        await supabase
          .from("lobbies")
          .update({ status: "cancelled", bot_error: `timeout ${EXPIRA_MIN}min sem completar` })
          .eq("id", job.dbLobbyId);
      } catch (e) {}
      jobAtivo = null;
      return;
    }
    console.log(`[BOT] ⏰ o lobby expira em ${job.minutosRestantes} min...`);
    enviarChatLobby(`O lobby expira em ${job.minutosRestantes} minuto(s) se não completar.`);
    enviarChatLobby(proximaFraseDoutrina());
    // Reconvida quem foi convidado mas ainda não está na sala.
    const presentes = new Set((job.membros || []).map((m) => String(m.id)));
    for (const sid of job.invited || []) {
      if (presentes.has(sid)) continue;
      try {
        dota2.sendRawBuffer(
          MSG_INVITE_LOBBY,
          Buffer.from(CMsgInviteToLobby.encode(CMsgInviteToLobby.fromPartial({ steamId: sid })).finish())
        );
        console.log(`[BOT] ⏰ reconvite -> ${sid}`);
      } catch (e) {}
    }
  }, TICK_MS);
}

// Descarta a sala no Steam: EXPULSA todos os jogadores (kick) e o bot SAI (não deixa lobby morto).
async function descartarLobbySteam(job) {
  const membros = (job && job.membros) || [];
  console.log(`[BOT] descartando: expulsando ${membros.length} jogador(es).`);
  for (const m of membros) {
    try {
      const accountId = Number(BigInt(m.id) & 0xffffffffn);
      dota2.sendRawBuffer(MSG_KICK_FROM_LOBBY, Buffer.from(LobbyKick.encode(LobbyKick.create({ accountId })).finish()));
      console.log(`[BOT] kick ${m.id} (account_id ${accountId})`);
    } catch (e) {}
  }
  await wait(1500);
  try {
    dota2.sendRawBuffer(MSG_LEAVE_LOBBY, Buffer.from(LobbyLeave.encode(LobbyLeave.create({})).finish()));
    console.log("[BOT] bot saiu da sala descartada.");
  } catch (e) {}
  if (job && job.cronometro) {
    clearInterval(job.cronometro);
    job.cronometro = null;
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
  LobbyKick = root.lookupType("CMsgPracticeLobbyKick");
  ChatJoin = root.lookupType("CMsgDOTAJoinChatChannel");
  ChatJoinResp = root.lookupType("CMsgDOTAJoinChatChannelResponse");
  ChatMsg = root.lookupType("CMsgDOTAChatMessage");
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
  // RECONEXÃO: o GC pode reconectar durante uma partida. Se o polling já foi iniciado,
  // NÃO reinicia nada — antes, cada reconexão saía do lobby (abandonando a partida que
  // o bot vigiava) e ligava outro setInterval (timers acumulados).
  if (gcIniciado) {
    console.log("[BOT] GC reconectado (job em andamento preservado, sem reiniciar o loop).");
    return;
  }
  gcIniciado = true;
  console.log("[BOT] GC do Dota CONECTADO. Iniciando o polling...");
  // Só sai de lobby anterior se NÃO houver job ativo (não abandonar partida em curso).
  if (!jobAtivo) {
    try {
      dota2.sendRawBuffer(MSG_LEAVE_LOBBY, Buffer.from(LobbyLeave.encode(LobbyLeave.create({})).finish()));
    } catch (e) {}
  }
  void recuperarOrfaos(); // limpa partidas que ficaram no meio se o bot caiu antes
  setInterval(loop, POLL_MS);
  console.log(`[BOT] Aguardando partidas (consultando o Supabase a cada ${POLL_MS / 1000}s)...`);
});

// RECOVERY no boot: o estado do job vive só na memória; se o bot caiu no meio da criação,
// ao reiniciar esses lobbies ficam "no limbo" (reservados/half-created) e prendem os
// jogadores. Marca como indisponível os que este bot reservou mas não confirmou, e que
// já estão parados há >3min (o filtro de tempo evita matar um job recém-criado por OUTRA
// instância durante um deploy — esse ainda tem menos de 3min).
async function recuperarOrfaos() {
  const corte = new Date(Date.now() - 3 * 60 * 1000).toISOString();
  try {
    const { data: a } = await supabase
      .from("lobbies")
      .update({ status: "bot_unavailable", bot_error: "bot reiniciou no meio da criação" })
      .eq("status", "open")
      .eq("bot_account_name", USERNAME)
      .is("steam_lobby_id", null)
      .lt("created_at", corte)
      .select("id");
    const { data: b } = await supabase
      .from("lobbies")
      .update({ status: "bot_unavailable", bot_error: "sala não confirmada (sentinel legado)" })
      .eq("status", "open")
      .eq("steam_lobby_id", "created")
      .lt("created_at", corte)
      .select("id");
    const n = (a?.length || 0) + (b?.length || 0);
    if (n) console.log(`[BOT] recovery: ${n} lobby(s) órfão(s) marcados como indisponíveis.`);
  } catch (e) {
    console.error("[BOT] recovery falhou:", e.message);
  }
}

dota2.on("disconnectedFromGC", (reason) => {
  console.log(`[BOT] GC desconectou (motivo ${reason}). Tentando reconectar...`);
});

// ---- Loop de polling: pega 1 partida pendente por vez --------------
async function loop() {
  if (processando) return;
  processando = true;
  try {
    // Já tem lobby ativo? Em vez de pegar outro, VIGIA se o admin/criador descartou a
    // partida no painel (lobbies.status='cancelled') → expulsa todos e finaliza o lobby Steam.
    if (jobAtivo) {
      const { data: cur } = await supabase
        .from("lobbies")
        .select("status")
        .eq("id", jobAtivo.dbLobbyId)
        .maybeSingle();
      if (cur && cur.status === "cancelled") {
        console.log("[BOT] partida descartada no painel — finalizando o lobby Steam.");
        const job = jobAtivo;
        await descartarLobbySteam(job);
        jobAtivo = null;
      }
      return; // 1 lobby por vez (bot único)
    }

    const { data: lobbies, error } = await supabase
      .from("lobbies")
      .select("id, password, game_mode, status, steam_lobby_id, created_at")
      .eq("status", "open")
      .is("steam_lobby_id", null)
      .is("bot_account_name", null) // só lobbies AINDA não reservados por nenhum bot
      .order("created_at", { ascending: true })
      .limit(1);
    if (error) {
      console.error("[BOT] erro ao consultar lobbies:", error.message);
      return;
    }
    if (lobbies && lobbies.length > 0) {
      const lobby = lobbies[0];
      // CLAIM ATÔMICO (evita 2 salas quando 2 instâncias rodam juntas, ex.: no deploy):
      // marca bot_account_name SÓ SE ainda estiver livre. Quem pegar a linha, processa;
      // o outro recebe null e desiste. É a "senha da padaria" — só um leva.
      const { data: claimed } = await supabase
        .from("lobbies")
        .update({ bot_account_name: USERNAME })
        .eq("id", lobby.id)
        .eq("status", "open")
        .is("steam_lobby_id", null)
        .is("bot_account_name", null)
        .select("id")
        .maybeSingle();
      if (!claimed) {
        console.log(`[BOT] lobby ${lobby.id} já foi reservado por outra instância — pulando.`);
        return;
      }
      await processarLobby(lobby);
    }
  } catch (e) {
    console.error("[BOT] erro no loop:", e.message);
  } finally {
    processando = false;
  }
}

async function processarLobby(lobby) {
  // Trava o polling pra este job já no começo (evita pegar outro lobby no meio).
  jobAtivo = {
    dbLobbyId: lobby.id,
    expectedPlayers: 0,
    launched: false,
    steamLobbyId: null,
    matchId: null,
    invited: [], // SteamIDs convidados (pro reconvite por minuto)
    membros: [], // membros atuais no lobby Steam (sem o bot)
    anunciados: new Set(), // SteamIDs já citados no chat
    cronometro: null,
    minutosRestantes: EXPIRA_MIN,
  };
  chatChannelId = null;
  chatJoinPedido = false;
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
  jobAtivo.invited = steamIds;
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

  // Espera o GC CONFIRMAR o lobby real (capturaLobby popula jobAtivo.steamLobbyId via
  // SO cache). Antes gravávamos "created" às cegas — se o GC não respondesse, a partida
  // saía da fila mas NENHUMA sala existia e os 10 ficavam esperando convite pra sempre.
  // Agora: se o GC não confirmar no tempo, é FALHA real (o sistema pode retentar).
  const confirmou = await esperarSteamLobbyId(8000);
  if (!confirmou) {
    console.error("[BOT] GC não confirmou o lobby a tempo — marcando bot_unavailable.");
    await falhar(lobby.id, "GC não confirmou a criação do lobby");
    return;
  }

  // No lobby de liga o dota_match_id já vem junto no SO cache — gravamos os DOIS aqui
  // pra a URL canônica do site (= dota_match_id) ficar disponível cedo.
  const updLobby = {
    steam_lobby_id: jobAtivo.steamLobbyId,
    bot_account_name: USERNAME,
  };
  if (jobAtivo.matchId) updLobby.dota_match_id = jobAtivo.matchId;
  await supabase.from("lobbies").update(updLobby).eq("id", lobby.id);

  console.log(
    `[BOT] ✅ Lobby pronto (steam_lobby_id=${jobAtivo.steamLobbyId}). ` +
      `Convites: ${steamIds.length}. Aguardando os jogadores entrarem pra lançar...`
  );
}

// Espera jobAtivo.steamLobbyId ser populado pelo SO cache do GC (capturaLobby), com
// timeout. true = confirmado; false = o GC não respondeu (tratar como falha).
function esperarSteamLobbyId(timeoutMs) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const iv = setInterval(() => {
      if (jobAtivo && jobAtivo.steamLobbyId) {
        clearInterval(iv);
        resolve(true);
      } else if (Date.now() - t0 > timeoutMs) {
        clearInterval(iv);
        resolve(false);
      }
    }, 300);
  });
}

async function lancarEFechar(job) {
  // Partida vai subir — para a contagem e os lembretes no chat.
  if (job.cronometro) {
    clearInterval(job.cronometro);
    job.cronometro = null;
  }
  enviarChatLobby("Sala completa. Boa partida — e lembrem: a culpa nunca é do outro.");
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
