// MMR Elo helper FORMULADOTA — Phase 6 H4.2.
// Formula Elo standard com K=25 (Dota-like sensitivity).

export const ELO_K = 25;
export const STARTING_MMR = 1000;

// TETO do MMR in-house (Pedro 2026-07-02): a escala é ANCORADA na do Dota real
// (Imortal = 5620) e LIMITADA a 7000 pra não inflacionar — o topo tem que significar
// algo, não virar "6000 é pouco". Sem teto, a calibração dobrada inflava tudo.
export const MMR_CEILING = 7000;
/** Teto de variação por partida (evita swings absurdos tipo +64). */
export const MAX_MATCH_DELTA = 30;

/** Piso do Imortal (fim do Divino) — acima disso o ranqueamento é por POSIÇÃO. */
export const IMMORTAL_FLOOR = 5620;
/**
 * Elite do leaderboard: os TOP 10 (por posição na temporada) usam a medalha ESCURA
 * (anel, `immortal-leaderboard`). Do #1 ao #10 a arte é IDÊNTICA — muda só o número.
 */
export const IMMORTAL_ELITE_TOP = 10;
/**
 * Leaderboard numerado: os TOP 30 exibem a POSIÇÃO (#N) dentro da placa da medalha
 * (estilo oficial Dota). #1–#10 escura (`immortal-leaderboard`), #11–#30 vermelha
 * (`immortal-top-100`). Pedro 2026-07-02 (PR #97).
 */
export const IMMORTAL_LEADERBOARD_TOP = 30;

/**
 * Calcula delta MMR de cada jogador após match 5v5.
 * Retorna objeto com radiantDelta + direDelta (positivo radiant = ganhou).
 *
 * Logic: cada player Radiant individualmente perde/ganha contra cada player Dire,
 * usando rating médio dos times pra simplificar (clássico Elo team).
 */
export function calculateMmrDelta(input: {
  radiantAvgMmr: number;
  direAvgMmr: number;
  radiantWon: boolean;
}): { radiantDelta: number; direDelta: number } {
  const expectedRadiant = 1 / (1 + Math.pow(10, (input.direAvgMmr - input.radiantAvgMmr) / 400));
  const expectedDire = 1 - expectedRadiant;

  const actualRadiant = input.radiantWon ? 1 : 0;
  const actualDire = input.radiantWon ? 0 : 1;

  const radiantDelta = Math.round(ELO_K * (actualRadiant - expectedRadiant));
  const direDelta = Math.round(ELO_K * (actualDire - expectedDire));

  return { radiantDelta, direDelta };
}

/**
 * Decay aplicado ao reset de season (-30%).
 * decayedMmr = floor(currentMmr * 0.7) but minimum STARTING_MMR (1000).
 */
export function applySeasonDecay(currentMmr: number): number {
  return Math.max(STARTING_MMR, Math.floor(currentMmr * 0.7));
}

// =====================================================================
// MODULADOR DE DESEMPENHO (MMR híbrido — Pedro 2026-06-18)
// O delta Elo (win/loss) é a ESPINHA; o desempenho da partida o ajusta.
// Fonte: percentis da OpenDota (match_players.benchmarks) — calculados POR
// HERÓI, então são justos entre funções (um suporte é comparado a suportes).
// =====================================================================

// MODELO v3 — PESOS POR FUNÇÃO (Pedro 2026-07-04). Dados reais provaram que o v2
// (perfil único) PUNIA suporte: 5/10 do peso vinha de hero_damage/tower/gpm, onde
// suporte tem percentil estruturalmente baixo (não é o trabalho dele). Além disso
// o v2 tinha um componente FANTASMA: "stuns_per_min" NÃO existe nos benchmarks da
// OpenDota (chaves reais: gold/xp/kills/last_hits/hero_damage/hero_healing por min
// + tower_damage) — nunca somou.
//
// v3: cada jogador é avaliado no PERFIL da sua FUNÇÃO (core vs support, detectada
// por net worth). Doutrina "Dota é corrida patrimonial + jogar JUNTO": teamfight
// domina nos dois; o resto reflete o que CADA função entrega. Componente ausente
// (partida não parseada, sem benchmark) sai da média ponderada. `stuns` e `wards`
// são "direct" (do replay parseado, normalizados — ver normalizeStuns/normalizeWards).
export type PlayerRole = "core" | "support";

