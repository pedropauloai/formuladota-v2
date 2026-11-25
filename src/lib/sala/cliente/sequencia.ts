// Mensagens seguidas da mesma pessoa formam uma sequência, como no Discord: a foto e o nome aparecem só
// na primeira, e uma pausa de mais de 5 minutos começa outra.

const SEQUENCIA_MS = 5 * 60_000;

type Linha = { userId: string | null; em: string };

export function comecaSequencia(anterior: Linha | undefined, atual: Linha): boolean {
  if (!anterior || anterior.userId !== atual.userId) return true;
  return new Date(atual.em).getTime() - new Date(anterior.em).getTime() > SEQUENCIA_MS;
}
