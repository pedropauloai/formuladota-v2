// WidgetMedals — DotaRank + HonorRank lado a lado dentro do dashboard.
// Server Component — sem interatividade.

import { useTranslations } from "next-intl";
import { DotaRankMedal, type DotaRank } from "@/components/ui/dota-rank-medal";
import { HonorRankMedal, type HonorRank } from "@/components/ui/honor-rank-medal";
import { WidgetShell } from "./widget-shell";

interface Props {
  dotaRank: DotaRank;
  honorRank: HonorRank;
  ranqueado: boolean;
  editing: boolean;
}

export function WidgetMedals({ dotaRank, honorRank, ranqueado, editing }: Props) {
  const t = useTranslations("perfil");
  return (
    <WidgetShell title={t("widgetMedalsTitle")} editing={editing}>
      <div className="flex items-center justify-center gap-4 h-full flex-wrap">
        <DotaRankMedal
          rank={dotaRank}
          size="md"
          showLabel
          glow={dotaRank === "immortal" || dotaRank === "immortal-top-100"}
          calibrationStatus={ranqueado ? "ranqueado" : "visitante"}
        />
        <HonorRankMedal
          rank={honorRank}
          size="md"
          showLabel
          calibrationStatus={ranqueado ? "ranqueado" : "visitante"}
        />
      </div>
    </WidgetShell>
  );
}
