// Abas principais do topbar. Lógica pura (sem React) para o teste provar a regra das flags.

export type PrincipalTabKey =
  | "subirMmr"
  | "meta"
  | "loja"
  | "ranking"
  | "partidas"
  | "times"
  | "torneios";

export interface PrincipalTabDef {
  href: string;
  key: PrincipalTabKey;
}

// LOJA logo depois da primeira aba fixa, na posição em que o cliente do Dota põe a dele.
const PRINCIPAL_TAB_DEFS: readonly PrincipalTabDef[] = [
  { href: "/ranked-com-pro", key: "subirMmr" },
  { href: "/meta", key: "meta" },
  { href: "/loja", key: "loja" },
  { href: "/ranking", key: "ranking" },
  { href: "/partidas", key: "partidas" },
  { href: "/times", key: "times" },
  { href: "/torneios", key: "torneios" },
];

export interface TopBarTabFlags {
  /** Flag ranked_com_pro: aba "Subir MMR". */
  showRankedComPro: boolean;
  /** Flag loja: aba "Loja". */
  showLoja: boolean;
}

// Flags autoritativas: desligada, a aba some para todos. Não existe parâmetro de admin de propósito.
export function principalTabDefs(flags: TopBarTabFlags): PrincipalTabDef[] {
  return PRINCIPAL_TAB_DEFS.filter((def) => {
    if (def.key === "subirMmr") return flags.showRankedComPro;
    if (def.key === "loja") return flags.showLoja;
    return true;
  });
}
