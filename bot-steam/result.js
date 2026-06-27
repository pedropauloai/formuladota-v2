"use strict";
/**
 * RESULTADO + METRICAS de uma partida via OpenDota.
 * =================================================
 * Por que OpenDota e nao a Steam: a OpenDota PARSEIA o replay e entrega metricas
 * que o GetMatchDetails da Valve nao tem — inclusive APM (actions_per_min),
 * eficiencia de lane, timings de itens, series por minuto, etc. E e keyless.
 *
 * Uso:  node result.js <match_id>
 *   (a partida precisa ser REAL — jogadores nos dois times. Solo nao grava.)
 *
 * "parseado" = replay processado (tem APM e o resto). Se vier "NAO", o basico
 * ja aparece e o parse pode ser forcado abrindo a partida no site da OpenDota.
 *
 * Requer Node 18+ (fetch nativo).
 */
const matchId = process.argv[2];
if (!matchId) {
  console.error("[result] Uso: node result.js <match_id>   ex: node result.js 8863764305");
  process.exit(1);
}

const URL = `https://api.opendota.com/api/matches/${matchId}`;

function mmss(s) {
  s = s || 0;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

(async () => {
  try {
    const r = await fetch(URL);
    const d = await r.json();
    if (!d || !d.match_id) {
      console.log(`[result] A OpenDota ainda NAO tem a partida ${matchId}.`);
      console.log("[result] Se a partida foi REAL (jogadores dos 2 lados), espere uns minutos e tente de novo.");
      console.log("[result] Lembrete: partida SOLO (1 humano + slots vazios) a Valve NAO grava.");
      return;
    }
    const parsed = d.version != null; // version != null -> replay parseado (tem APM etc.)
    console.log(`\nPARTIDA ${d.match_id} | duracao ${mmss(d.duration)} | liga ${d.leagueid || 0} | modo ${d.game_mode}`);
    console.log(`Vencedor: ${d.radiant_win ? "ILUMINADOS" : "TEMIDOS"} | placar ${d.radiant_score}-${d.dire_score} | parseado: ${parsed ? "SIM (tem APM)" : "NAO (so basico)"}\n`);
    console.log("  LADO nome           hero lvl  K/D/A    GPM  XPM   LH   APM  laneEff");
    for (const p of d.players || []) {
      const lado = p.player_slot < 128 ? "ILU" : "TEM";
      const apm = p.actions_per_min != null ? String(p.actions_per_min).padStart(4) : "   -";
      const laneEff = p.lane_efficiency_pct != null ? p.lane_efficiency_pct + "%" : "-";
      const nome = (p.personaname || "anon").slice(0, 14).padEnd(14);
      console.log(
        `  ${lado}  ${nome} ${String(p.hero_id).padStart(3)}  ${String(p.level).padStart(2)}  ` +
          `${String(p.kills)}/${String(p.deaths)}/${String(p.assists)}`.padEnd(8) +
          ` ${String(p.gold_per_min).padStart(4)} ${String(p.xp_per_min).padStart(4)} ${String(p.last_hits).padStart(4)}  ${apm}  ${laneEff}`
      );
    }
    if (!parsed) {
      console.log("\n[result] Sem APM porque o replay ainda nao foi parseado pela OpenDota.");
      console.log(`[result] Forcar: abra https://www.opendota.com/matches/${matchId} e clique em 'Parse' (ou aguarde).`);
    }
    console.log("");
  } catch (e) {
    console.log("[result] erro:", e.message);
  }
})();
