"use strict";
/**
 * SPIKE de viabilidade — Bot Steam FormulaDota (lobby in-house)
 * =============================================================
 * Stack que FUNCIONA em 2026:
 *   - node-steam-user  -> login NOVO da Steam (2023+) + transporte do Game Coordinator
 *   - dota2-user       -> gerencia a sessão do GC do Dota
 *   - lobby.proto      -> mensagens de criar lobby (o dota2-user não traz essas)
 *
 * Prova de ponta a ponta: login -> conectar no GC -> CRIAR lobby -> CONVIDAR 1 jogador.
 * NÃO é o serviço final; é o teste que destrava o resto.
 *
 * Credenciais: SEMPRE no .env local. Nunca commitar, nunca colar no chat.
 */
require("dotenv").config();
const path = require("path");
const readline = require("readline");
const protobuf = require("protobufjs");
const SteamUser = require("steam-user");
const { Dota2User } = require("dota2-user");
const {
  CMsgInviteToLobby,
  CMsgSOCacheSubscribed,
  CMsgSOMultipleObjects,
  CSODOTALobby,
  CSODOTAGameAccountClient,
} = require("dota2-user/protobufs");

const USERNAME = process.env.STEAM_BOT_USERNAME;
const PASSWORD = process.env.STEAM_BOT_PASSWORD;
const TEST_INVITE_STEAMID = process.env.TEST_INVITE_STEAMID;

// ID da partida no SISTEMA do FormulaDota (em produção vem do banco).
// Para teste, usa MATCH_ID do .env; senão gera um provisório.
const MATCH_ID = process.env.MATCH_ID || `T${Date.now().toString().slice(-6)}`;

// Senha sem caracteres ambíguos (pra publicar no site p/ entrada manual dos 10)
function gerarSenha(n) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < n; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

// ============================================================
//  CONFIG PRINCIPAL DO LOBBY — definida pelo Pedro (27/06/2026)
//  Pausa liberada, prioridade de seleção MANUAL e equipe inicial
//  ALEATÓRIA são os PADRÕES do GC (não precisam ser setados).
// ============================================================
// Player Draft / "Imortal Draft": capitães draftam os jogadores do pool.
// DESLIGADO agora pra testar launch limpo — com ele ligado e poucos jogadores o draft
// não forma os 2 capitães e a partida não sobe. Religar = true quando houver 10.
const PLAYER_DRAFT = false;

const LOBBY_CONFIG = {
  gameName: `FORMULADOTA ${MATCH_ID}`,
  gameMode: 22, // Ranked All Pick (All Draft)
  doPlayerDraft: PLAYER_DRAFT, // Player Draft / "Imortal Draft"
  serverRegion: 10, // Brasil
  visibility: 0, // Public
  dotaTvDelay: 1, // 120s (2 min)
  leagueid: 18406, // ticket da liga FormulaDota
  allchat: true,
  allowSpectating: true,
  allowCheats: false,
  fillWithBots: false,
  passKey: gerarSenha(6),
};

// IDs das mensagens do GC
const MSG_CREATE_LOBBY = 7038; // k_EMsgGCPracticeLobbyCreate
const MSG_SET_DETAILS = 7046; // k_EMsgGCPracticeLobbySetDetails (configura a sala)
const MSG_SET_TEAM_SLOT = 7047; // k_EMsgGCPracticeLobbySetTeamSlot (move o bot de time)
const MSG_INVITE_LOBBY = 4512; // k_EMsgGCInviteToLobby
const MSG_LAUNCH_LOBBY = 7041; // k_EMsgGCPracticeLobbyLaunch
const MSG_ABANDON = 7035; // k_EMsgGCAbandonCurrentGame (tira o bot do jogo após lançar)
const MSG_LEAVE_LOBBY = 7040; // k_EMsgGCPracticeLobbyLeave
const MSG_KICK_FROM_TEAM = 8047; // k_EMsgGCPracticeLobbyKickFromTeam (move pro pool)
const MSG_KICK_FROM_LOBBY = 7081; // k_EMsgGCPracticeLobbyKick (remove da sala)
const MSG_JOIN_BROADCAST = 7149; // k_EMsgGCPracticeLobbyJoinBroadcastChannel (canal de narração)
const MSG_JOIN_CHAT = 7009; // k_EMsgGCJoinChatChannel
const MSG_JOIN_CHAT_RESP = 7010; // k_EMsgGCJoinChatChannelResponse (traz o channel_id)
const MSG_CHAT = 7273; // k_EMsgGCChatMessage (envia mensagem no chat)
const CHANNEL_LOBBY = 3; // DOTAChannelType_Lobby

