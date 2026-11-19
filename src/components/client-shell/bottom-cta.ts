// Que botão verde a barra inferior mostra. Regra pura, para o teste provar a troca pelas flags.

export type BottomCta = "na_fila" | "jogar_com_o_pedro" | "jogar_dota";

export interface BottomCtaInput {
  /** Está numa fila de PRO (o estado da pessoa vem antes de tudo). */
  inQueue: boolean;
  /** Flag fila_competitiva desligada: sem o bot da Steam, a busca e as salas estão pausadas. */
  queuePaused: boolean;
  /** Flag loja: a fila da party mora na loja. */
  showLoja: boolean;
}

export function bottomCta({ inQueue, queuePaused, showLoja }: BottomCtaInput): BottomCta {
  if (inQueue) return "na_fila";
  // Busca pausada e loja aberta: o maior botão do site leva para a fila da party do Pedro.
  if (queuePaused && showLoja) return "jogar_com_o_pedro";
  return "jogar_dota";
}
