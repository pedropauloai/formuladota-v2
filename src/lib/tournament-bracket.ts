// Gerador de chave single-elimination — PURO (sem DB, testável).
// Usado por generateBracket (admin) pra semear os times nos matches do round 1.
// Byes (quando nº de times não é potência de 2) são resolvidos no round 1 como
// walkover e o vencedor já é propagado pro round 2. Rounds seguintes nascem
// vazios (TBD) e são preenchidos conforme os placares são reportados.

export interface BracketSlot {
  round: number; // 1-indexed
  bracketPosition: number; // 0-indexed dentro do round
  teamAId: string | null;
  teamBId: string | null;
  /** Definido já na geração só em walkover (bye). */
  winnerTeamId: string | null;
  isWalkover: boolean;
}

/** Menor potência de 2 ≥ n (mínimo 2). */
export function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return Math.max(2, p);
}

/**
 * Ordem de seeds padrão (1 e 2 só se cruzam na final, byes vão pros melhores
 * seeds). Recursivo: a cada round dobra espelhando (s, len-s).
 */
export function standardSeedOrder(size: number): number[] {
  let seeds = [1, 2];
  while (seeds.length < size) {
    const len = seeds.length * 2 + 1;
    const next: number[] = [];
    for (const s of seeds) {
      next.push(s);
      next.push(len - s);
    }
    seeds = next;
  }
  return seeds;
}

/**
 * Gera TODOS os matches do bracket a partir dos teamIds em ordem de seed
 * (índice 0 = seed 1). Pré-condição garantida pela próxima-potência-de-2:
 * teamCount > size/2, logo cada match do round 1 tem no MÁXIMO um bye.
 */
export function generateSingleElimBracket(seededTeamIds: string[]): BracketSlot[] {
  const teamCount = seededTeamIds.length;
  const size = nextPow2(teamCount);
  const rounds = Math.log2(size);
  const order = standardSeedOrder(size);
  const teamForSeed = (seed: number): string | null =>
    seed <= teamCount ? seededTeamIds[seed - 1]! : null;

  const slots: BracketSlot[] = [];

  // Round 1 — resolve byes (walkover) e guarda os vencedores pra propagar.
  let prevWinners: (string | null)[] = [];
  for (let pos = 0; pos < size / 2; pos++) {
    const teamAId = teamForSeed(order[pos * 2]!);
    const teamBId = teamForSeed(order[pos * 2 + 1]!);
    const isWalkover = teamAId === null || teamBId === null;
    const winnerTeamId = isWalkover ? teamAId ?? teamBId : null;
    slots.push({ round: 1, bracketPosition: pos, teamAId, teamBId, winnerTeamId, isWalkover });
    prevWinners.push(winnerTeamId);
  }

  // Rounds 2..N — vazios, mas recebem vencedores de walkover do round anterior.
  for (let r = 2; r <= rounds; r++) {
    const count = size / 2 ** r;
    const winners: (string | null)[] = [];
    for (let pos = 0; pos < count; pos++) {
      slots.push({
        round: r,
        bracketPosition: pos,
        teamAId: prevWinners[pos * 2] ?? null,
        teamBId: prevWinners[pos * 2 + 1] ?? null,
        winnerTeamId: null,
        isWalkover: false,
      });
      winners.push(null);
    }
    prevWinners = winners;
  }

  return slots;
}