export interface PerfComponent {
  key: string;
  weight: number;
  source: "benchmark" | "direct";
}

// v4 (Pedro 2026-07-05): REMOVIDO o `stuns`. Era um sinal ABSOLUTO (não-benchmark):
// herói sem stun (SF, Sniper) recebia `stuns = 0` REAL, que entrava na média e PUXAVA
// a nota — punia estruturalmente quem não pode dar stun. Como não existe benchmark de
// stun por herói na OpenDota, não dá pra torná-lo justo por herói; o "controle" já é
// capturado indiretamente pelo teamfight_participation. As demais métricas benchmark
// (dano/torre/cura/farm) SÃO por herói (percentil OpenDota), então são justas — inclusive
// a cura, que conta ITENS (Greaves/Vlad's) e compara o jogador a OUTROS do mesmo herói.
// `wards` fica SÓ no suporte (warding é trabalho do sup — justo cobrar).
export const PERF_PROFILES: Record<PlayerRole, ReadonlyArray<PerfComponent>> = {
  core: [
    { key: "teamfight_participation", weight: 3, source: "direct" }, // jogar junto (domina)
    { key: "hero_damage_per_min", weight: 2, source: "benchmark" },  // combate
    { key: "tower_damage", weight: 2, source: "benchmark" },         // objetivos / fechar
    { key: "hero_healing_per_min", weight: 1, source: "benchmark" }, // utility eventual (itens)
    { key: "gold_per_min", weight: 1, source: "benchmark" },         // farm importa, não domina
  ],
  support: [
    { key: "teamfight_participation", weight: 3, source: "direct" }, // jogar junto (domina)
    { key: "hero_healing_per_min", weight: 2, source: "benchmark" }, // cura/utility (itens+skills)
    { key: "wards", weight: 2, source: "direct" },                   // visão = trabalho do sup
    { key: "hero_damage_per_min", weight: 1, source: "benchmark" },  // combate secundário
    // SEM stuns (punia herói sem stun), SEM tower_damage e SEM gold_per_min (não é o
    // trabalho do suporte).
  ],
};

/** Amplitude do ajuste de desempenho: ±(PERF_SWING/2) MMR no extremo. */
export const PERF_SWING = 20;

// --- Normalização dos sinais "direct" do replay parseado (0..1) --------------
/** Teto de stun: 4s de stun por MINUTO de jogo = pct 1,0. Calibrável. */
export const STUN_SECONDS_PER_MIN_CAP = 4;
/** Teto de wards: ~0,6 ward por MINUTO de jogo = pct 1,0. Calibrável. */
export const WARDS_PER_MIN_CAP = 0.6;

/** stuns (segundos de stun, raw_opendota.stuns) → pct 0..1. null se ausente. */
export function normalizeStuns(
  stunSeconds: number | null | undefined,
  durationMin: number
): number | null {
  if (typeof stunSeconds !== "number" || !(durationMin > 0)) return null;
  return Math.min(1, Math.max(0, stunSeconds) / (durationMin * STUN_SECONDS_PER_MIN_CAP));
}

/** wards totais (obs_placed + sen_placed) → pct 0..1. null se ausente. */
export function normalizeWards(
  wardsTotal: number | null | undefined,
  durationMin: number
): number | null {
  if (typeof wardsTotal !== "number" || !(durationMin > 0)) return null;
  return Math.min(1, Math.max(0, wardsTotal) / (durationMin * WARDS_PER_MIN_CAP));
}

// FONTE CORRETA da função/posição = a role ATRIBUÍDA no matchmaking
// (lobby_players.role), NÃO o net worth (Pedro 2026-07-05). O patrimônio não define a
// role: um offlane pode ter mais NW que o mid, um mid mais que o carry, etc. O
// net worth só serve de FALLBACK pra partida sem atribuição (jogador externo/legado).
export const ASSIGNED_ROLE_TO_POSITION: Record<string, number> = {
  safelane: 1, // carry / pos 1
  midlane: 2, // mid / pos 2
  offlane: 3, // offlane / pos 3
  support: 4, // suporte / pos 4
  support_dedicated: 5, // hard support / pos 5
};

