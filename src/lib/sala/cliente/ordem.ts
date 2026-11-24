// Ordem da plateia: quem levantou a mão vem antes, na ordem em que levantou; depois, quem não levantou.
// Compara os horários como texto (ISO, mesmo formato), sem comparação de idioma, que põe símbolo antes de número.

export function porMao(a: { maoDesde: string | null }, b: { maoDesde: string | null }): number {
  if (a.maoDesde && b.maoDesde) return a.maoDesde < b.maoDesde ? -1 : a.maoDesde > b.maoDesde ? 1 : 0;
  if (a.maoDesde) return -1;
  if (b.maoDesde) return 1;
  return 0;
}