// Onde o bot fica enquanto gerencia a sala: 2 = canal de narração (aba retraída, poucos
// veem; e fica FORA do pool draftável). O bot sai/abandona ao iniciar. (4=pool, 3=espectador)
const BOT_LOBBY_TEAM = 2;

if (!USERNAME || !PASSWORD) {
  console.error("[SPIKE][ERRO] Preencha STEAM_BOT_USERNAME e STEAM_BOT_PASSWORD no .env.");
  process.exit(1);
}
console.log(
  `[SPIKE] Config: user='${USERNAME}' | senha=${PASSWORD.length} caracteres | ` +
    `convidar=${TEST_INVITE_STEAMID || "(nenhum)"}`
);

const client = new SteamUser();
const dota2 = new Dota2User(client);
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

// IDs/tipo do SO cache do lobby
const SO_CACHE_SUBSCRIBED = 24;
const SO_UPDATE_MULTIPLE = 26;
const LOBBY_SO_TYPE = 2004; // CSODOTALobby
const TEAM = { RADIANT: 0, DIRE: 1, BROADCASTER: 2, SPECTATOR: 3, POOL: 4 };
const LER_LOBBY = true; // olhos do bot ON (lê o lobby e mantém o arranjo válido)
const ACCOUNT_SO_TYPE = 2002; // CSODOTAGameAccountClient (estado da conta: cooldowns, baixa prioridade)
let estadoContaImpresso = false;

let membrosLobby = []; // últimos jogadores vistos (sem o bot) — usado pra descartar a sala
let lobbyIdAtual = null; // id da sala (pra montar o nome do canal de chat)
let chatChannelId = null; // id do canal de chat do lobby (pra mandar mensagem)
let chatJoinPedido = false;
let matchIdAtual = null; // match_id da partida (aparece no lobby ao lançar)
let serverIdAtual = null; // server_steam_id do servidor da partida (pro realtime via WebAPI)
let serverKeysLogged = false;
let cronometroIniciado = false; // a contagem só começa quando o 1º jogador entra
const jogadoresAnunciados = new Set(); // steamIDs já citados no chat (anuncia cada um 1x)

// Lembretes da doutrina pro chat do lobby (fiéis a PHILOSOPHY.md / PRODUCT_CORE.md, voz
// Mestre+Guardião: curto, imperativo, sem emoji). Princípios 1 e 5 são citados textualmente
// nos docs; os demais destilam os 14 pilares. NÃO inventar doutrina nova fora dos docs.
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

// "Olhos" do bot: lê o estado do lobby (SO cache) e mantém o arranjo válido do Imortal Draft.
client.on("receivedFromGC", (appid, msgType, payload) => {
  if (appid !== Dota2User.STEAM_APPID) return;
  console.log(`[GC<-] msg ${msgType}${msgType === 4004 ? " (ClientWelcome)" : ""} — ${payload ? payload.length : 0} bytes`);
  // Diagnóstico do estado da conta (cooldown/baixa prioridade) — roda mesmo com os olhos OFF
  if (msgType === SO_CACHE_SUBSCRIBED && !estadoContaImpresso) {
    try {
      const objs = CMsgSOCacheSubscribed.decode(payload).objects || [];
      console.log("[CONTA] type_ids no cache:", objs.map((o) => o.typeId).join(","));
      for (const o of objs) {
        if (o.typeId === ACCOUNT_SO_TYPE) for (const d of o.objectData || []) imprimirEstadoConta(CSODOTAGameAccountClient.decode(d));
      }
    } catch (e) {
      console.log("[CONTA] erro ao ler estado:", e.message);
    }
  }
  // resposta de entrada no chat do lobby -> captura o channel_id pra mandar mensagens
  if (msgType === MSG_JOIN_CHAT_RESP) {
    try {
      const resp = ChatJoinResp.decode(payload);
      if (resp.channelName && resp.channelName.indexOf("Lobby") === 0 && resp.channelId) {
        chatChannelId = resp.channelId;
        console.log("[CHAT] Entrei no chat do lobby — vou mandar a contagem ali.");
      }
    } catch (e) {}
  }
  if (!LER_LOBBY) return; // isolamento: não processa o resto do SO cache
  try {
    if (msgType === SO_CACHE_SUBSCRIBED) {
      for (const o of CMsgSOCacheSubscribed.decode(payload).objects || []) {
        if (o.typeId === LOBBY_SO_TYPE) for (const d of o.objectData || []) processLobby(CSODOTALobby.decode(d));
      }
    } else if (msgType === SO_UPDATE_MULTIPLE) {
      const upd = CMsgSOMultipleObjects.decode(payload);
      const objs = [...(upd.objectsAdded || []), ...(upd.objectsModified || [])];
      if (objs.length) console.log(`[SO upd] type_ids: ${objs.map((o) => o.typeId).join(",")}`);
      for (const o of objs) {
        if (o.typeId === LOBBY_SO_TYPE) processLobby(CSODOTALobby.decode(o.objectData));
      }
    }
  } catch (e) {
    /* nem todo SO é o lobby; ignora */
  }
});

