// Prévia local da vitrine com a flag "loja" desligada no banco (que é o de produção): só no
// `next dev` com LOJA_PREVIA_LOCAL=1. O build de produção roda com NODE_ENV=production, então a
// flag segue autoritativa no ar. A compra continua exigindo a flag ligada.

export function lojaPreviaLocal(): boolean {
  return process.env.NODE_ENV === "development" && process.env.LOJA_PREVIA_LOCAL === "1";
}
