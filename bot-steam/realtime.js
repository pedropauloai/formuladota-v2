"use strict";
/**
 * SPIKE de telemetria AO VIVO — preview da partida (estilo casa de aposta).
 * =========================================================================
 * Prova que dá pra rastrear a partida em tempo real SEM o bot estar dentro dela.
 * Funciona porque o lobby usa TICKET DE LIGA (18406) -> a partida é "league match"
 * e a Valve expõe ela no endpoint GetRealtimeStats da Steam WebAPI.
 *
 * O que GetRealtimeStats devolve (por jogador): herói, nível, K/D/A, net worth,
 * itens e POSIÇÃO x/y no mapa. Mais o estado das torres. Tudo no delay do DotaTV.
 *
 * Uso:
 *   1) Ponha STEAM_WEB_API_KEY no .env  (pega em https://steamcommunity.com/dev/apikey)
 *   2) Rode o spike.js, suba a partida e copie o "server_steam_id" do log.
 *   3) node realtime.js <server_steam_id>
 *
 * Requer Node 18+ (usa fetch nativo).
 */
require("dotenv").config();

const KEY = process.env.STEAM_WEB_API_KEY;
const server = process.argv[2];

if (!KEY) {
  console.error("[realtime] Defina STEAM_WEB_API_KEY no .env (pega em steamcommunity.com/dev/apikey).");
  process.exit(1);
}
if (!server) {
  console.error("[realtime] Uso: node realtime.js <server_steam_id>  (pegue no log do spike.js após lançar).");
  process.exit(1);
}

const URL =
  `https://api.steampowered.com/IDOTA2MatchStats_570/GetRealtimeStats/v1/` +
  `?key=${KEY}&server_steam_id=${server}`;

function mmss(seg) {
  const s = Math.max(0, Math.floor(seg || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

let dumpFeito = false;
async function tick() {
  try {
    const r = await fetch(URL);
    if (!r.ok) {
      console.log(`[realtime] HTTP ${r.status} — a partida pode nao estar no ar ainda (ou delay do DotaTV). Tentando de novo...`);
      return;
    }
    const d = await r.json();
    const m = d.match || {};
    // 1x: mostra o 1o player CRU pra confirmarmos os nomes de campo (posicao x/y, itens, etc.)
    const p0 = d.teams && d.teams[0] && d.teams[0].players && d.teams[0].players[0];
    if (!dumpFeito && p0) {
      dumpFeito = true;
      console.log("[realtime][debug] 1o player cru:", JSON.stringify(p0));
    }
    console.log(`\n===== PARTIDA ${m.matchid || m.match_id || "?"} | tempo ${mmss(m.game_time)} | liga ${m.league_id || "?"} =====`);
    for (const team of d.teams || []) {
      const lado = team.team_number === 2 ? "ILUMINADOS" : team.team_number === 3 ? "TEMIDOS" : `time ${team.team_number}`;
      console.log(`--- ${lado}  |  net worth ${team.net_worth || 0}  |  placar ${team.score || 0} ---`);
      for (const p of team.players || []) {
        const nome = (p.name || "?").slice(0, 14).padEnd(14);
        console.log(
          `  ${nome} hero ${String(p.heroid).padStart(3)}  lvl ${String(p.level || 0).padStart(2)}  ` +
            `K/D/A ${p.kill_count || 0}/${p.death_count || 0}/${p.assists_count || 0}  ` +
            `nw ${String(p.net_worth || 0).padStart(6)}  itens ${(p.items || []).length}  ` +
            `pos (${Number(p.x || 0).toFixed(2)}, ${Number(p.y || 0).toFixed(2)})`
        );
      }
    }
  } catch (e) {
    console.log("[realtime] erro:", e.message);
  }
}

console.log(`[realtime] Pollando GetRealtimeStats do server ${server} a cada 5s...`);
tick();
setInterval(tick, 5000);
