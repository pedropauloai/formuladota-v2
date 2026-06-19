// Tab Histórico — V1 stub: EmptyState até schema de matches por user consolidar.
// V2: integrar MatchCard (src/components/patterns/match-card.tsx) quando query real existir.
//
// Decisão plan 09-07: stub aceitável — não inventar dados fictícios.
// EmptyState é a forma honesta de comunicar ausência de dados reais.
// Server Component — sem interatividade, sem "use client".

import { EmptyState } from "@/components/ui/empty-state";
import { useTranslations } from "next-intl";

export function TabHistorico() {
  // V1: schema de matches por user ainda em flux (post-Phase 8).
  // MatchCard não importado intencionalmente — sem dados reais para alimentar.
  const t = useTranslations("perfil");
  return (
    <div className="pt-6">
      <EmptyState
        title={t("historicoEmptyTitle")}
        description={t("historicoEmptyDesc")}
      />
    </div>
  );
}