/** Posição 1-5 → função de avaliação (pos 4/5 = support; 1/2/3 = core). */
export function positionToRole(pos: number): PlayerRole {
  return pos >= 4 ? "support" : "core";
}

/**
 * FALLBACK por net worth (usar SÓ quando não há role atribuída): em cada time, os 2
 * de MENOR net worth = SUPPORT (pos 4/5), o resto CORE. Retorna um array de roles
 * alinhado ao input (mesma ordem).
 */
export function assignRolesByNetWorth(
  players: ReadonlyArray<{ team: string; netWorth: number | null | undefined }>
): PlayerRole[] {
  const roles: PlayerRole[] = players.map(() => "core");
  for (const team of Array.from(new Set(players.map((p) => p.team)))) {
    const inTeam = players
      .map((p, i) => ({ i, nw: p.netWorth ?? 0, t: p.team }))
      .filter((x) => x.t === team)
      .sort((a, b) => a.nw - b.nw);
    for (let k = 0; k < Math.min(2, inTeam.length); k++) {
      roles[inTeam[k]!.i] = "support";
    }
  }
  return roles;
}

/** Sinais "direct" (do replay parseado), já normalizados 0..1. */
export interface PerfExtras {
  teamfightParticipation?: number | null;
  /** normalizeStuns(raw.stuns, duraçãoMin). */
  stuns?: number | null;
  /** normalizeWards(raw.obs_placed + raw.sen_placed, duraçãoMin). */
  wards?: number | null;
}

function directValue(key: string, extras?: PerfExtras): number | null {
  const v =
    key === "teamfight_participation"
      ? extras?.teamfightParticipation
      : key === "stuns"
        ? extras?.stuns
        : key === "wards"
          ? extras?.wards
          : null;
  return typeof v === "number" && v >= 0 && v <= 1 ? v : null;
}

/**
 * Componentes PRESENTES (valor 0..1 disponível) do perfil da função — usado tanto
 * pelo score quanto pela exibição do breakdown na aba MMR. Ausentes saem fora.
 */
export function perfComponents(
  role: PlayerRole,
  benchmarks: Record<string, { pct?: number | null }> | null | undefined,
  extras?: PerfExtras
): Array<{ key: string; value: number; weight: number }> {
  const out: Array<{ key: string; value: number; weight: number }> = [];
  for (const c of PERF_PROFILES[role]) {
    let value: number | null = null;
    if (c.source === "direct") {
      value = directValue(c.key, extras);
    } else {
      const pct = benchmarks?.[c.key]?.pct;
      if (typeof pct === "number" && pct >= 0 && pct <= 1) value = pct;
    }
    if (value !== null) out.push({ key: c.key, value, weight: c.weight });
  }
  return out;
}

/**
 * Score de desempenho 0..1 = média PONDERADA dos componentes presentes do perfil
 * da FUNÇÃO. Sem nenhum dado → 0.5 (neutro: win/loss puro). O win/loss é a espinha;
 * isto só modula ±PERF_SWING/2.
 */
export function computePerfScore(
  role: PlayerRole,
  benchmarks: Record<string, { pct?: number | null }> | null | undefined,
  extras?: PerfExtras
): number {
  const present = perfComponents(role, benchmarks, extras);
  if (present.length === 0) return 0.5;
  const weightSum = present.reduce((a, c) => a + c.weight, 0);
  const weighted = present.reduce((a, c) => a + c.weight * c.value, 0);
  return weightSum === 0 ? 0.5 : weighted / weightSum;
}

