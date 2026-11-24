// Abas principais do topbar, em lógica pura para o teste provar a regra das flags: a Fila da party
// vem primeiro, com a Sala de voz ao lado (flag sala_voz), e Ranking, Times e Torneios só existem
// com a liga (flag fila_competitiva).

export type PrincipalTabKey =
  | "subirMmr"
  | "fila"
  | "sala"
  | "partidas"
  | "meta"
  | "loja"
  | "ranking"
  | "times"
  | "torneios";

export interface PrincipalTabDef {
  href: string;
  key: PrincipalTabKey;
}

const PRINCIPAL_TAB_DEFS: readonly PrincipalTabDef[] = [
  { href: "/ranked-com-pro", key: "subirMmr" },
  { href: "/party", key: "fila" },
  { href: "/sala", key: "sala" },
  { href: "/partidas", key: "partidas" },
  { href: "/meta", key: "meta" },
  { href: "/loja", key: "loja" },
  { href: "/ranking", key: "ranking" },
  { href: "/times", key: "times" },
  { href: "/torneios", key: "torneios" },
];

/** As abas que só existem com a liga ligada. */
export const LIGA_TABS: ReadonlySet<PrincipalTabKey> = new Set(["ranking", "times", "torneios"]);

export interface TopBarTabFlags {
  /** Flag ranked_com_pro: aba "Subir MMR". */
  showRankedComPro: boolean;
  /** Flag loja: abas "Fila" e "Loja" (sem a loja não há fila da party). */
  showLoja: boolean;
  /** Flag fila_competitiva (a liga): abas "Ranking", "Times" e "Torneios". */
  showLiga: boolean;
  /** Flag sala_voz: aba da sala de voz pública da live (/sala). */
  showSala: boolean;
}

// Flags autoritativas: desligada, a aba some para todos. Não existe parâmetro de admin de propósito.
export function principalTabDefs(flags: TopBarTabFlags): PrincipalTabDef[] {
  return PRINCIPAL_TAB_DEFS.filter((def) => {
    if (def.key === "subirMmr") return flags.showRankedComPro;
    if (def.key === "fila" || def.key === "loja") return flags.showLoja;
    if (def.key === "sala") return flags.showSala;
    if (LIGA_TABS.has(def.key)) return flags.showLiga;
    return true;
  });
}