function posicaoInvalida(team, slot) {
  // Sem Player Draft (All Pick normal): jogadores entram nos slots 1-5 livremente — nada a corrigir.
  if (!PLAYER_DRAFT) return false;
  // Imortal Draft: pool (team 4) e slot 1 de cada time (capitão = slot 1) são VÁLIDOS.
  // Inválido: slots 2-5 de um time (slot > 1), ou canal de narração (broadcaster, p/ jogadores).
  if ((team === TEAM.RADIANT || team === TEAM.DIRE) && slot > 1) return true;
  if (team === TEAM.BROADCASTER) return true;
  return false;
}

function processLobby(lobby) {
  if (!lobby || !lobby.allMembers) return;
  const botId = client.steamID ? client.steamID.toString() : "";
  membrosLobby = lobby.allMembers.filter((m) => String(m.id) !== botId);

  // entra no chat do lobby (uma vez) pra poder mandar a contagem regressiva
  if (lobby.lobbyId) lobbyIdAtual = lobby.lobbyId;
  if (!chatJoinPedido && lobbyIdAtual && ChatJoin) {
    chatJoinPedido = true;
    dota2.sendRawBuffer(
      MSG_JOIN_CHAT,
      Buffer.from(ChatJoin.encode(ChatJoin.create({ channelName: "Lobby_" + lobbyIdAtual, channelType: CHANNEL_LOBBY })).finish())
    );
    console.log(`[CHAT] Entrando no chat do lobby (Lobby_${lobbyIdAtual})...`);
  }

  // captura o match_id assim que aparecer (após o launch) — pro resultado via WebAPI
  if (lobby.matchId && String(lobby.matchId) !== "0" && !matchIdAtual) {
    matchIdAtual = lobby.matchId;
    console.log(`[MATCH] ✅ match_id capturado: ${matchIdAtual}`);
  }

  // captura o server_steam_id (servidor da partida) — pro preview/telemetria ao vivo via WebAPI.
  // Os nomes de campo variam; tenta os comuns e, se não achar, mostra as chaves do lobby 1x.
  if (!serverIdAtual) {
    const sid = lobby.serverId || lobby.serverSteamId || lobby.gameServerSteamId || lobby.serverSteamID;
    if (sid && String(sid) !== "0") {
      serverIdAtual = String(sid);
      console.log(`[MATCH] 🛰️  server_steam_id capturado: ${serverIdAtual}`);
    } else if (matchIdAtual && !serverKeysLogged) {
      serverKeysLogged = true;
      console.log("[MATCH] (debug) campos do lobby p/ achar o server id:", Object.keys(lobby).join(", "));
    }
  }

  // anuncia no chat cada jogador NOVO (cita o nome) e dispara a contagem no 1º que entra
  for (const m of membrosLobby) {
    const sid = String(m.id);
    if (jogadoresAnunciados.has(sid)) continue;
    jogadoresAnunciados.add(sid);
    const faltam = Math.max(0, 10 - membrosLobby.length);
    anunciarEntrada(sid, faltam);
    if (!cronometroIniciado) {
      cronometroIniciado = true;
      iniciarCronometro();
    }
  }

  console.log(`[LOBBY] ${lobby.allMembers.length} membro(s):`);
  for (const m of lobby.allMembers) {
    console.log(`  - ${m.id} | team=${m.team} slot=${m.slot}${m.id === botId ? " (BOT)" : ""}`);
  }
  for (const m of membrosLobby) {
    if (posicaoInvalida(m.team, m.slot)) {
      const accountId = Number(BigInt(m.id) & 0xffffffffn);
      dota2.sendRawBuffer(MSG_KICK_FROM_TEAM, Buffer.from(LobbyKickFromTeam.encode(LobbyKickFromTeam.create({ accountId })).finish()));
      console.log(`  >> Movendo ${m.id} (team=${m.team} slot=${m.slot}) -> 'jogadores de fora'.`);
    }
  }
}

