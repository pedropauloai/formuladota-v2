// Tab Conquistas — V1 stub: EmptyState até RPC get_user_achievements existir.
// V2: integrar grid 5 cols AchievementBadge quando schema de achievements consolidar.
//
// Decisão plan 09-07: stub aceitável — não inventar dados fictícios.
// AchievementBadge não importado intencionalmente — sem dados reais para alimentar.
// Server Component — sem interatividade, sem "use client".

import { EmptyState } from "@/components/ui/empty-state";
import { useTranslations } from "next-intl";

export function TabConquistas() {
  const t = useTranslations("perfil");
  return (
    <div className="pt-6">
      <EmptyState
        title={t("conquistasEmptyTitle")}
        description={t("conquistasEmptyDesc")}
      />
    </div>
  );
}
