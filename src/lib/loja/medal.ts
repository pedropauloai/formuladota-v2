// Medalha do Dota com estrelas a partir do MMR, para a calculadora do boost mostrar onde a pessoa
// está e aonde chega. Faixas iguais às de mmrToDotaRank (src/lib/dota/rank-badges.ts), com as
// 5 estrelas dividindo cada medalha em partes iguais; arquivos em /public/icons/dota-ranks/.

const BANDS: Array<{ rank: string; from: number; to: number }> = [
  { rank: "herald", from: 0, to: 770 },
  { rank: "guardian", from: 770, to: 1540 },
  { rank: "crusader", from: 1540, to: 2310 },
  { rank: "archon", from: 2310, to: 3080 },
  { rank: "legend", from: 3080, to: 3850 },
  { rank: "ancient", from: 3850, to: 4620 },
  { rank: "divine", from: 4620, to: 5620 },
];

export interface MmrMedal {
  /** Medalha sem estrela, a mesma chave de i18n de ranks.dota.<rank>. */
  rank: string;
  /** 1 a 5; 0 no Imortal, que não tem estrela. */
  stars: number;
  /** Nome do arquivo em /public/icons/dota-ranks/, sem extensão. */
  image: string;
}

export function medalForMmr(mmr: number): MmrMedal {
  const band = BANDS.find((b) => mmr < b.to);
  if (!band) return { rank: "immortal", stars: 0, image: "immortal" };
  const step = (band.to - band.from) / 5;
  const stars = Math.min(5, Math.floor((Math.max(mmr, band.from) - band.from) / step) + 1);
  return { rank: band.rank, stars, image: `${band.rank}-${stars}` };
}