function imprimirEstadoConta(acc) {
  estadoContaImpresso = true;
  const agora = Math.floor(Date.now() / 1000);
  const dt = (ts) =>
    ts && ts > agora
      ? `${new Date(ts * 1000).toLocaleString()}  <<< ATIVO`
      : ts
        ? `${new Date(ts * 1000).toLocaleString()} (passado)`
        : "-";
  console.log("\n========= ESTADO DA CONTA-BOT (h4ntaa) =========");
  console.log("  Baixa prioridade até :", dt(acc.lowPriorityUntilDate), "| jogos restantes:", acc.lowPriorityGamesRemaining || 0);
  console.log("  MATCH desabilitado   :", dt(acc.matchDisabledUntilDate));
  console.log("  CUSTOM GAME desab.   :", dt(acc.customGameDisabledUntilDate));
  console.log("  Ranked ban até       :", dt(acc.rankedMatchmakingBanUntilDate));
  console.log("  Conta desab. até     :", dt(acc.accountDisabledUntilDate));
  console.log(
    "  Último abandono      :",
    acc.lastAbandonedGameDate ? new Date(acc.lastAbandonedGameDate * 1000).toLocaleString() : "-",
    "| leavers:",
    acc.leaverCount || 0
  );
  console.log("===============================================\n");
}

// Carrega os protobufs de lobby e só então loga
let LobbyCreate, LobbyLaunch, LobbySetDetails, LobbySetTeamSlot, LobbyLeave, LobbyKickFromTeam, LobbyKick, LobbyJoinBroadcast;
let ChatJoin, ChatJoinResp, ChatMsg, Abandon;
protobuf.load(path.join(__dirname, "lobby.proto"), (err, root) => {
  if (err) {
    console.error("[SPIKE][ERRO] Falha ao carregar lobby.proto:", err.message);
    process.exit(1);
  }
  LobbyCreate = root.lookupType("CMsgPracticeLobbyCreate");
  LobbyLaunch = root.lookupType("CMsgPracticeLobbyLaunch");
  LobbySetDetails = root.lookupType("CMsgPracticeLobbySetDetails");
  LobbySetTeamSlot = root.lookupType("CMsgPracticeLobbySetTeamSlot");
  LobbyLeave = root.lookupType("CMsgPracticeLobbyLeave");
  LobbyKickFromTeam = root.lookupType("CMsgPracticeLobbyKickFromTeam");
  LobbyKick = root.lookupType("CMsgPracticeLobbyKick");
  LobbyJoinBroadcast = root.lookupType("CMsgPracticeLobbyJoinBroadcastChannel");
  ChatJoin = root.lookupType("CMsgDOTAJoinChatChannel");
  ChatJoinResp = root.lookupType("CMsgDOTAJoinChatChannelResponse");
  ChatMsg = root.lookupType("CMsgDOTAChatMessage");
  Abandon = root.lookupType("CMsgAbandonCurrentGame");
  console.log("[SPIKE] Logando na Steam (login novo)...");
  client.logOn({ accountName: USERNAME, password: PASSWORD });
});

// Steam Guard interativo (quando não há shared secret): pede o código no terminal
client.on("steamGuard", (domain, callback) => {
  const onde = domain ? `e-mail (${domain})` : "app do Steam no celular";
  rl.question(`[SPIKE] Digite o código do Steam Guard do ${onde}: `, (code) => callback(code.trim()));
});

client.on("error", (err) => {
  console.error(`[SPIKE][ERRO] Steam: ${err.message} (eresult=${err.eresult})`);
  process.exit(1);
});

client.on("loggedOn", () => {
  console.log(`[SPIKE] Logado! SteamID ${client.steamID}. Abrindo o Dota e conectando no GC...`);
  client.gamesPlayed(Dota2User.STEAM_APPID); // 570
});

