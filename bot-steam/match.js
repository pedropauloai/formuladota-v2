"use strict";
/**
 * Consulta o RESULTADO de uma partida FINALIZADA (Steam WebAPI GetMatchDetails).
 * ============================================================================
 * Diferente do realtime.js (que é AO VIVO, por server_steam_id):
 *   - realtime.js  -> preview ao vivo (posições, lvl, itens)  [partida em andamento]
 *   - match.js     -> resultado final (vencedor, KDA, itens)  [partida acabada]
 *
 * É assim que o FormulaDota vai puxar o resultado pra dar XP/HONOR (por match_id).
 *
 * Uso:
 *   1) STEAM_WEB_API_KEY no .env  (https://steamcommunity.com/dev/apikey)
 *   2) node match.js <match_id>
 *
 * Requer Node 18+ (fetch nativo).
 */
require("dotenv").config();

const KEY = process.env.STEAM_WEB_API_KEY;
const matchId = process.argv[2];

if (!KEY) {
  console.error("[match] Defina STEAM_WEB_API_KEY no .env (pega em steamcommunity.com/dev/apikey).");
  process.exit(1);
}
if (!matchId) {
  console.error("[match] Uso: node match.js <match_id>   ex: node match.js 8868551477");
  process.exit(1);
}

const URL =
  `https://api.steampowered.com/IDOTA2Match_570/GetMatchDetails/v1/` +
  `?key=${KEY}&match_id=${matchId}`;

const LEAVER = ["ficou (NONE)", "desconectou", "desconectou (longo)", "ABANDONOU", "AFK", "nunca conectou", "bot"];

(async () => {
  try {
    const r = await fetch(URL);
    const raw = await r.text();
    let d;
    try {
      d = JSON.parse(raw);
    } catch (e) {
      console.log(`[match] HTTP ${r.status}: a Steam respondeu algo que NAO e JSON.`);
      console.log("[match] Isso quase sempre e CHAVE invalida/errada no .env (ou espaco/aspas a mais).");
      console.log("[match] Resposta crua (inicio):", raw.slice(0, 300));
      return;
    }
    const res = d.result;
    if (!res || res.error) {
      const vazio = d && Object.keys(d).length === 0;
      if (r.status === 500 || vazio) {
        console.log(`[match] HTTP ${r.status} | a Valve ainda NAO entregou esta partida (resposta vazia {}).`);
        console.log("[match] Causa #1: a partida ainda estava AO VIVO (ou acabou agora mesmo).");
        console.log("[match] GetMatchDetails so funciona com a partida 100% ENCERRADA e processada.");
        console.log("[match] Espere uns 5 min DEPOIS do fim do jogo e rode de novo.");
        return;
      }
      console.log(`[match] HTTP ${r.status} | sem resultado para ${matchId}: ${res && res.error ? res.error : "campo 'result' ausente"}.`);
      console.log("[match] Resposta crua da Steam:", JSON.stringify(d).slice(0, 400));
      return;
    }
    const dur = res.duration || 0;
    console.log(`\nPARTIDA ${res.match_id}  |  duração ${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, "0")}  |  liga ${res.leagueid || 0}`);
    console.log(`Vencedor: ${res.radiant_win ? "ILUMINADOS" : "TEMIDOS"}  |  placar ${res.radiant_score}-${res.dire_score}\n`);
    for (const p of res.players || []) {
      const lado = p.player_slot < 128 ? "ILU" : "TEM";
      const itens = [p.item_0, p.item_1, p.item_2, p.item_3, p.item_4, p.item_5].filter(Boolean).length;
      console.log(
        `  [${lado}] hero ${String(p.hero_id).padStart(3)}  lvl ${String(p.level || 0).padStart(2)}  ` +
          `K/D/A ${p.kills}/${p.deaths}/${p.assists}  nw ${String(p.net_worth || 0).padStart(6)}  ` +
          `itens ${itens}  -> ${LEAVER[p.leaver_status] || p.leaver_status}`
      );
    }
    console.log("");
  } catch (e) {
    console.log("[match] erro:", e.message);
  }
})();
