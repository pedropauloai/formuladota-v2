// Tab Histórico — V1 stub: EmptyState até schema de matches por user consolidar.
// V2: integrar MatchCard (src/components/patterns/match-card.tsx) quando query real existir.
//
// Decisão plan 09-07: stub aceitável — não inventar dados fictícios.
// EmptyState é a forma honesta de comunicar ausência de dados reais.
// Server Component — sem interatividade, sem "use client".

import { EmptyState } from "@/components/ui/empty-state";

export function TabHistorico() {
  // V1: schema de matches por user ainda em flux (post-Phase 8).
  // MatchCard não importado intencionalmente — sem dados reais para alimentar.
  return (
    <div className="pt-6">
      <EmptyState
        title="Nenhuma partida ainda."
        description="Suas partidas com o coach aparecerão aqui após a primeira sessão."
      />
    </div>
  );
}