dota2.on("connectedToGC", () => {
  console.log("[SPIKE] GC do Dota CONECTADO. Montando a sala...");
  console.log(`[SPIKE] >>> SALA: '${LOBBY_CONFIG.gameName}'  |  SENHA: ${LOBBY_CONFIG.passKey}  <<<`);
  console.log("[SPIKE]     (publique essa senha pros 10 — entrada manual caso o convite não chegue)");

  // (0) Defensivo: sai de qualquer lobby anterior PRESO (senão o create falha em silêncio)
  try {
    dota2.sendRawBuffer(MSG_LEAVE_LOBBY, Buffer.from(LobbyLeave.encode(LobbyLeave.create({})).finish()));
    console.log("[SPIKE] (0) Saí de lobby anterior (se havia).");
  } catch (e) {}

  // (1) cria a sala (após limpar o lobby anterior)
  setTimeout(() => {
    dota2.sendRawBuffer(
      MSG_CREATE_LOBBY,
      Buffer.from(
        LobbyCreate.encode(LobbyCreate.create({ passKey: LOBBY_CONFIG.passKey, lobbyDetails: LOBBY_CONFIG })).finish()
      )
    );
    console.log("[SPIKE] (1) criar lobby enviado.");
  }, 800);

  // (2) configura a sala explicitamente (garante modo/senha/liga/delay)
  setTimeout(() => {
    dota2.sendRawBuffer(MSG_SET_DETAILS, Buffer.from(LobbySetDetails.encode(LobbySetDetails.create(LOBBY_CONFIG)).finish()));
    console.log("[SPIKE] (2) SetDetails enviado (Ranked All Pick + Player Draft + senha + liga 18406 + delay 2min).");
  }, 2500);

  // (3) o bot FICA em 'jogadores de fora' (pool — default do create).
  // NÃO usar narração: lá o bot vira narrador e a partida só inicia se ele carregar
  // (ele não roda Dota). No pool, o bot SAI limpo no launch e a partida começa.
  // (nada a enviar aqui — o bot já está no pool após o create)

  // (4) convida sua conta
  if (TEST_INVITE_STEAMID) {
    setTimeout(() => {
      dota2.sendRawBuffer(
        MSG_INVITE_LOBBY,
        Buffer.from(CMsgInviteToLobby.encode(CMsgInviteToLobby.fromPartial({ steamId: TEST_INVITE_STEAMID })).finish())
      );
      console.log(`[SPIKE] (4) Convite enviado para ${TEST_INVITE_STEAMID}.`);
    }, 5500);
  }

  // (5) a contagem de 10 min NÃO começa aqui — ela dispara quando o 1º jogador ENTRA
  // (ver processLobby -> iniciarCronometro). Assim a sala não conta o tempo vazia.

  // (6) lançar quando você apertar ENTER
  console.log("\n[SPIKE] ===== TESTE =====");
  console.log("[SPIKE]  Entre no lobby (convite ou senha), FIQUE em 'Jogadores', e aperte ENTER pra LANÇAR.\n");
  rl.question("[SPIKE] >> ENTER para LANÇAR a partida... ", () => {
    dota2.sendRawBuffer(MSG_LAUNCH_LOBBY, Buffer.from(LobbyLaunch.encode(LobbyLaunch.create({})).finish()));
    if (cronometro) clearInterval(cronometro); // partida subiu -> para a contagem e os lembretes no chat
    console.log("[SPIKE] >>> LANÇAR enviado. Esperando o match_id e ABANDONANDO o jogo...");
    // Espera o match_id (capturado em processLobby), depois ABANDONA o jogo:
    // isso tira o bot do portão de loading -> os outros sobem; e já temos o match_id.
    setTimeout(() => {
      console.log(`[SPIKE] >>> match_id = ${matchIdAtual || "(?)"} | server_steam_id = ${serverIdAtual || "(?)"}`);
      console.log("[SPIKE] >>> (anote o server_steam_id acima pra testar o realtime.js)");
      try {
        dota2.sendRawBuffer(MSG_ABANDON, Buffer.from(Abandon.encode(Abandon.create({})).finish()));
        console.log("[SPIKE] >>> Bot ABANDONOU a partida.");
      } catch (e) {}
      try {
        dota2.sendRawBuffer(MSG_LEAVE_LOBBY, Buffer.from(LobbyLeave.encode(LobbyLeave.create({})).finish()));
      } catch (e) {}
      console.log("[SPIKE] >>> Olhe o Dota: a partida COMEÇOU (loading) sem o bot?");
    }, 4000);
  });
});

dota2.on("disconnectedFromGC", (reason) => {
  console.log(`[SPIKE] GC desconectou (motivo ${reason}). Tentando reconectar...`);
});

