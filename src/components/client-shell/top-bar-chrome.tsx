// Peças visuais do topbar no molde do cliente do Dota 2: placa do logo que desce abaixo da
// barra e placas chanfradas para abas, ícones e chamadas. Só forma; a regra fica no top-bar.

import Image from "next/image";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import styles from "./top-bar.module.css";

export const topBarSkin = styles.bar;
/** Grupo da direita: a última placa encosta na borda da tela. */
export const topBarEndcap = styles.endcap;
/** Menu principal: a primeira aba encaixa no ombro do logo. */
export const topBarNavMain = styles.navMain ?? "";

type PlateKind = "tab" | "icon" | "cta";
type PlateTone = "neutral" | "gold" | "brand";

export function plateClass(kind: PlateKind, tone: PlateTone = "neutral"): string {
  return cn(
    styles.plate,
    kind === "tab" && styles.tab,
    kind === "icon" && styles.icon,
    tone === "gold" && styles.gold,
    tone === "brand" && styles.brand,
  );
}

export function LogoPlate({ label, href = "/dashboard" }: { label: string; href?: string }) {
  return (
    <Link href={href} aria-label={label} className={styles.logo}>
      <span aria-hidden="true" className={styles.logoFrame} />
      <span aria-hidden="true" className={styles.logoFace}>
        <span className={styles.logoEmber} />
      </span>
      <Image
        src="/brand/logo-horizontal-white.png"
        alt=""
        width={1933}
        height={400}
        priority
        className={cn(styles.logoImage, "h-7 w-auto xl:h-8 2xl:h-9")}
      />
      <span aria-hidden="true" className={styles.sparks}>
        <span className={styles.spark} />
        <span className={styles.spark} />
        <span className={styles.spark} />
      </span>
    </Link>
  );
}

// A aba roda no navegador para tocar o som de troca de aba (plate-tab.tsx).
export { PlateTab } from "./plate-tab";

export function PlateIconLink({
  href,
  label,
  icon: Icon,
  tone = "neutral",
  children,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  tone?: PlateTone;
  /** Selo sobreposto ao ícone (ex.: contador de novidades). */
  children?: ReactNode;
}) {
  return (
    <Link href={href} aria-label={label} className={plateClass("icon", tone)}>
      <Icon size={16} aria-hidden="true" />
      {children}
    </Link>
  );
}