// =====================================================================
// v5 (Pedro 2026-07-06): IMPACTO ABSOLUTO na nota de desempenho.
// O percentil-por-função (v4) deixava o SUPORTE saturar a nota (cura/wards batem
// ~1.0 fazendo o feijão-com-arroz) enquanto o CORE dominante raramente cravava
// 0.9 em dano/torre/gpm juntos. Resultado comprovado nos dados: suporte 0/2/25
// virou MVP na frente de um carry 21/0/7 (o dobro de patrimônio), e o core que
// MAIS causou dano perdeu MAIS que o suporte apagado. Corrige ancorando a MAIOR
// parte da nota no IMPACTO real (patrimônio + participação em kills) — a doutrina
// da corrida patrimonial. nota = (1-w)·execução-por-função + w·impacto.
//
// v5.1 (Pedro 2026-07-06): calibragem PRÓ-PATRIMÔNIO. Dados provaram que a 50/50 um
// suporte "modelo" (Silencer 1/10/15, presença de teamfight 0.76, 15 wards) ainda
// perdia MENOS que um core de maior patrimônio e MAIOR dano da partida (Underlord
// 5/5/8, 42k de dano) — porque a execução-por-função do suporte SATURA e a metade
// impacto (50/50) não bastava pra virar. Dois ajustes:
//   1) IMPACT_WEIGHT 0.5 → 0.6 (impacto pesa MAIS que execução).
//   2) Dentro do impacto, PATRIMÔNIO pesa mais que K+A (0.65/0.35). Motivo: os
//      assists MEIO QUE contam a presença em luta DE NOVO (o suporte pega assist
//      justamente por estar na luta, e isso já é premiado no teamfight_participation,
//      o maior peso da execução). Patrimônio é o sinal LIMPO da corrida de ouro.
// =====================================================================

/** Peso do impacto absoluto na nota final. 0.6 = impacto pesa mais que execução (0.4). */
export const IMPACT_WEIGHT = 0.6;

/** Peso do PATRIMÔNIO dentro do impacto (o resto, 0.35, é a participação em kills). */
export const PATRIMONY_WEIGHT = 0.65;

/** Bônus de MMR pro MVP da partida (o teto de ±MAX_MATCH_DELTA continua valendo). */
export const MVP_BONUS = 2;

/**
 * Impacto absoluto 0..1 do jogador: PATRIMÔNIO (peso PATRIMONY_WEIGHT) + participação
 * em kills (K+A), cada um normalizado pelo MAIOR da partida inteira. Reflete "quem de
 * fato decidiu": o carry dominante satura, o suporte apagado fica baixo. Independe da
 * função. O patrimônio domina (corrida de ouro) porque K+A já é meio-refletido na
 * execução via teamfight_participation.
 */
export function computeImpact(input: {
  netWorth: number | null | undefined;
  killsPlusAssists: number | null | undefined;
  maxNetWorth: number;
  maxKa: number;
}): number {
  const nw = input.maxNetWorth > 0 ? Math.max(0, input.netWorth ?? 0) / input.maxNetWorth : 0;
  const ka = input.maxKa > 0 ? Math.max(0, input.killsPlusAssists ?? 0) / input.maxKa : 0;
  return Math.min(1, PATRIMONY_WEIGHT * nw + (1 - PATRIMONY_WEIGHT) * ka);
}

/** Nota final = blend execução-por-função (rolePerf) + impacto absoluto (0..1). */
export function blendPerf(rolePerf: number, impact: number, impactWeight = IMPACT_WEIGHT): number {
  return Math.max(0, Math.min(1, (1 - impactWeight) * rolePerf + impactWeight * impact));
}

/**
 * Modula o delta Elo base pelo desempenho (ADITIVO, centrado em 0.5):
 *   bônus = PERF_SWING × (perfScore − 0.5)   → +10 (ótimo) … −10 (péssimo)
 * Vitória com bom desempenho ganha MAIS; derrota com bom desempenho perde
 * MENOS ("ganhe ou perca, a partida vale a pena"). Nunca cruza o zero:
 * vencedor sempre ganha ≥1, perdedor sempre perde ≥1.
 */