// Descartar a sala = EXPULSAR todos os jogadores, depois SAIR (não deixa lobby morto)
function descartarLobby(cb) {
  console.log(`[SPIKE] Descartar: vejo ${membrosLobby.length} jogador(es) na sala pra expulsar.`);
  for (const m of membrosLobby) {
    try {
      const accountId = Number(BigInt(m.id) & 0xffffffffn);
      dota2.sendRawBuffer(MSG_KICK_FROM_LOBBY, Buffer.from(LobbyKick.encode(LobbyKick.create({ accountId })).finish()));
      console.log(`  >> Kick ${m.id} (account_id ${accountId})`);
    } catch (e) {
      console.log("  >> erro no kick:", e.message);
    }
  }
  setTimeout(() => {
    try {
      if (LobbyLeave && dota2.haveGCSession) {
        dota2.sendRawBuffer(MSG_LEAVE_LOBBY, Buffer.from(LobbyLeave.encode(LobbyLeave.create({})).finish()));
        console.log("[SPIKE] Bot saiu da sala.");
      }
    } catch (e) {}
    setTimeout(cb, 800);
  }, 1500);
}

// Anuncia no chat que um jogador entrou (cita o nome via getPersonas) + 1 lembrete da doutrina
function anunciarEntrada(steamId, faltam) {
  client.getPersonas([steamId], (err, personas) => {
    const u = personas && personas[steamId];
    const nome = u && u.player_name ? u.player_name : "Jogador";
    const faltaTxt = faltam > 0 ? `Faltam ${faltam} para completar os 10.` : "Sala completa.";
    enviarChatLobby(`${nome} entrou. ${faltaTxt}`);
    console.log(`[CHAT] ${nome} entrou — faltam ${faltam}.`);
    enviarChatLobby(proximaFraseDoutrina());
  });
}

// Manda uma mensagem no chat do lobby (se já entrou no canal)
function enviarChatLobby(text) {
  if (!chatChannelId || !ChatMsg) return;
  try {
    dota2.sendRawBuffer(MSG_CHAT, Buffer.from(ChatMsg.encode(ChatMsg.create({ channelId: chatChannelId, text })).finish()));
  } catch (e) {}
}

// Cronômetro de expiração: a cada minuto, avisa a contagem e RECONVIDA quem ainda
// não entrou. Ao zerar (10 min), descarta a sala (timeout).
const EXPIRA_MIN = 10;
const TICK_MS = 60000; // 1 min. (baixe pra 10000 = 10s se quiser testar rápido)
let minutosRestantes = EXPIRA_MIN;
let cronometro = null;

function iniciarCronometro() {
  if (cronometro) clearInterval(cronometro);
  minutosRestantes = EXPIRA_MIN;
  console.log(`[SPIKE] ⏰ 1º jogador entrou — contagem iniciada. Expira em ${EXPIRA_MIN} min.`);
  enviarChatLobby(`Sala aberta. Expira em ${EXPIRA_MIN} minutos se não completar os 10.`);
  cronometro = setInterval(() => {
    minutosRestantes -= 1;
    if (minutosRestantes <= 0) {
      clearInterval(cronometro);
      console.log("[SPIKE] ⏰ 10 min sem completar — DESCARTANDO a sala (timeout).");
      descartarLobby(() => {
        try { client.gamesPlayed([]); client.logOff(); } catch (e) {}
        rl.close();
        process.exit(0);
      });
      return;
    }
    console.log(`[SPIKE] ⏰ O lobby expira em ${minutosRestantes} minuto(s)...`);
    enviarChatLobby(`O lobby expira em ${minutosRestantes} minuto(s) se não completar.`);
    enviarChatLobby(proximaFraseDoutrina());
    // RECONVIDA quem ainda não entrou (spike: o jogador de teste)
    if (TEST_INVITE_STEAMID && !membrosLobby.some((m) => String(m.id) === TEST_INVITE_STEAMID)) {
      dota2.sendRawBuffer(
        MSG_INVITE_LOBBY,
        Buffer.from(CMsgInviteToLobby.encode(CMsgInviteToLobby.fromPartial({ steamId: TEST_INVITE_STEAMID })).finish())
      );
      console.log("[SPIKE] ⏰ Reconvite enviado (jogador ainda não está na sala).");
    }
  }, TICK_MS);
}

let encerrando = false;
process.on("SIGINT", () => {
  if (encerrando) process.exit(0); // segundo Ctrl+C força saída
  encerrando = true;
  console.log("\n[SPIKE] Encerrando — descartando a sala (expulsa todos + sai)...");
  descartarLobby(() => {
    try { client.gamesPlayed([]); client.logOff(); } catch (e) {}
    rl.close();
    process.exit(0);
  });
});
