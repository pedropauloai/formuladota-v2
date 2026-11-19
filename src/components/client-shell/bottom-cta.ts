// Que botão verde a barra inferior mostra. Regra pura, para o teste provar a escolha.
// O "Jogar Dota" (com o menu e o Buscar partida) fica sempre no lugar, mesmo com a busca
// pausada: a party do PPA entra como modalidade dentro do menu (Pedro, 20/11/2026).

export type BottomCta = "na_fila" | "jogar_dota";

export interface BottomCtaInput {
  /** Está numa fila de PRO (o estado da pessoa vem antes de tudo). */
  inQueue: boolean;
}

export function bottomCta({ inQueue }: BottomCtaInput): BottomCta {
  return inQueue ? "na_fila" : "jogar_dota";
}