export function modulateMmrDelta(
  baseDelta: number,
  perfScore: number,
  won: boolean
): number {
  const perfBonus = Math.round(PERF_SWING * (perfScore - 0.5));
  // Teto por partida (Pedro 2026-07-02): limita o swing a ±MAX_MATCH_DELTA
  // (evita os +64 que a calibração dobrada gerava).
  const clamped = Math.max(-MAX_MATCH_DELTA, Math.min(MAX_MATCH_DELTA, baseDelta + perfBonus));
  return won ? Math.max(1, clamped) : Math.min(-1, clamped);
}

/**
 * Tier client-side fallback (mesma lógica do SQL helper mmr_to_tier).
 * Útil pra renderizar TierBadge sem RPC roundtrip quando MMR já está em mãos.
 */
export interface TierInfo {
  tier: number;        // 1-8 (Herald → Immortal)
  stars: number;       // 0-5 (Immortal = 0, outros 1-5)
  tierName: string;
}

// Bandas ANCORADAS na escala oficial do Dota (wiki 2025/2026): cada estrela ≈ 154 MMR
// até Ancião; Divino ≈ 200/estrela (4620–5619); Imortal a partir de 5620.
const TIER_BANDS: Array<{ tier: number; name: string; min: number; range: number; starStep: number }> = [
  { tier: 1, name: "Herald", min: 0, range: 770, starStep: 154 },
  { tier: 2, name: "Guardian", min: 770, range: 770, starStep: 154 },
  { tier: 3, name: "Crusader", min: 1540, range: 770, starStep: 154 },
  { tier: 4, name: "Archon", min: 2310, range: 770, starStep: 154 },
  { tier: 5, name: "Legend", min: 3080, range: 770, starStep: 154 },
  { tier: 6, name: "Ancient", min: 3850, range: 770, starStep: 154 },
  { tier: 7, name: "Divine", min: 4620, range: 1000, starStep: 200 },
  { tier: 8, name: "Immortal", min: 5620, range: Infinity, starStep: 0 },
];

export function mmrToTier(mmr: number): TierInfo {
  for (const band of TIER_BANDS) {
    if (mmr >= band.min && mmr < band.min + band.range) {
      const stars =
        band.tier === 8
          ? 0
          : Math.min(5, Math.max(1, Math.floor((mmr - band.min) / band.starStep) + 1));
      return { tier: band.tier, stars, tierName: band.name };
    }
  }
  return { tier: 1, stars: 1, tierName: "Herald" };
}

// =====================================================================
// CALIBRAÇÃO (ver docs/foundations/RANKING_SYSTEM.md)
// =====================================================================

/** Nº de placements até calibrar (medalha revelada; antes disso = descalibrado). */
export const CALIBRATION_MATCHES = 10;
/** Multiplicador na calibração (placements amplificadas). Sistema anti-boosted (Pedro
 *  2026-07-06): as ~10 primeiras partidas movem MAIS MMR (±30 × 1.8 ≈ ±54) — o boosted
 *  despenca rápido e o legítimo sobe rápido, convergindo pro MMR real em poucos jogos.
 *  Antes era 1 (desligado). */
export const CALIBRATION_MULTIPLIER = 1.8;

// =====================================================================
// SISTEMA ANTI-BOOSTED (Pedro 2026-07-06 — aprovado). A medalha Valve NÃO é confiável
// (tem Imortal comprado que é Ancião real). 3 alavancas empurram cada um pro MMR real:
//   1) DESCONTO PROGRESSIVO na semente de entrada (abaixo).
//   2) CALIBRAÇÃO amplificada (CALIBRATION_MULTIPLIER acima).
//   3) BÔNUS DE SEQUÊNCIA (streak) que quebra o teto (abaixo).
// =====================================================================

/** Teto de variação por partida quando amplificado (calibração OU streak). Sem
 *  amplificação segue o MAX_MATCH_DELTA (±30). */
export const MAX_MATCH_DELTA_BOOSTED = 55;
/** Sequência mínima (vitórias/derrotas seguidas) pra começar o bônus. */
export const STREAK_MIN = 3;
/** MMR extra por partida a mais na sequência, a partir da STREAK_MIN. */
export const STREAK_STEP = 6;
/** Teto do bônus de sequência (evita inflar/deflar sem fim). */
export const STREAK_MAX_BONUS = 24;

