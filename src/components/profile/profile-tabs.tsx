// Tab bar do /me — controlada por searchParams (D-10 + RESEARCH Padrão 3).
// SSR-friendly: sem useState, sem onClick — apenas <Link> com query string.
// WCAG 2.1 AA: role="tablist" + role="tab" + aria-selected (C5).
// Server Component — sem interatividade, sem "use client".
//
// VISUAL (Pedro 2026-05-26):
//   - SEM underline na tab ativa (cor brand vermelho indica)
//   - Separadores "/" entre as tabs
//   - Miniatura avatar 1:1 ao lado de "Perfil" (primeira tab)

import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";

export type ProfileTab =
  | "perfil"
  | "historico"
  | "conquistas"
  | "conduta"
  | "progresso";

export const VALID_TABS: ProfileTab[] = [
  "perfil",
  "historico",
  "conquistas",
  "conduta",
  "progresso",
];

// Mapa tab → chave i18n — resolvido no render via t() (Dota 2 client style uppercase)
const TAB_LABEL_KEYS: Record<ProfileTab, string> = {
  perfil: "tabPerfil",
  historico: "tabHistorico",
  conquistas: "tabConquistas",
  conduta: "tabConduta",
  progresso: "tabProgresso",
};

interface Props {
  activeTab: ProfileTab;
  /** Avatar URL — exibido como miniatura 1:1 ao lado de "Perfil" */
  avatarUrl?: string | null;
  /** Base das rotas das abas. @default "/me" (perfil próprio). Perfil público
   *  de outro user passa "/perfil/u/[id]" — navegação coerente. */
  basePath?: string;
  /** Abas a exibir. @default VALID_TABS. Perfil público omite as self-only. */
  tabs?: ProfileTab[];
}

export function ProfileTabs({
  activeTab,
  avatarUrl,
  basePath = "/me",
  tabs = VALID_TABS,
}: Props) {
  const t = useTranslations("perfil");
  return (
    <nav
      role="tablist"
      aria-label={t("tabsNavLabel")}
      className="flex items-center gap-3"
    >
      {tabs.map((tab, index) => {
        const isActive = activeTab === tab;
        const isFirst = index === 0;
        return (
          <span key={tab} className="flex items-center gap-3">
            {/* Separador "/" entre tabs (não antes da primeira) */}
            {!isFirst && (
              <span
                className="font-display text-[13px] font-bold text-text-faded select-none"
                aria-hidden="true"
              >
                /
              </span>
            )}
            <Link
              // Tab "perfil" usa a URL base limpa (sem query param) — default (D-10)
              href={tab === "perfil" ? basePath : `${basePath}?tab=${tab}`}
              role="tab"
              aria-selected={isActive}
              className={`
                flex items-center gap-2 font-display text-[13px] font-bold uppercase tracking-[0.08em] transition-colors
                ${
                  isActive
                    ? "text-brand-primary"
                    : "text-text-muted hover:text-text-body"
                }
              `}
            >
              {/* Miniatura 1:1 do avatar — só ao lado da primeira tab (Perfil) */}
              {isFirst && (
                <span
                  className="relative size-5 shrink-0 overflow-hidden rounded-sm border border-brand-primary/40"
                  aria-hidden="true"
                >
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt=""
                      fill
                      sizes="20px"
                      className="object-cover object-top"
                      unoptimized
                    />
                  ) : (
                    <span className="block size-full bg-bg-elevated" />
                  )}
                </span>
              )}
              {t(TAB_LABEL_KEYS[tab])}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}
