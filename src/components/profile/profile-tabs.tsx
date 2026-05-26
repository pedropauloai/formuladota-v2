// Tab bar do /me — controlada por searchParams (D-10 + RESEARCH Padrão 3).
// SSR-friendly: sem useState, sem onClick — apenas <Link> com query string.
// WCAG 2.1 AA: role="tablist" + role="tab" + aria-selected (C5).
// Server Component — sem interatividade, sem "use client".

import Link from "next/link";

export type ProfileTab = "perfil" | "historico" | "conquistas" | "conduta";

export const VALID_TABS: ProfileTab[] = [
  "perfil",
  "historico",
  "conquistas",
  "conduta",
];

// Labels PT-BR exatos da UI-SPEC — Dota 2 client style uppercase
const TAB_LABELS: Record<ProfileTab, string> = {
  perfil: "Perfil",
  historico: "Histórico",
  conquistas: "Conquistas",
  conduta: "Conduta",
};

interface Props {
  activeTab: ProfileTab;
}

export function ProfileTabs({ activeTab }: Props) {
  return (
    <nav
      role="tablist"
      aria-label="Seções do perfil"
      className="flex items-end gap-6 border-b border-border-subtle"
    >
      {VALID_TABS.map((tab) => {
        const isActive = activeTab === tab;
        return (
          <Link
            key={tab}
            // Tab "perfil" usa URL limpa /me (sem query param) — default (D-10)
            href={tab === "perfil" ? "/me" : `/me?tab=${tab}`}
            role="tab"
            aria-selected={isActive}
            className={`
              font-display text-[13px] font-bold uppercase tracking-[0.08em] pb-2 -mb-px transition-colors
              ${
                isActive
                  ? "text-text-display border-b-2 border-brand-primary"
                  : "text-text-muted hover:text-text-body border-b-2 border-transparent"
              }
            `}
          >
            {TAB_LABELS[tab]}
          </Link>
        );
      })}
    </nav>
  );
}