/** Fator de RETENÇÃO da semente por medalha (1 − desconto). O boosting se concentra no
 *  TOPO, então quanto mais alta a medalha, MAIOR o corte na entrada — o jogador prova
 *  seu valor. Índice = medalha 1 (Arauto) … 8 (Imortal). */
const SEED_RETENTION: Record<number, number> = {
  1: 0.90, // Arauto   −10%
  2: 0.88, // Guardião −12%
  3: 0.86, // Cruzado  −14%
  4: 0.83, // Arcano   −17%
  5: 0.80, // Lenda    −20%
  6: 0.75, // Ancião   −25%
  7: 0.70, // Divino   −30%
  8: 0.65, // Imortal  −35%
};

/**
 * Bônus de sequência: a partir de STREAK_MIN vitórias/derrotas SEGUIDAS, cada partida
 * a mais na sequência soma STREAK_STEP (até STREAK_MAX_BONUS). Retorna >= 0 (o sinal é
 * aplicado pelo caller conforme won). streakLen inclui a partida atual.
 */
export function streakBonus(streakLen: number): number {
  if (streakLen < STREAK_MIN) return 0;
  return Math.min(STREAK_MAX_BONUS, (streakLen - (STREAK_MIN - 1)) * STREAK_STEP);
}

/**
 * Compõe o delta FINAL de uma partida a partir do delta já modulado por desempenho
 * (modulateMmrDelta, ±30). Aplica, em ordem: bônus de MVP → amplificação de calibração
 * → bônus de sequência → teto (±30 normal, ±MAX_MATCH_DELTA_BOOSTED se amplificado).
 * Nunca cruza o zero (vencedor ≥1, perdedor ≤−1). Fonte ÚNICA usada por apply + replay.
 */
export function composeMatchDelta(input: {
  baseModulated: number; // saída de modulateMmrDelta (±30, com sinal do resultado)
  won: boolean;
  isMvp: boolean;
  calibrating: boolean;
  streakLen: number; // comprimento da sequência INCLUINDO esta partida
}): number {
  let delta = input.baseModulated;
  if (input.isMvp) delta += MVP_BONUS; // favorece o MVP nos dois sinais
  if (input.calibrating) delta *= CALIBRATION_MULTIPLIER;
  const sb = streakBonus(input.streakLen);
  if (sb > 0) delta += input.won ? sb : -sb;
  const boosted = input.calibrating || sb > 0;
  const cap = boosted ? MAX_MATCH_DELTA_BOOSTED : MAX_MATCH_DELTA;
  const rounded = Math.round(delta);
  return input.won ? Math.max(1, Math.min(cap, rounded)) : Math.min(-1, Math.max(-cap, rounded));
}

/**
 * Semente de MMR a partir da medalha Valve (rank_tier OpenDota: dezena = medalha
 * 1–8, unidade = estrela 0–5). Usada na PRIMEIRA partida da temporada pra um jogador
 * sem linha ainda — evita começar do 1000 chapado (Imortal larga perto do topo).
 * null = sem rank público → cai pro STARTING_MMR no caller.
 */
export function seedMmrFromRankTier(rankTier: number | null | undefined): number | null {
  if (rankTier == null || rankTier <= 0) return null;
  const medal = Math.floor(rankTier / 10);
  const stars = rankTier % 10;
  // MMR "cru" da medalha (meio da estrela na banda; Imortal = piso 5620).
  const raw =
    medal >= 8
      ? 5620
      : (() => {
          const band = TIER_BANDS.find((b) => b.tier === medal);
          if (!band) return null;
          return (
            band.min +
            Math.max(0, Math.min(5, stars) - 1) * band.starStep +
            Math.round(band.starStep / 2)
          );
        })();
  if (raw == null) return null;
  // DESCONTO PROGRESSIVO de entrada (anti-boosted): entra abaixo da medalha e sobe
  // provando. Corte maior no topo (onde o boosting concentra). Ver SEED_RETENTION.
  const retention = SEED_RETENTION[Math.max(1, Math.min(8, medal))] ?? 1;
  return Math.round(raw * retention);
}
