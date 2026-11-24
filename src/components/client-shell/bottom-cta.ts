// Que botão a barra inferior mostra. Regra pura, para o teste provar a escolha.
// Com a busca competitiva pausada e a loja aberta, o botão principal é o JOGAR COM O PPA, que
// leva à fila da party (PPA, 23/11/2026). Com a busca de volta, volta o JOGAR DOTA com o menu
// e o Buscar partida (PPA, 20/11/2026), e a party segue como modalidade dentro dele.

export type BottomCta = "na_fila" | "jogar_com_o_ppa" | "jogar_dota";

export interface BottomCtaInput {
  /** Está numa fila de PRO (o estado da pessoa vem antes de tudo). */
  inQueue: boolean;
  /** Flag fila_competitiva desligada: não há busca de partida para oferecer. */
  queuePaused: boolean;
  /** Flag loja: a fila da party existe. */
  showLoja: boolean;
}

export function bottomCta({ inQueue, queuePaused, showLoja }: BottomCtaInput): BottomCta {
  if (inQueue) return "na_fila";
  return queuePaused && showLoja ? "jogar_com_o_ppa" : "jogar_dota";
}
