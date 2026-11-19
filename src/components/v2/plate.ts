// Classes das placas do design 2.0. Classe (e não componente) para servir em Link, <a> e
// <button> sem embrulho, como o plateClass da barra superior. Só forma; o texto vem de quem usa.

import { cn } from "@/lib/utils";
import styles from "./v2.module.css";

export type PlateKind = "cta" | "brand" | "ghost" | "tag" | "tab";
export type TagTone = "neutral" | "live" | "gold";

export interface PlateOptions {
  /** cta: verde (comprar, entrar); brand: vermelha; ghost: metal; tag: etiqueta; tab: aba de filtro. */
  kind: PlateKind;
  /** Cor da etiqueta: neutra, ao vivo (vermelha) ou destaque (dourada). */
  tone?: TagTone;
  /** Chamada grande da primeira dobra (a partir de 768 px). */
  large?: boolean;
  /** Chamada discreta menor (dentro de cartão e linha). */
  small?: boolean;
  /** Ocupa a largura toda. */
  block?: boolean;
}

export function plate({ kind, tone = "neutral", large, small, block }: PlateOptions): string {
  return cn(
    styles.plate,
    kind === "cta" && styles.cta,
    kind === "brand" && cn(styles.cta, styles.brand),
    kind === "ghost" && styles.ghost,
    kind === "tag" && styles.tag,
    kind === "tag" && tone === "live" && styles.tagLive,
    kind === "tag" && tone === "gold" && styles.tagGold,
    kind === "tab" && styles.tab,
    large && styles.large,
    small && styles.small,
    block && styles.block,
  );
}

export type PanelTone = "neutral" | "gold" | "live" | "shine";
export type PanelLift = "none" | "dark" | "gold";

/** Painel de canto chanfrado. O corte vem da variável --cut (12 px se não mudar). */
export function panel(tone: PanelTone = "neutral"): string {
  return cn(
    styles.panel,
    tone === "gold" && styles.panelGold,
    tone === "live" && styles.panelLive,
    tone === "shine" && styles.panelShine,
  );
}

/** Sombra do painel: fica no invólucro, porque o recorte do painel corta a própria sombra. */
export function lift(kind: PanelLift = "dark"): string {
  if (kind === "none") return "";
  return (kind === "gold" ? styles.liftGold : styles.liftDark) ?? "";
}

/** Envolve a página: em tela de 1440 de altura tudo cresce na proporção, como no cliente. */
export const v2Page: string = styles.page ?? "";
