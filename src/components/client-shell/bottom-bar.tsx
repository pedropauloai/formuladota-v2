// Bottom bar — botão grande flutuante (estilo client Dota 2 "JOGAR DOTA").
// MVP: comportamento condicional baseado em ficha balance + admin.
// PlayPanel não usado — link direto pras ações relevantes.

import Link from "next/link";
import { Play, Coins, Radio } from "lucide-react";

interface Props {
  isAdmin: boolean;
  fichaBalance: number;
  fichaPackageId: string | null;
}

export function DashboardBottomBar({
  isAdmin,
  fichaBalance,
  fichaPackageId,
}: Props) {
  const cta = computeCta({ isAdmin, fichaBalance, fichaPackageId });

  return (
    <div className="relative z-20 flex h-20 shrink-0 items-center justify-end px-4 xl:h-24 xl:px-6 2xl:h-28 2xl:px-8 pointer-events-none">
      <Link
        href={cta.href}
        className={`pointer-events-auto group relative flex h-14 items-center gap-3 overflow-hidden rounded-md border-2 px-8 font-display text-lg font-bold uppercase tracking-[0.25em] text-white shadow-lg transition-all hover:scale-[1.02] xl:h-16 xl:px-12 xl:text-xl 2xl:h-20 2xl:px-16 2xl:text-2xl 2xl:tracking-[0.3em] ${cta.classes}`}
      >
        <cta.Icon size={22} fill={cta.iconFilled ? "currentColor" : "none"} aria-hidden="true" />
        <span>{cta.label}</span>
        <span
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
          aria-hidden="true"
        />
      </Link>
    </div>
  );
}

interface CtaShape {
  href: string;
  label: string;
  Icon: typeof Play;
  iconFilled?: boolean;
  classes: string;
}

function computeCta({
  isAdmin,
  fichaBalance,
  fichaPackageId,
}: {
  isAdmin: boolean;
  fichaBalance: number;
  fichaPackageId: string | null;
}): CtaShape {
  // Admin (você Pedro / outros PROs): atalho pro painel de fila
  if (isAdmin) {
    return {
      href: "/admin/pros",
      label: "Painel PROs",
      Icon: Radio,
      classes:
        "border-[var(--color-play-green)] bg-gradient-to-b from-[var(--color-play-green)] to-[var(--color-play-green-dark)] shadow-[var(--color-play-green)]/40 hover:shadow-[var(--color-play-green)]/60",
    };
  }
  // Cliente com saldo: entra no jogo (vê PROs online no dashboard)
  if (fichaBalance > 0) {
    return {
      href: "/dashboard",
      label: "Jogar Dota",
      Icon: Play,
      iconFilled: true,
      classes:
        "border-[var(--color-play-green)] bg-gradient-to-b from-[var(--color-play-green)] to-[var(--color-play-green-dark)] shadow-[var(--color-play-green)]/40 hover:shadow-[var(--color-play-green)]/60",
    };
  }
  // Cliente sem saldo: precisa comprar ficha primeiro
  return {
    href: fichaPackageId ? `/checkout/${fichaPackageId}` : "/codigo-de-conduta",
    label: "Comprar Ficha",
    Icon: Coins,
    classes:
      "border-amber-400 bg-gradient-to-b from-amber-300 to-amber-500 text-black shadow-amber-500/40 hover:shadow-amber-400/60",
  };
}
